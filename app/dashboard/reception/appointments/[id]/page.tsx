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
  CheckCircle2,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { getAppointment, updateAppointmentStatus, deleteAppointment } from '@/lib/firebase/appointments';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
          await fetchAppointment();
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

  const fetchAppointment = async () => {
    try {
      setIsLoading(true);
      const appointmentData = await getAppointment(params.id);
      setAppointment(appointmentData);
      setNewStatus(appointmentData.status);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === appointment.status) return;

    try {
      setIsUpdating(true);
      await updateAppointmentStatus(params.id, newStatus as any);
      toast.success('Appointment status updated');
      
      // Update local state to reflect the change
      setAppointment({
        ...appointment,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      await deleteAppointment(params.id);
      toast.success('Appointment deleted successfully');
      router.push('/dashboard/reception/appointments');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setIsUpdating(false);
      setShowDeleteDialog(false);
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
          <Link href="/dashboard/reception/appointments" className="mr-4">
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
              <Link href="/dashboard/reception/appointments">
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
        <Link href="/dashboard/reception/appointments" className="mr-4">
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
                  <p className="text-gray-600">{appointment.patientName}</p>
                  <Link href={`/dashboard/reception/patients/${appointment.patientId}`}>
                    <Button variant="link" className="p-0 h-auto text-primary">
                      View Patient Profile
                    </Button>
                  </Link>
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

              {appointment.notes && (
                <>
                  <Separator />
                  <div className="flex items-start space-x-4">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Additional Notes</h3>
                      <p className="text-gray-600">{appointment.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Manage Appointment</CardTitle>
              <CardDescription>
                Update status or cancel this appointment
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
                  variant="outline"
                  className="w-full"
                  disabled={appointment.status === 'cancelled'}
                  onClick={() => router.push(`/dashboard/reception/appointments/edit/${params.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Appointment
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={appointment.status === 'cancelled'}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Appointment
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to delete this appointment?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the appointment record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isUpdating}>
              {isUpdating ? 'Deleting...' : 'Delete Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 