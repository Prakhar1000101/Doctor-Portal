'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CalendarClock,
  Edit, 
  Trash2, 
  Droplets,
  AlertTriangle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAppointmentsByPatient } from '@/lib/firebase/appointments';
import { deletePatient } from '@/lib/firebase/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
  const [appointments, setAppointments] = useState<any[]>([]);

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
      
      // Get patient directly from Firestore
      const patientDoc = await getDoc(doc(db, 'patients', params.id));
      
      if (!patientDoc.exists()) {
        toast.error('Patient not found');
        return;
      }
      
      const patientData = {
        id: patientDoc.id,
        ...patientDoc.data()
      };
      
      console.log('Fetched patient details:', patientData);
      setPatient(patientData);
      
      // Fetch patient's appointments separately to isolate potential issues
      try {
        console.log('Attempting to fetch appointments for patient ID:', params.id);
        const patientAppointments = await getAppointmentsByPatient(params.id);
        console.log('Fetched patient appointments:', patientAppointments);
        if (Array.isArray(patientAppointments)) {
          setAppointments(patientAppointments);
        } else {
          console.error('Unexpected appointments data format:', patientAppointments);
          setAppointments([]);
          toast.error('Failed to load appointment data correctly');
        }
      } catch (appointmentError) {
        console.error('Error fetching patient appointments:', appointmentError);
        setAppointments([]);
        toast.error('Failed to load appointments');
      }
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
      
      // Check if patient has appointments
      if (appointments.length > 0) {
        toast.error('Cannot delete patient with existing appointments');
        return;
      }
      
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
                    {appointments.length > 0 && (
                      <p className="mt-2 text-red-500 font-medium">
                        Warning: This patient has {appointments.length} appointment(s). 
                        Please cancel or reassign these appointments before deleting.
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeletePatient}
                    disabled={isDeleting || appointments.length > 0}
                    className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Patient'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Link href={`/dashboard/reception/appointments/book?patientId=${patient.id}`}>
              <Button>
                <CalendarClock className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="details">
        <TabsList className="mb-8">
          <TabsTrigger value="details">Patient Details</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic details about the patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{patient.name || 'Not provided'}</p>
                  </div>
                </div>
                
                {patient.age && (
                  <div className="flex items-start">
                    <CalendarClock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p className="font-medium">{patient.age} years</p>
                    </div>
                  </div>
                )}
                
                {patient.gender && (
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="font-medium">{patient.gender}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{patient.phone || 'Not provided'}</p>
                  </div>
                </div>
                
                {patient.email && (
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium">
                        <a href={`mailto:${patient.email}`} className="text-blue-600 hover:underline">
                          {patient.email}
                        </a>
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{patient.address || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
                <CardDescription>Health-related details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.bloodGroup && (
                  <div className="flex items-start">
                    <Droplets className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Blood Group</p>
                      <p className="font-medium">{patient.bloodGroup}</p>
                    </div>
                  </div>
                )}
                
                {patient.guardian && (
                  <div>
                    <p className="text-sm text-gray-500">Guardian</p>
                    <p className="font-medium">{patient.guardian}</p>
                  </div>
                )}
                
                {patient.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="mt-1">{patient.notes}</p>
                  </div>
                )}
                
                {!patient.notes && !patient.guardian && !patient.bloodGroup && (
                  <p className="text-gray-500">No medical information recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
              <CardDescription>
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-xs uppercase">
                        <th className="text-left py-3 px-4">Date & Time</th>
                        <th className="text-left py-3 px-4">Reason</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {appointment.date && typeof appointment.date.getTime === 'function' ? 
                              format(new Date(appointment.date), 'MMM d, yyyy') : 
                              'Invalid Date'
                            }
                            <div className="text-xs text-gray-500">{appointment.time}</div>
                          </td>
                          <td className="py-3 px-4">{appointment.reason}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs uppercase font-semibold ${
                                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                appointment.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                                appointment.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {appointment.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/dashboard/reception/appointments/${appointment.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No appointments found for this patient</p>
                  <Link href={`/dashboard/reception/appointments/book?patientId=${patient.id}`}>
                    <Button className="mt-4">
                      Book New Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 