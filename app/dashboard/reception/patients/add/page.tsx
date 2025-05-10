'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';

const patientSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    age: z.number().min(0, 'Age is required'),
    gender: z.enum(['Male', 'Female', 'Other']),
    phone: z.string().min(10, 'Phone is required'),
    email: z.string().email('Invalid email'),
    address: z.string().min(2, 'Address is required'),
    guardian: z.string().optional(),
    bloodGroup: z.string().optional(),
    notes: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function AddPatientPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/auth/signin');
                return;
            }

            try {
                const role = await getUserRole(user.uid);
                if (role !== 'reception') {
                    toast.error('You do not have access to this page');
                    router.push('/auth/role-selection');
                }
            } catch (error) {
                console.error('Error verifying role:', error);
                toast.error('Error verifying permissions');
                router.push('/auth/role-selection');
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            name: '',
            age: 0,
            gender: 'Male',
            phone: '',
            email: '',
            address: '',
            guardian: '',
            bloodGroup: '',
            notes: '',
        },
    });

    const onSubmit = async (data: PatientFormValues) => {
        try {
            console.log('🔵 [Auth Check] Starting patient creation process...');
            if (!auth.currentUser) {
                console.log('❌ [Auth Error] No authenticated user found');
                toast.error('You must be logged in to add a patient');
                router.push('/auth/signin');
                return;
            }

            const currentUser = auth.currentUser;
            console.log('✅ [Auth Success] User authenticated:', currentUser.uid);
            
            // Get user document directly
            console.log('🔵 [Role Check] Verifying user role...');
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (!userDoc.exists()) {
                console.log('❌ [Role Error] User document not found');
                toast.error('User profile not found. Please sign out and sign in again.');
                return;
            }

            const userData = userDoc.data();
            console.log('✅ [Role Success] User role verified:', userData.role);
            
            if (userData.role !== 'reception') {
                console.log('❌ [Permission Error] Invalid role:', userData.role);
                toast.error('You do not have permission to add patients');
                return;
            }

            console.log('🔵 [Validation] Validating patient data...');
            const age = Number(data.age);
            if (isNaN(age) || age < 0) {
                console.log('❌ [Validation Error] Invalid age value');
                toast.error('Please enter a valid age.');
                return;
            }

            if (!data.name || !data.phone || !data.email || !data.address) {
                console.log('❌ [Validation Error] Missing required fields');
                toast.error('Please fill all required fields.');
                return;
            }
            console.log('✅ [Validation Success] All patient data validated');

            // Create a simpler patient document
            const patientData = {
                name: data.name,
                age: age,
                gender: data.gender,
                phone: data.phone,
                email: data.email,
                address: data.address,
                guardian: data.guardian || '',
                bloodGroup: data.bloodGroup || '',
                notes: data.notes || '',
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid
            };

            console.log('🔵 [Firestore] Attempting to create patient document...', patientData);

            // Use addDoc instead of setDoc
            const patientsRef = collection(db, 'patients');
            const docRef = await addDoc(patientsRef, patientData);
            
            console.log('✅ [Firestore Success] Patient document created with ID:', docRef.id);

            // Try to send welcome email
            console.log('🔵 [Email] Attempting to send welcome email...');
            try {
                const emailResponse = await fetch('/api/send-patient-welcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: data.email,
                        name: data.name,
                        patientId: docRef.id,
                    }),
                });
                
                if (!emailResponse.ok) {
                    const errorData = await emailResponse.json();
                    console.log('❌ [Email Error] Failed to send welcome email. Status:', emailResponse.status, 'Error:', errorData);
                } else {
                    console.log('✅ [Email Success] Welcome email sent successfully');
                }
            } catch (emailError) {
                console.log('❌ [Email Error] Exception while sending welcome email:', emailError);
                // Continue anyway since patient was created
            }

            console.log('✅ [Process Complete] Patient creation process finished successfully');
            toast.success('Patient added successfully!');
            router.push('/dashboard/reception');
        } catch (error) {
            console.log('❌ [Fatal Error] Unexpected error during patient creation:', error);
            console.error('Error adding patient:', error);
            toast.error('Failed to add patient. Please try again.');
        }
    };

    return (
        <>
            {!isLoading && (
                <div className="container mx-auto max-w-2xl py-10">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h1 className="text-3xl font-bold mb-2 text-primary">Add New Patient</h1>
                        <p className="text-gray-600 mb-6">
                            Please fill in the patient's details below. All fields marked with <span className="text-red-500">*</span> are required.
                        </p>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input {...form.register('name')} placeholder="Enter full name" />
                                    {form.formState.errors.name && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Age <span className="text-red-500">*</span>
                                    </label>
                                    <Input type="number" {...form.register('age', { valueAsNumber: true })} placeholder="Enter age" min={0} />
                                    {form.formState.errors.age && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.age.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select {...form.register('gender')} className="w-full border rounded px-3 py-2 focus:outline-primary">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {form.formState.errors.gender && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.gender.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Phone <span className="text-red-500">*</span>
                                    </label>
                                    <Input {...form.register('phone')} placeholder="Enter phone number" />
                                    {form.formState.errors.phone && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <Input {...form.register('email')} placeholder="Enter email" />
                                    {form.formState.errors.email && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">
                                        Address <span className="text-red-500">*</span>
                                    </label>
                                    <Input {...form.register('address')} placeholder="Enter address" />
                                    {form.formState.errors.address && (
                                        <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">Guardian Name</label>
                                    <Input {...form.register('guardian')} placeholder="Enter guardian name (if any)" />
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">Blood Group</label>
                                    <Input {...form.register('bloodGroup')} placeholder="e.g. A+, O-, etc." />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">Additional Notes</label>
                                <textarea
                                    {...form.register('notes')}
                                    className="w-full border rounded px-3 py-2 min-h-[80px] focus:outline-primary"
                                    placeholder="Any additional information..."
                                />
                            </div>
                            <Button type="submit" className="w-full mt-4 text-lg py-6">
                                Add Patient
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
