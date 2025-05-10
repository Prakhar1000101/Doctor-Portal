'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar as CalendarIcon, 
  Search, 
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  doc,
  getDocs
} from 'firebase/firestore';
import { getUserRole } from '@/lib/firebase/auth';
import { getDoctorByUserId } from '@/lib/firebase/doctors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [unsubscribeListener, setUnsubscribeListener] = useState<(() => void) | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
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
          
          // Setup real-time appointment listener
          setupAppointmentListener(doctorInfo?.id || user.uid);
        } catch (error) {
          console.error('Error fetching doctor data:', error);
          
          // Fallback to using user ID directly
          setupAppointmentListener(user.uid);
        }
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error loading appointments');
        setIsLoading(false);
      }
    });

    return () => {
      // Unsubscribe from Firebase listeners
      authUnsubscribe();
      if (unsubscribeListener) {
        unsubscribeListener();
      }
    };
  }, [router]);

  // Set up real-time listener for appointments
  const setupAppointmentListener = (doctorId: string) => {
    try {
      setIsLoading(true);
      console.log('Setting up real-time appointment listener for doctor:', doctorId);
      
      // Unsubscribe from previous listener if it exists
      if (unsubscribeListener) {
        unsubscribeListener();
      }
      
      // Create Firestore query for appointments
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('date'),
        orderBy('time')
      );
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(appointmentsQuery, 
        (snapshot) => {
          console.log('Real-time appointment update received');
          const appointmentData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.date.toDate(),
              createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
            };
          });
          
          console.log(`Retrieved ${appointmentData.length} appointments in real-time`);
          setAppointments(appointmentData);
          applyFilters(appointmentData, filterStatus);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error in appointment listener:', error);
          
          // Fallback to regular query if listener fails (e.g., missing index)
          console.log('Falling back to regular query due to listener error');
          fallbackToRegularQuery(doctorId);
        }
      );
      
      // Save unsubscribe function
      setUnsubscribeListener(() => unsubscribe);
      
    } catch (error) {
      console.error('Error setting up appointment listener:', error);
      fallbackToRegularQuery(doctorId);
    }
  };
  
  // Fallback method when real-time listener fails
  const fallbackToRegularQuery = async (doctorId: string) => {
    try {
      console.log('Using fallback query method for appointments');
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      let appointmentsQuery;
      
      try {
        // Try with full query first
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          orderBy('date'),
          orderBy('time')
        );
      } catch (indexError) {
        // Fallback to simpler query without orderBy
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId)
        );
        toast.warning('Limited query mode due to database configuration');
      }
      
      const snapshot = await getDocs(appointmentsQuery);
      
      let appointmentData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
        };
      });
      
      // If using simpler query, filter by date manually and sort
      if (!appointmentsQuery.toString().includes('orderBy')) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        appointmentData = appointmentData.filter(appointment => {
          const appointmentDate = format(appointment.date, 'yyyy-MM-dd');
          return appointmentDate === dateString;
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
      }
      
      setAppointments(appointmentData);
      applyFilters(appointmentData, filterStatus);
      
    } catch (error) {
      console.error('Error in fallback query:', error);
      toast.error('Failed to load appointments');
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    if (!doctor) return;
    
    toast.info('Refreshing appointment data...');
    setupAppointmentListener(doctor.id || (auth.currentUser?.uid as string));
  };

  const applyFilters = (appts: any[], status: string | null) => {
    let filtered = [...appts];
    
    // Apply status filter if selected
    if (status) {
      filtered = filtered.filter(appointment => appointment.status === status);
    }
    
    // Apply search filter if text entered
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(appointment => 
        appointment.patientName?.toLowerCase().includes(term) ||
        appointment.reason?.toLowerCase().includes(term)
      );
    }
    
    setFilteredAppointments(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(appointments, filterStatus);
  };

  const handleStatusFilter = (status: string) => {
    const newStatus = status === 'all' ? null : status;
    setFilterStatus(newStatus);
    applyFilters(appointments, newStatus);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      
      // Update real-time listener for the new date
      if (doctor) {
        setupAppointmentListener(doctor.id || (auth.currentUser?.uid as string));
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'checked-in':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-yellow-100 text-yellow-800'; // scheduled
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
          <Link href="/dashboard/doctor" className="flex items-center text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-gray-500 mt-1">
            View and manage your patient appointments
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <Button 
            onClick={refreshData} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search appointments..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="flex space-x-2">
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full flex justify-between">
                  <span>{format(selectedDate, 'PPP')}</span>
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Select onValueChange={handleStatusFilter} defaultValue="all">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                  Scheduled
                </div>
              </SelectItem>
              <SelectItem value="checked-in">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                  Checked In
                </div>
              </SelectItem>
              <SelectItem value="in-progress">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mr-2"></div>
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                  Completed
                </div>
              </SelectItem>
              <SelectItem value="cancelled">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                  Cancelled
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>
                Showing appointments for {format(selectedDate, 'MMMM d, yyyy')}
                <span className="ml-2 text-xs text-gray-500">
                  ({filteredAppointments.length} appointments)
                </span>
              </CardDescription>
            </div>
            <div className="mt-2 sm:mt-0">
              <Badge variant="outline" className="whitespace-nowrap">
                Real-time updates active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length > 0 ? (
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
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{appointment.time}</td>
                      <td className="py-3 px-4">{appointment.patientName}</td>
                      <td className="py-3 px-4">{appointment.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs uppercase font-semibold ${getStatusBadgeClass(appointment.status)}`}>
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
              <p className="text-gray-500 mb-4">No appointments found for {format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 