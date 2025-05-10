'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  UserCheck,
  Clock,
  FileText,
  RefreshCw,
  Calendar,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { getDoctorByUserId } from '@/lib/firebase/doctors';
import { getAppointmentsByDoctor, getAllAppointments } from '@/lib/firebase/appointments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [appointmentStats, setAppointmentStats] = useState({
    total: 0,
    completed: 0,
    waiting: 0,
    inProgress: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      try {
        console.log('Checking user role for:', user.uid);
        const role = await getUserRole(user.uid);
        console.log('User role:', role);
        
        if (role !== 'doctor') {
          toast.error('You do not have access to this page');
          router.push('/auth/role-selection');
          return;
        }
        
        try {
          // Get doctor info
          console.log('Fetching doctor info for user:', user.uid);
          const doctorInfo = await getDoctorByUserId(user.uid);
          console.log('Doctor info retrieved:', doctorInfo);
          setDoctor(doctorInfo);

          // Fetch today's appointments and all appointment data
          const doctorId = doctorInfo?.id || user.uid;
          console.log('Using doctorId for appointments:', doctorId);
          
          const todayStats = await fetchTodayAppointments(doctorId);
          console.log('Today stats:', todayStats);
          
          const allAppointmentsData = await fetchAllAppointments(doctorId);
          console.log('All appointments:', allAppointmentsData?.length || 0);
        } catch (fetchError) {
          console.error('Error fetching doctor data:', fetchError);
          
          // Even if we can't get the doctor profile, we can still try to get appointments
          try {
            console.log('Fallback: using user.uid for appointments:', user.uid);
            const todayStats = await fetchTodayAppointments(user.uid);
            console.log('Fallback today stats:', todayStats);
            
            const allAppointmentsData = await fetchAllAppointments(user.uid);
            console.log('Fallback all appointments:', allAppointmentsData?.length || 0);
          } catch (appointmentError) {
            console.error('Error fetching appointments:', appointmentError);
            toast.error('Failed to load appointments');
          }
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

  const fetchTodayAppointments = async (doctorId: string) => {
    try {
      console.log('Fetching today\'s appointments for doctor:', doctorId);
      const today = new Date();
      const appointments = await getAppointmentsByDoctor(doctorId, today);
      console.log('Today\'s appointments fetched:', appointments?.length || 0);
      setTodayAppointments(appointments || []);
      
      // Calculate stats for today
      const total = appointments?.length || 0;
      const completed = appointments?.filter(apt => apt.status === 'completed')?.length || 0;
      const waiting = appointments?.filter(apt => apt.status === 'checked-in' || apt.status === 'scheduled')?.length || 0;
      const inProgress = appointments?.filter(apt => apt.status === 'in-progress')?.length || 0;

      const stats = { total, completed, waiting, inProgress };
      console.log('Today\'s stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      toast.error('Error loading today\'s appointments');
      return { total: 0, completed: 0, waiting: 0, inProgress: 0 };
    }
  };

  const fetchAllAppointments = async (doctorId: string) => {
    try {
      console.log('Fetching all appointments for doctor:', doctorId);
      // Fetch all appointments for this doctor (not just today)
      const appointments = await getAppointmentsByDoctor(doctorId);
      console.log('All appointments fetched:', appointments?.length || 0);
      setAllAppointments(appointments || []);
      
      // Calculate overall stats
      const total = appointments?.length || 0;
      const completed = appointments?.filter(apt => apt.status === 'completed')?.length || 0;
      const waiting = appointments?.filter(apt => apt.status === 'checked-in' || apt.status === 'scheduled')?.length || 0;
      const inProgress = appointments?.filter(apt => apt.status === 'in-progress')?.length || 0;

      const stats = {
        total,
        completed,
        waiting,
        inProgress,
      };
      
      console.log('Setting appointment stats:', stats);
      setAppointmentStats(stats);
      
      return appointments;
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      toast.error('Error loading appointments data');
      return [];
    }
  };

  const refreshData = async () => {
    if (!doctor) return;
    
    try {
      setIsRefreshing(true);
      
      const doctorId = doctor.id || (auth.currentUser?.uid as string);
      if (!doctorId) {
        toast.error('Could not determine doctor ID');
        return;
      }
      
      const todayStats = await fetchTodayAppointments(doctorId);
      const allAppointmentsData = await fetchAllAppointments(doctorId);
      
      console.log('Refreshed today stats:', todayStats);
      console.log('Refreshed all appointments:', allAppointmentsData?.length || 0);
      
      toast.success('Dashboard data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingAppointmentsToday = todayAppointments.filter(
    apt => apt.status === 'scheduled' || apt.status === 'checked-in'
  ).sort((a, b) => {
    // Sort by time (convert "10:30 AM" to minutes for comparison)
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  return (
    <div className="container mx-auto pt-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
            {doctor && <span className="ml-1">| Welcome, Dr. {doctor.name}</span>}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 h-10"
            onClick={refreshData}
            disabled={isRefreshing}
            title="Refresh dashboard"
          >
            <RefreshCw size={16} className={`${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          
          <Link href="/dashboard/doctor/appointments">
            <Button>View All Appointments</Button>
          </Link>
        </div>
      </div>

      {/* Doctor Info Card */}
      {doctor && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{doctor.name || 'Doctor'}</h2>
                <p className="text-gray-500">
                  {doctor.specialization || 'General Practitioner'}
                </p>
              </div>
              <div className="ml-auto flex flex-col gap-2 mt-4 sm:mt-0">
                {doctor.email && (
                  <Badge variant="outline" className="ml-auto">
                    <Mail className="h-3 w-3 mr-1" /> {doctor.email}
                  </Badge>
                )}
                {doctor.phone && (
                  <Badge variant="outline" className="ml-auto">
                    <Phone className="h-3 w-3 mr-1" /> {doctor.phone}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/doctor/appointments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading || isRefreshing ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      appointmentStats.total
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

        <Link href="/dashboard/doctor/appointments?status=completed" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading || isRefreshing ? (
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

        <Link href="/dashboard/doctor/appointments?status=scheduled" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Waiting/Scheduled</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading || isRefreshing ? (
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

        <Link href="/dashboard/doctor/appointments?status=in-progress" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {isLoading || isRefreshing ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      appointmentStats.inProgress
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FileText className="h-6 w-6 text-yellow-600" />
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
              Patients scheduled for today
              {!isLoading && (
                <span className="text-xs text-gray-500 ml-2">
                  ({todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">
            {format(new Date(), 'MMMM d, yyyy')}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading || isRefreshing ? (
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
                        <Link href={`/dashboard/doctor/appointments/${appointment.id}`}>
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
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Your schedule is clear for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments Section (only if there are upcoming appointments) */}
      {upcomingAppointmentsToday.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upcoming Next</CardTitle>
            <CardDescription>Your next scheduled appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointmentsToday.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-center p-4 border rounded-md hover:bg-gray-50">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-gray-500">{appointment.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{appointment.time}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'checked-in' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                  <Link href={`/dashboard/doctor/appointments/${appointment.id}`} className="ml-4">
                    <Button size="sm">View</Button>
                  </Link>
                </div>
              ))}
              {upcomingAppointmentsToday.length > 3 && (
                <div className="text-center mt-2">
                  <Link href="/dashboard/doctor/appointments">
                    <Button variant="outline">
                      View All {upcomingAppointmentsToday.length} Upcoming Appointments
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}