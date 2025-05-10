'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  UserCheck,
  Clock,
  CalendarX,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { getAppointmentsByDate, getAppointmentStats } from '@/lib/firebase/appointments';
import { getAllPatients } from '@/lib/firebase/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ReceptionDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0,
    completed: 0,
    waiting: 0,
    cancelled: 0,
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
          // Fetch data
          await Promise.all([
            fetchTodayAppointments(),
            fetchPatientCount(),
            fetchAppointmentStats()
          ]);
        }
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error loading dashboard');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPatientCount = async () => {
    try {
      console.log('🔵 [Dashboard] Fetching patient count...');
      const patients = await getAllPatients();
      console.log(`✅ [Dashboard] Retrieved ${patients.length} patients`);
      setPatientCount(patients.length);
    } catch (error) {
      console.error('❌ [Dashboard] Error fetching patient count:', error);
      // Don't set patient count to 0 on error to avoid flickering if the value was already set
    }
  };

  const fetchAppointmentStats = async () => {
    try {
      console.log('🔵 [Dashboard] Fetching appointment statistics...');
      const stats = await getAppointmentStats();
      console.log('✅ [Dashboard] Retrieved appointment statistics:', stats);
      setAppointmentStats(stats);
    } catch (error) {
      console.error('❌ [Dashboard] Error fetching appointment statistics:', error);
      toast.error('Error loading appointment statistics');
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      const today = new Date();
      const appointments = await getAppointmentsByDate(today);
      setTodayAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Error loading appointments');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reception Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-10"
            onClick={() => {
              setIsLoading(true);
              Promise.all([
                fetchTodayAppointments(),
                fetchPatientCount(),
                fetchAppointmentStats()
              ]).finally(() => {
                setIsLoading(false);
                toast.success("Dashboard refreshed");
              });
            }}
            title="Refresh dashboard"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={`${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          
          <Link href="/dashboard/reception/patients/add">
            <Button>Add New Patient</Button>
          </Link>
          <Link href="/dashboard/reception/appointments/book">
            <Button variant="outline">Book Appointment</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/reception/patients" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Patients</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      patientCount || 0
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <CalendarClock className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/reception/appointments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed Appointments</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      appointmentStats.completed
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/reception/appointments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Waiting/Scheduled</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      appointmentStats.waiting
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/reception/appointments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Cancelled</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      appointmentStats.cancelled
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <CalendarX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              Manage appointments scheduled for today
              {!isLoading && (
                <span className="text-xs text-gray-500 ml-2">
                  ({todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardDescription>
          </div>
          <Link href="/dashboard/reception/appointments">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-gray-500">Loading appointments...</p>
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Patient</th>
                    <th className="text-left py-3 px-4">Reason</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{appointment.time}</td>
                      <td className="py-3 px-4">{appointment.patientName || "Unknown"}</td>
                      <td className="py-3 px-4">{appointment.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs uppercase font-semibold ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
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
              <p className="text-gray-500 mb-4">No appointments scheduled for today</p>
              <Link href="/dashboard/reception/appointments/book">
                <Button variant="outline">
                  Book an Appointment
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}