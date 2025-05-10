'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { addAppointment, getBookedTimeSlots } from '@/lib/firebase/appointments';
import { getAllPatients } from '@/lib/firebase/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { toast } from 'sonner';

// Generate time slots from 8 AM to 5 PM in 30-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 17; hour++) {
    for (let minute of [0, 30]) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMinute = minute === 0 ? '00' : minute;
      slots.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }
  return slots;
};

// Define the schema for appointment form
const appointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Patient is required" }),
  doctorId: z.string().optional(),
  date: z.date({ required_error: "Appointment date is required" }),
  time: z.string().min(1, { message: "Appointment time is required" }),
  reason: z.string().min(3, { message: "Reason for appointment is required" }).max(500),
  notes: z.string().max(1000).optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export default function BookAppointmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(generateTimeSlots());
  const [bookedTimeSlots, setBookedTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      date: new Date(),
      time: "",
      reason: "",
      notes: "",
    },
  });

  // Get the selected date from the form
  const selectedDate = form.watch('date');

  // Effect to fetch patients and initialize data
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
          await fetchPatients();
          
          // Initialize time slots for the default date (today)
          await updateAvailableTimeSlots(new Date());
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
  
  // Effect to update available time slots when date changes
  useEffect(() => {
    if (selectedDate) {
      updateAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate]);
  
  // Reset the time field if the selected time is no longer available
  useEffect(() => {
    const currentTime = form.getValues('time');
    if (currentTime && bookedTimeSlots.includes(currentTime)) {
      form.setValue('time', '');
    }
  }, [bookedTimeSlots, form]);

  const fetchPatients = async () => {
    try {
      const patientsData = await getAllPatients();
      setPatients(patientsData);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  };
  
  const updateAvailableTimeSlots = async (date: Date) => {
    try {
      setIsLoadingTimeSlots(true);
      
      // Get all possible time slots
      const allTimeSlots = generateTimeSlots();
      
      // Get booked time slots for the selected date
      const booked = await getBookedTimeSlots(date);
      console.log('Booked time slots:', booked);
      setBookedTimeSlots(booked);
      
      // Filter out the booked slots
      const available = allTimeSlots.filter(slot => !booked.includes(slot));
      console.log('Available time slots:', available);
      setAvailableTimeSlots(available);
      
      console.log(`Available time slots for ${format(date, 'yyyy-MM-dd')}: ${available.length} of ${allTimeSlots.length}`);
    } catch (error) {
      console.error('Error updating available time slots:', error);
      // In case of error, show all time slots as available
      const allTimeSlots = generateTimeSlots();
      setAvailableTimeSlots(allTimeSlots);
      toast.error('Failed to check appointment availability');
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      setIsSubmitting(true);
      console.log('🔵 [Book Appointment] Submitting appointment data:', data);

      // Verify the time slot is still available (just in case it was booked while user was filling the form)
      const latestBookedSlots = await getBookedTimeSlots(data.date);
      if (latestBookedSlots.includes(data.time)) {
        toast.error('Sorry, this time slot was just booked. Please select another time.');
        // Update the available slots
        await updateAvailableTimeSlots(data.date);
        return;
      }

      // Find patient for better display in appointment list
      const patient = patients.find(p => p.id === data.patientId);

      if (!patient) {
        toast.error('Selected patient not found');
        return;
      }

      // Add appointment to Firestore with default doctor info
      const appointmentData = {
        ...data,
        patientName: patient.name || patient.fullName,
        doctorId: "", // Empty doctor ID
      };

      const appointmentId = await addAppointment(appointmentData);
      console.log('✅ [Book Appointment] Appointment created with ID:', appointmentId);
      
      toast.success('Appointment booked successfully!');
      router.push('/dashboard/reception/appointments');
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center mb-8">
        <Link href="/dashboard/reception/appointments" className="mr-4">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="text-gray-500 mt-1">
            Schedule a new appointment
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          <CardDescription>
            Fill in the details to book a new appointment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Selection */}
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name || patient.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the patient for this appointment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Picker */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Appointment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal flex justify-between"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The date for the appointment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Picker */}
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Time</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTimeSlots.map((timeSlot) => (
                            <SelectItem key={timeSlot} value={timeSlot}>
                              {timeSlot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a time slot for the appointment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Appointment</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Annual check-up, Follow-up, Consultation" />
                    </FormControl>
                    <FormDescription>
                      Brief reason for this appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any additional information or special requirements" 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes for the doctor or clinic staff
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Link href="/dashboard/reception/appointments">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Booking...' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 