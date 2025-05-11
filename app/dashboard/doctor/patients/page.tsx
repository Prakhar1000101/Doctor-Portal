'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';
import { getDoctorByUserId } from '@/lib/firebase/doctors';
import { format } from 'date-fns';

type Appointment = {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  date: Date;
  time: string;
  status: string;
  createdAt: Date;
  [key: string]: any;
};

type Patient = {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  lastVisit: string | number | null;
  appointmentCount: number;
  upcomingAppointment: boolean;
};

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

        try {
          // Get doctor info
          const doctorInfo = await getDoctorByUserId(user.uid);
          setDoctor(doctorInfo);
          // Fetch patients
          await fetchPatients(doctorInfo?.id || user.uid);
        } catch (error) {
          console.error('Error fetching doctor data:', error);
          toast.error('Failed to load doctor information');
        }
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error verifying permissions');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch all patients and their appointment data
  const fetchPatients = async (doctorId: string) => {
    try {
      setIsLoading(true);
      
      // Get all appointments to calculate stats
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('date', 'desc') // Order by date to get latest appointments first
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = appointmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to JavaScript Date
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          doctorId: data.doctorId,
          patientId: data.patientId,
          patientName: data.patientName,
          time: data.time,
          status: data.status
        } as Appointment;
      });

      // Fetch all patients directly
      const patientsQuery = query(
        collection(db, 'patients'),
        orderBy('name', 'asc')
      );
      
      const patientsSnapshot = await getDocs(patientsQuery);
      const patientsData = patientsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.fullName || 'Unknown',
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          appointmentCount: 0,
          lastVisit: null,
          upcomingAppointment: false
        } as Patient;
      });

      // Process appointments to add visit data
      const now = new Date();
      const enhancedPatients = patientsData.map(patient => {
        const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
        const completedAppointments = patientAppointments.filter(apt => apt.status === 'completed');
        const upcomingAppointments = patientAppointments.filter(apt => apt.date > now && apt.status !== 'cancelled');

        // Find the most recent completed appointment
        const lastCompletedAppointment = completedAppointments.length > 0 
          ? completedAppointments.reduce((latest, current) => 
              latest.date > current.date ? latest : current
            )
          : null;

        return {
          ...patient,
          appointmentCount: completedAppointments.length,
          lastVisit: lastCompletedAppointment ? lastCompletedAppointment.date.getTime() : null,
          upcomingAppointment: upcomingAppointments.length > 0
        };
      });

      // Sort by most recent visit, with patients having upcoming appointments first
      const sortedPatients = enhancedPatients.sort((a, b) => {
        if (a.upcomingAppointment && !b.upcomingAppointment) return -1;
        if (!a.upcomingAppointment && b.upcomingAppointment) return 1;
        if (a.lastVisit && b.lastVisit) return b.lastVisit - a.lastVisit;
        if (a.lastVisit) return -1;
        if (b.lastVisit) return 1;
        return 0;
      });

      console.log('Processed patients:', sortedPatients);
      setPatients(sortedPatients);
      setFilteredPatients(sortedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    try {
      setIsSearching(true);
      const term = searchTerm.toLowerCase();
      
      const results = patients.filter(patient => {
        const name = (patient.name || '').toLowerCase();
        const phone = (patient.phone || '').toLowerCase();
        const email = (patient.email || '').toLowerCase();
        return name.includes(term) || phone.includes(term) || email.includes(term);
      });
      
      setFilteredPatients(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error('Error searching patients');
    } finally {
      setIsSearching(false);
    }
  };

  // Reset search
  const resetSearch = () => {
    setSearchTerm('');
    setFilteredPatients(patients);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8 pb-16">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Patients</h1>
          <p className="text-gray-500 mt-1">View and manage your patient records</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
        {searchTerm && (
          <Button variant="outline" onClick={resetSearch}>
            Clear
          </Button>
        )}
      </div>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            Total: {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-xs uppercase">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Contact</th>
                    <th className="text-left py-3 px-4">Last Visit</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{patient.name || 'No Name'}</div>
                        <div className="text-sm text-gray-500">
                          {patient.age ? `${patient.age} years` : ''} 
                          {patient.gender ? ` • ${patient.gender}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {patient.phone && (
                            <div>{patient.phone}</div>
                          )}
                          {patient.email && (
                            <div className="text-gray-500">{patient.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {patient.lastVisit ? (
                          <div>
                            <div>{format(new Date(patient.lastVisit), 'MMM d, yyyy')}</div>
                            <div className="text-sm text-gray-500">
                              {patient.appointmentCount} visit{patient.appointmentCount !== 1 ? 's' : ''} total
                            </div>
                          </div>
                        ) : (
                          'No visits yet'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/dashboard/doctor/patients/${patient.id}`}>
                          <Button variant="outline" size="sm">
                            View History
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
              <p className="text-gray-500">No patients found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 