'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  AlertCircle, 
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { getDoctorByUserId } from '@/lib/firebase/doctors';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [unsubscribeAppointment, setUnsubscribeAppointment] = useState<(() => void) | null>(null);

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
        
        // Get doctor info to verify permissions
        try {
          const doctorInfo = await getDoctorByUserId(user.uid);
          if (!doctorInfo) {
            toast.error('Doctor profile not found');
            router.push('/dashboard/doctor');
            return;
          }
          
          // Set up real-time listener for the appointment
          setupAppointmentListener(doctorInfo.id || user.uid, params.id);
        } catch (error) {
          console.error('Error fetching doctor data:', error);
          // Fallback to user ID
          setupAppointmentListener(user.uid, params.id);
        }
      } catch (error) {
        console.error('Error verifying role:', error);
        toast.error('Error verifying permissions');
        setIsLoading(false);
      }
    });

    return () => {
      // Clean up listeners
      authUnsubscribe();
      if (unsubscribeAppointment) {
        unsubscribeAppointment();
      }
    };
  }, [router, params.id]);

  const setupAppointmentListener = (doctorId: string, appointmentId: string) => {
    try {
      // Set up real-time listener for the appointment document
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      const unsubscribe = onSnapshot(appointmentRef, 
        (docSnapshot) => {
          if (!docSnapshot.exists()) {
            toast.error('Appointment not found');
            setIsLoading(false);
            return;
          }
          
          const data = docSnapshot.data();
          
          // Verify this appointment belongs to the current doctor
          if (data.doctorId && data.doctorId !== doctorId) {
            console.warn('This appointment is not assigned to the current doctor');
            // We'll still show it, just log a warning
          }
          
          try {
            const appointmentData = {
              id: docSnapshot.id,
              ...data,
              date: data.date.toDate(),
              createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
              status: data.status,
              notes: data.notes || '',
            };
            
            console.log('Real-time appointment update received:', appointmentData);
            setAppointment(appointmentData);
            setNewStatus(appointmentData.status);
            setNotes(appointmentData.notes || '');
          } catch (error) {
            console.error('Error processing appointment data:', error);
          }
          
          setIsLoading(false);
        },
        (error) => {
          console.error('Error listening to appointment:', error);
          toast.error('Failed to load appointment details');
          setIsLoading(false);
        }
      );
      
      setUnsubscribeAppointment(() => unsubscribe);
      
    } catch (error) {
      console.error('Error setting up appointment listener:', error);
      toast.error('Failed to load appointment details');
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === appointment.status) return;

    try {
      setIsUpdating(true);
      const appointmentRef = doc(db, 'appointments', params.id);
      
      await updateDoc(appointmentRef, { 
        status: newStatus,
        lastUpdated: Timestamp.now()
      });
      
      toast.success(`Appointment status updated to ${newStatus}`);
      
      // Status will be updated via the real-time listener
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateNotes = async () => {
    try {
      setIsUpdating(true);
      const appointmentRef = doc(db, 'appointments', params.id);
      
      await updateDoc(appointmentRef, { 
        notes: notes,
        lastUpdated: Timestamp.now()
      });
      
      toast.success('Appointment notes updated');
      setShowNotesDialog(false);
      
      // Notes will be updated via the real-time listener
    } catch (error) {
      console.error('Error updating appointment notes:', error);
      toast.error('Failed to update appointment notes');
    } finally {
      setIsUpdating(false);
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

  if (!appointment) {
    return (
      <div className="container mx-auto pt-8">
        <div className="flex items-center mb-8">
          <Link href="/dashboard/doctor/appointments" className="mr-4">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Appointment Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">The appointment you're looking for doesn't exist or has been deleted.</p>
              <Link href="/dashboard/doctor/appointments">
                <Button>Back to Appointments</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8">
      <div className="flex items-center mb-8">
        <Link href="/dashboard/doctor/appointments" className="mr-4">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Appointment Details</h1>
          <p className="text-gray-500 mt-1">
            View and manage appointment information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main appointment information */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Appointment Information</CardTitle>
                <Badge className={getStatusBadgeClass(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
              <CardDescription>
                Created on {format(new Date(appointment.createdAt), 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-4">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Date and Time</h3>
                  <p className="text-gray-600">
                    {format(new Date(appointment.date), 'MMMM d, yyyy')} at {appointment.time}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Patient</h3>
                  <p className="text-gray-600">{appointment.patientName || "Unknown Patient"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-4">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Reason for Visit</h3>
                  <p className="text-gray-600">{appointment.reason}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-4">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Clinical Notes</h3>
                  {appointment.notes ? (
                    <p className="text-gray-600 whitespace-pre-line">{appointment.notes}</p>
                  ) : (
                    <p className="text-gray-400 italic">No notes added yet</p>
                  )}
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto mt-2 text-primary"
                    onClick={() => setShowNotesDialog(true)}
                  >
                    {appointment.notes ? "Edit Notes" : "Add Notes"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Manage Appointment</CardTitle>
              <CardDescription>
                Update status or add notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select 
                  value={newStatus} 
                  onValueChange={setNewStatus}
                  disabled={appointment.status === 'cancelled'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full"
                onClick={handleStatusChange}
                disabled={isUpdating || newStatus === appointment.status || appointment.status === 'cancelled'}
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Separator />
              
              <div className="flex flex-col w-full space-y-2">
                <Button
                  className="w-full"
                  variant={appointment.status === 'completed' ? "secondary" : "default"}
                  disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                  onClick={() => {
                    if (appointment.status !== 'completed') {
                      setNewStatus('completed');
                      handleStatusChange();
                    }
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {appointment.status === 'completed' ? 'Appointment Completed' : 'Mark as Completed'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clinical Notes</DialogTitle>
            <DialogDescription>
              Add or update clinical notes for this appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Enter clinical notes here..." 
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 