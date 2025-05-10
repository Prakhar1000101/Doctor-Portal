// 'use client';

// import React, { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { 
//   Calendar as CalendarIcon, 
//   Search, 
//   PlusCircle, 
//   Filter, 
//   CheckCircle2,
//   Clock,
//   XCircle,
//   RefreshCw
// } from 'lucide-react';
// import { format } from 'date-fns';
// import { auth } from '@/lib/firebase/config';
// import { onAuthStateChanged } from 'firebase/auth';
// import { getUserRole } from '@/lib/firebase/auth';
// import { getAppointmentsByDate, getAllAppointments } from '@/lib/firebase/appointments';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { 
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Calendar } from '@/components/ui/calendar';
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Input } from '@/components/ui/input';
// import Link from 'next/link';
// import { toast } from 'sonner';
// import { Badge } from '@/components/ui/badge';

// export default function AppointmentsPage() {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(true);
//   const [appointments, setAppointments] = useState<any[]>([]);
//   const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
//   const [selectedDate, setSelectedDate] = useState<Date>(new Date());
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState<string | null>(null);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (!user) {
//         router.push('/auth/signin');
//         return;
//       }

//       try {
//         const role = await getUserRole(user.uid);
//         if (role !== 'reception') {
//           toast.error('You do not have access to this page');
//           router.push('/auth/role-selection');
//         } else {
//           await fetchAllAppointments();
//         }
//       } catch (error) {
//         console.error('Error verifying role:', error);
//         toast.error('Error verifying permissions');
//       } finally {
//         setIsLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, [router]);

//   const fetchAllAppointments = async () => {
//     try {
//       setIsLoading(true);
      
//       // Try to get all appointments, and fall back to getting by date if there's an index error
//       try {
//         const fetchedAppointments = await getAllAppointments();
//         setAppointments(fetchedAppointments);
//         filterAppointmentsByDate(fetchedAppointments, selectedDate);
//       } catch (indexError: any) {
//         // If there's an index error, fall back to getting appointments by date
//         if (indexError.message && (indexError.message.includes('index') || indexError.message.includes('administrator'))) {
//           console.log('Index error, falling back to getAppointmentsByDate');
//           const fetchedAppointments = await getAppointmentsByDate(selectedDate);
//           setAppointments(fetchedAppointments);
//           setFilteredAppointments(fetchedAppointments);
//           toast.warning('Limited view mode: Only showing appointments for the selected date');
//         } else {
//           // Re-throw if it's not an index error
//           throw indexError;
//         }
//       }
//     } catch (error: any) {
//       console.error('Error fetching appointments:', error);
//       // Check if it's an index error and show a more helpful message
//       if (error.message && error.message.includes('index')) {
//         toast.error('Database setup required. Please visit the Firebase console to create the required index.');
//       } else if (error.message && error.message.includes('administrator')) {
//         toast.error(error.message);
//       } else {
//         toast.error('Failed to load appointments');
//       }
//       // Set empty arrays to prevent errors in the UI
//       setAppointments([]);
//       setFilteredAppointments([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const filterAppointmentsByDate = (appts: any[], date: Date) => {
//     const dateString = format(date, 'yyyy-MM-dd');
    
//     const filtered = appts.filter(appointment => {
//       const appointmentDate = format(new Date(appointment.date), 'yyyy-MM-dd');
//       return appointmentDate === dateString;
//     });
    
//     applyFilters(filtered, filterStatus);
//   };

//   const applyFilters = (appts: any[], status: string | null) => {
//     if (!status) {
//       setFilteredAppointments(appts);
//       return;
//     }
    
//     const filtered = appts.filter(appointment => appointment.status === status);
//     setFilteredAppointments(filtered);
//   };

//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setSearchTerm(value);
    
//     if (!value.trim()) {
//       applyFilters(appointments, filterStatus);
//       return;
//     }
    
//     const term = value.toLowerCase();
//     const filtered = appointments.filter(appointment =>
//       appointment.patientName?.toLowerCase().includes(term) ||
//       appointment.reason?.toLowerCase().includes(term)
//     );
    
//     applyFilters(filtered, filterStatus);
//   };

//   const handleStatusFilter = (status: string) => {
//     setFilterStatus(status === 'all' ? null : status);
//     applyFilters(appointments, status === 'all' ? null : status);
//   };

//   const getStatusBadgeClass = (status: string) => {
//     switch(status) {
//       case 'completed':
//         return 'bg-green-100 text-green-800';
//       case 'cancelled':
//         return 'bg-red-100 text-red-800';
//       case 'checked-in':
//         return 'bg-blue-100 text-blue-800';
//       case 'in-progress':
//         return 'bg-purple-100 text-purple-800';
//       default:
//         return 'bg-yellow-100 text-yellow-800'; // scheduled
//     }
//   };

//   const handleDateChange = (date: Date | undefined) => {
//     if (date) {
//       setSelectedDate(date);
      
//       // If we have full appointments list, filter by date
//       if (appointments.length > 0) {
//         filterAppointmentsByDate(appointments, date);
//       } else {
//         // Otherwise, try to fetch appointments for this specific date
//         setIsLoading(true);
//         getAppointmentsByDate(date)
//           .then(fetchedAppointments => {
//             setAppointments(fetchedAppointments);
//             setFilteredAppointments(fetchedAppointments);
//           })
//           .catch(error => {
//             console.error('Error fetching appointments by date:', error);
//             toast.error('Failed to load appointments for selected date');
//             setFilteredAppointments([]);
//           })
//           .finally(() => {
//             setIsLoading(false);
//           });
//       }
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto pt-8">
//       <div className="flex flex-col md:flex-row items-center justify-between mb-8">
//         <div>
//           <h1 className="text-3xl font-bold">Appointments</h1>
//           <p className="text-gray-500 mt-1">
//             Manage all appointments
//           </p>
//         </div>

//         <div className="mt-4 md:mt-0">
//           <Link href="/dashboard/reception/appointments/book">
//             <Button className="flex items-center gap-2">
//               <PlusCircle size={16} />
//               Book Appointment
//             </Button>
//           </Link>
//         </div>
//       </div>

//       {/* Filters Row */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//         <div className="flex items-center relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
//           <Input
//             placeholder="Search appointments..."
//             className="pl-10"
//             value={searchTerm}
//             onChange={handleSearch}
//           />
//         </div>

//         <div className="flex space-x-2">
//           <div className="flex-1">
//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button variant="outline" className="w-full flex justify-between">
//                   <span>{format(selectedDate, 'PPP')}</span>
//                   <CalendarIcon className="ml-2 h-4 w-4" />
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-auto p-0">
//                 <Calendar
//                   mode="single"
//                   selected={selectedDate}
//                   onSelect={handleDateChange}
//                   initialFocus
//                 />
//               </PopoverContent>
//             </Popover>
//           </div>
//           <div>
//             <Button 
//               variant="outline" 
//               size="icon" 
//               onClick={() => fetchAllAppointments()}
//               title="Refresh appointments"
//             >
//               <RefreshCw size={16} />
//             </Button>
//           </div>
//         </div>

//         <div>
//           <Select onValueChange={handleStatusFilter} defaultValue="all">
//             <SelectTrigger className="w-full">
//               <SelectValue placeholder="Filter by status" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Statuses</SelectItem>
//               <SelectItem value="scheduled">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
//                   Scheduled
//                 </div>
//               </SelectItem>
//               <SelectItem value="checked-in">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
//                   Checked In
//                 </div>
//               </SelectItem>
//               <SelectItem value="in-progress">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full bg-purple-400 mr-2"></div>
//                   In Progress
//                 </div>
//               </SelectItem>
//               <SelectItem value="completed">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
//                   Completed
//                 </div>
//               </SelectItem>
//               <SelectItem value="cancelled">
//                 <div className="flex items-center">
//                   <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
//                   Cancelled
//                 </div>
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {/* Appointments List */}
//       <Card>
//         <CardHeader>
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
//             <div>
//               <CardTitle>All Appointments</CardTitle>
//               <CardDescription>
//                 Showing appointments for {format(selectedDate, 'MMMM d, yyyy')}
//                 <span className="ml-2 text-xs text-gray-500">
//                   ({filteredAppointments.length} of {appointments.length} total)
//                 </span>
//               </CardDescription>
//             </div>
//             <div className="mt-2 sm:mt-0">
//               <Badge variant="outline" className="whitespace-nowrap">
//                 Last updated: {appointments.length > 0 ? format(new Date(), 'h:mm a') : '-'}
//               </Badge>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//           {filteredAppointments.length > 0 ? (
//             <div className="overflow-x-auto">
//               <table className="w-full border-collapse">
//                 <thead>
//                   <tr className="border-b">
//                     <th className="text-left py-3 px-4">Time</th>
//                     <th className="text-left py-3 px-4">Patient</th>
//                     <th className="text-left py-3 px-4">Reason</th>
//                     <th className="text-left py-3 px-4">Status</th>
//                     <th className="text-right py-3 px-4">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredAppointments.map((appointment) => (
//                     <tr key={appointment.id} className="border-b hover:bg-gray-50">
//                       <td className="py-3 px-4">{appointment.time}</td>
//                       <td className="py-3 px-4">{appointment.patientName}</td>
//                       <td className="py-3 px-4">{appointment.reason}</td>
//                       <td className="py-3 px-4">
//                         <span className={`px-2 py-1 rounded-full text-xs uppercase font-semibold ${getStatusBadgeClass(appointment.status)}`}>
//                           {appointment.status}
//                         </span>
//                       </td>
//                       <td className="py-3 px-4 text-right">
//                         <Link href={`/dashboard/reception/appointments/${appointment.id}`}>
//                           <Button variant="ghost" size="sm">
//                             View
//                           </Button>
//                         </Link>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <div className="text-center py-8">
//               <p className="text-gray-500">No appointments found for this date</p>
//               <Link href="/dashboard/reception/appointments/book">
//                 <Button className="mt-4" variant="outline">
//                   Book an Appointment
//                 </Button>
//               </Link>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// } 




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