'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { getPatient, updatePatient } from '@/lib/firebase/patients';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function EditPatientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);

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
        } else {
          // Fetch patient data
          await fetchPatient();
        }
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error verifying permissions');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, params.id]);

  const fetchPatient = async () => {
    try {
      setIsLoading(true);
      const patientData = await getPatient(params.id);
      
      if (!patientData) {
        toast.error('Patient not found');
        router.push('/dashboard/reception/patients');
        return;
      }
      
      setPatient(patientData);
      
      // Get patient gender and ensure it's one of the allowed values
      const patientGender = patientData.gender || 'Male';
      const validGender = (patientGender === 'Male' || patientGender === 'Female' || patientGender === 'Other') 
        ? patientGender as 'Male' | 'Female' | 'Other'
        : 'Male' as const;
      
      // Reset form with patient data
      form.reset({
        name: patientData.name || patientData.fullName || '',
        age: patientData.age || 0,
        gender: validGender,
        phone: patientData.phone || '',
        email: patientData.email || '',
        address: patientData.address || '',
        guardian: patientData.guardian || '',
        bloodGroup: patientData.bloodGroup || '',
        notes: patientData.notes || '',
      });
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    try {
      setIsSaving(true);
      
      if (!auth.currentUser) {
        toast.error('You must be logged in to update a patient');
        router.push('/auth/signin');
        return;
      }
      
      // Validate data
      const age = Number(data.age);
      if (isNaN(age) || age < 0) {
        toast.error('Please enter a valid age.');
        return;
      }

      if (!data.name || !data.phone || !data.email || !data.address) {
        toast.error('Please fill all required fields.');
        return;
      }
      
      // Ensure gender is one of the allowed values
      const validGender = data.gender;
      
      // Create update data object
      const patientData = {
        name: data.name,
        age: age,
        gender: validGender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        guardian: data.guardian || '',
        bloodGroup: data.bloodGroup || '',
        notes: data.notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.uid
      };
      
      // Update patient
      await updatePatient(params.id, patientData);
      
      toast.success('Patient updated successfully!');
      router.push(`/dashboard/reception/patients/${params.id}`);
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Failed to update patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Watch for form value changes to synchronize select components
  useEffect(() => {
    if (patient) {
      const subscription = form.watch((value) => {
        // This runs when any form value changes
        // We don't need to do anything, but this ensures Select components are updated
      });
      
      return () => subscription.unsubscribe();
    }
  }, [form, patient]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Link href={`/dashboard/reception/patients/${params.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Patient Details
      </Link>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-primary">Edit Patient</h1>
        <p className="text-gray-600 mb-6">
          Update the patient's details below. All fields marked with <span className="text-red-500">*</span> are required.
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
              <Select 
                onValueChange={(value) => {
                  if (value === 'Male' || value === 'Female' || value === 'Other') {
                    form.setValue('gender', value);
                  }
                }} 
                defaultValue={form.getValues('gender')}
                value={form.getValues('gender')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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
                Blood Group
              </label>
              <Select onValueChange={(value) => form.setValue('bloodGroup', value)} defaultValue={form.getValues('bloodGroup') || ''}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not specified</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block mb-1 font-medium">Guardian Name</label>
              <Input {...form.register('guardian')} placeholder="Enter guardian name (if any)" />
            </div>
          </div>
          
          <div>
            <label className="block mb-1 font-medium">
              Address <span className="text-red-500">*</span>
            </label>
            <Textarea {...form.register('address')} placeholder="Enter address" className="min-h-[80px]" />
            {form.formState.errors.address && (
              <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium">Medical Notes</label>
            <Textarea {...form.register('notes')} placeholder="Enter any medical notes" className="min-h-[100px]" />
          </div>
          
          <div className="flex gap-3 justify-end">
            <Link href={`/dashboard/reception/patients/${params.id}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="mr-2">Saving...</span>
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 