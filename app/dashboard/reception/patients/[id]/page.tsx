'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2,
  Droplets,
  AlertTriangle,
  Scale,
  Calendar
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { deletePatient } from '@/lib/firebase/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [patient, setPatient] = useState<any>(null);

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
      const patientDoc = await getDoc(doc(db, 'patients', params.id));
      
      if (!patientDoc.exists()) {
        toast.error('Patient not found');
        return;
      }
      
      const data = patientDoc.data();
      const patientData = {
        id: patientDoc.id,
        ...data,
        // Convert Firestore Timestamp to JS Date
        dateOfBirth: data.dateOfBirth?.toDate() || null,
        // Calculate age dynamically
        age: data.dateOfBirth ? differenceInYears(new Date(), data.dateOfBirth.toDate()) : null
      };
      
      setPatient(patientData);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    try {
      setIsDeleting(true);
      await deletePatient(params.id);
      toast.success('Patient deleted successfully');
      router.push('/dashboard/reception/patients');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto pt-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Patient Not Found</h1>
        <p className="mb-6">The patient you are looking for does not exist or may have been removed.</p>
        <Link href="/dashboard/reception/patients">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Patients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/reception/patients" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to All Patients
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-3xl font-bold">{patient.name || 'Patient'}</h1>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            <Link href={`/dashboard/reception/patients/${patient.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Patient
              </Button>
            </Link>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    Delete Patient
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the patient
                    record and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleDeletePatient}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>Basic details and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Full Name</div>
                  <div>{patient.name}</div>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Date of Birth</div>
                  <div>
                    {patient.dateOfBirth ? (
                      <>
                        {format(patient.dateOfBirth, 'MMMM d, yyyy')}
                        <span className="ml-2 text-sm text-gray-500">
                          ({patient.age} years old)
                        </span>
                      </>
                    ) : (
                      'Not recorded'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Phone Number</div>
                  <div>{patient.phone}</div>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Email Address</div>
                  <div>{patient.email || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Address</div>
                  <div>{patient.address}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <Scale className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Body Weight</div>
                  <div>{patient.bodyWeight ? `${patient.bodyWeight} kg` : 'Not recorded'}</div>
                </div>
              </div>

              <div className="flex items-center">
                <Droplets className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Blood Group</div>
                  <div>{patient.bloodGroup || 'Not recorded'}</div>
                </div>
              </div>

              {patient.guardian && (
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">Guardian</div>
                    <div>{patient.guardian}</div>
                  </div>
                </div>
              )}

              {patient.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Additional Notes</div>
                  <div className="p-3 bg-gray-50 rounded-md">{patient.notes}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 