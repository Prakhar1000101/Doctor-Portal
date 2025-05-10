'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Calendar,
  FileText,
  Phone,
  Mail,
  Clock
} from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

type Patient = {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
};

type Appointment = {
  id: string;
  date: string | number;
  time: string;
  reason: string;
  status: string;
  notes?: string;
  prescription?: string;
  doctorId: string;
  patientId: string;
  patientName: string;
};

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    upcomingVisits: 0,
    lastVisit: null as string | null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      try {
        const role = await getUserRole(user.uid);
        if (role !== 'doctor') {
          toast.error('You do not have access to this page');
          router.push('/auth/role-selection');
          return;
        }

        await fetchPatientData();
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error verifying permissions');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, params.id]);

  const fetchPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Get patient data
      const patientDoc = await getDoc(doc(db, 'patients', params.id));
      
      if (!patientDoc.exists()) {
        toast.error('Patient not found');
        return;
      }
      
      const patientData = {
        id: patientDoc.id,
        ...patientDoc.data()
      } as Patient;
      
      setPatient(patientData);
      
      // Get appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', params.id),
        orderBy('date', 'desc')
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Appointment[];

      // Calculate stats
      const now = new Date().getTime();
      const completed = appointmentsData.filter(apt => apt.status === 'completed');
      const upcoming = appointmentsData.filter(apt => {
        const aptDate = new Date(apt.date).getTime();
        return aptDate > now && apt.status !== 'cancelled';
      });

      const lastVisit = completed.length > 0 
        ? format(new Date(completed[0].date), 'MMM d, yyyy')
        : null;

      setStats({
        totalVisits: appointmentsData.length,
        completedVisits: completed.length,
        upcomingVisits: upcoming.length,
        lastVisit
      });
      
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoading(false);
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
        <Link href="/dashboard/doctor/patients">
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
        <Link href="/dashboard/doctor/patients" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to All Patients
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">{patient.name}</h1>
            <p className="text-gray-500 mt-1">
              {patient.age ? `${patient.age} years old` : 'Age not specified'}
              {patient.gender ? ` • ${patient.gender}` : ''}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {stats.upcomingVisits > 0 && (
              <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                {stats.upcomingVisits} Upcoming Visit{stats.upcomingVisits !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">
              {stats.completedVisits} Completed Visit{stats.completedVisits !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>Basic details and medical history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Contact Information</h3>
              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Visit History */}
            <div className="space-y-4">
              <h3 className="font-medium">Visit History</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>
                    Last Visit: {stats.lastVisit || 'No visits yet'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>
                    Total Visits: {stats.totalVisits}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Medical History */}
          <div className="space-y-4">
            <h3 className="font-medium">Medical History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Blood Type</p>
                <p>{patient.bloodType || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Allergies</p>
                <p>{patient.allergies?.length ? patient.allergies.join(', ') : 'None reported'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Chronic Conditions</p>
                <p>{patient.chronicConditions?.length ? patient.chronicConditions.join(', ') : 'None reported'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments History */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
          <CardDescription>Past and upcoming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Reason</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {format(new Date(appointment.date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">{appointment.time}</td>
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
                        <Link href={`/dashboard/doctor/appointments/${appointment.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 