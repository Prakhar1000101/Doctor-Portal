'use client';

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { format } from 'date-fns';

export type Appointment = {
  id?: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  date: Date;
  time: string;
  reason: string;
  notes?: string;
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled';
  createdAt?: string;
};

// Add a new appointment
export const addAppointment = async (appointmentData: Omit<Appointment, 'status' | 'createdAt'>) => {
  try {
    const appointmentRef = await addDoc(collection(db, 'appointments'), {
      ...appointmentData,
      date: Timestamp.fromDate(appointmentData.date),
      status: 'scheduled',
      createdAt: Timestamp.now()
    });
    
    return appointmentRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Update an appointment
export const updateAppointment = async (appointmentId: string, appointmentData: Partial<Appointment>) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    
    // Convert date to Timestamp if it exists
    // Use 'any' type to avoid the TypeScript error with Timestamp
    const updateData: any = { ...appointmentData };
    if (updateData.date) {
      updateData.date = Timestamp.fromDate(updateData.date);
    }
    
    await updateDoc(appointmentRef, updateData);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Delete an appointment
export const deleteAppointment = async (appointmentId: string) => {
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId));
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get an appointment by ID
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    
    if (!appointmentDoc.exists()) {
      throw new Error('Appointment not found');
    }
    
    const data = appointmentDoc.data();
    
    return {
      id: appointmentDoc.id,
      ...data,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate().toISOString()
    } as Appointment;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all appointments for a specific date
export const getAppointmentsByDate = async (date: Date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date'),
      orderBy('time')
    );
    
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    
    return appointmentSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate().toISOString()
      } as Appointment;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all appointments for a specific doctor
export const getAppointmentsByDoctor = async (doctorId: string, date?: Date) => {
  try {
    let appointmentsQuery;
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('date'),
        orderBy('time')
      );
    } else {
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        orderBy('date'),
        orderBy('time')
      );
    }
    
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    
    return appointmentSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date.toDate(),
        createdAt: data.createdAt.toDate().toISOString()
      } as Appointment;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all appointments for a specific patient
export const getAppointmentsByPatient = async (patientId: string) => {
  try {
    console.log('🔵 Getting appointments for patient ID:', patientId);
    
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('patientId', '==', patientId),
      orderBy('date', 'desc'),
      orderBy('time')
    );
    
    console.log('🔵 Query created, attempting to get documents...');
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    
    console.log(`✅ Retrieved ${appointmentSnapshot.docs.length} appointments for this patient`);
    
    const results = appointmentSnapshot.docs.map(doc => {
      const data = doc.data();
      try {
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString()
        } as Appointment;
      } catch (e) {
        console.error('❌ Error processing appointment document:', e);
        // Return a basic version with the current date as fallback
        return {
          id: doc.id,
          ...data,
          date: new Date(),
          createdAt: new Date().toISOString()
        } as Appointment;
      }
    });
    
    console.log('✅ Processed appointment data:', results);
    return results;
  } catch (error: any) {
    console.error('❌ Error fetching patient appointments:', error);
    
    // Check for index errors specifically
    if (error.message && error.message.includes('index')) {
      console.error('This appears to be a Firebase index error. Check Firebase console to create required index.');
      
      // Attempt a simpler query without orderBy as fallback
      try {
        console.log('🟡 Attempting fallback query without ordering...');
        const simpleQuery = query(
          collection(db, 'appointments'),
          where('patientId', '==', patientId)
        );
        
        const snapshot = await getDocs(simpleQuery);
        
        console.log(`✅ Fallback retrieved ${snapshot.docs.length} appointments`);
        
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString()
          } as Appointment;
        }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Manual sort
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
        return []; // Return empty array as last resort
      }
    }
    
    throw new Error(`Failed to get patient appointments: ${error.message}`);
  }
};

// Update appointment status
export const updateAppointmentStatus = async (
  appointmentId: string, 
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled'
) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, { status });
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all appointments - implement a safer approach that doesn't require a composite index
export const getAllAppointments = async () => {
  try {
    // Use a simple query that doesn't require a composite index
    const appointmentsRef = collection(db, 'appointments');
    const appointmentSnapshot = await getDocs(appointmentsRef);
    
    const appointments = appointmentSnapshot.docs.map(doc => {
      const data = doc.data();
      // Handle the date conversion safely
      let appointmentDate = new Date();
      try {
        if (data.date && typeof data.date.toDate === 'function') {
          appointmentDate = data.date.toDate();
        }
      } catch (e) {
        console.error('Error converting date:', e);
      }
      
      // Create the appointment object
      return {
        id: doc.id,
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        doctorId: data.doctorId || '',
        date: appointmentDate,
        time: data.time || '',
        reason: data.reason || '',
        notes: data.notes || '',
        status: data.status || 'scheduled'
      } as Appointment;
    });
    
    // Sort manually since we're not using Firebase ordering
    return appointments.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error: any) {
    console.error('Error fetching all appointments:', error);
    throw new Error('Failed to fetch appointments. Please try again later.');
  }
};

// Get appointment statistics
export const getAppointmentStats = async () => {
  try {
    // Get all appointments
    const appointments = await getAllAppointments();
    
    // Calculate statistics
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const waiting = appointments.filter(apt => 
      apt.status === 'scheduled' || 
      apt.status === 'checked-in' || 
      apt.status === 'in-progress'
    ).length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
    
    return {
      total,
      completed,
      waiting,
      cancelled,
    };
  } catch (error: any) {
    console.error('Error calculating appointment statistics:', error);
    // Return default values on error
    return {
      total: 0,
      completed: 0,
      waiting: 0,
      cancelled: 0,
    };
  }
};

// Get booked time slots for a specific date
export const getBookedTimeSlots = async (date: Date) => {
  try {
    console.log('🔵 Checking booked time slots for date:', format(date, 'yyyy-MM-dd'));
    
    // Prepare date range for the selected day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('🔵 Date range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });
    
    // Query all appointments for the selected date
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      // Only include active appointments (not cancelled ones)
      where('status', 'in', ['scheduled', 'checked-in', 'in-progress'])
    );
    
    console.log('🔵 Executing query for booked slots...');
    const appointmentSnapshot = await getDocs(appointmentsQuery);
    
    // Return the time slots from these appointments
    const bookedSlots = appointmentSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.time;
    });
    
    console.log(`✅ Found ${bookedSlots.length} booked time slots:`, bookedSlots);
    return bookedSlots;
  } catch (error: any) {
    console.error('❌ Error getting booked time slots:', error);
    
    // Try fallback approach if there's an issue with the composite index
    if (error.message && error.message.includes('index')) {
      console.log('🟡 Index error detected, using fallback approach...');
      try {
        // Fallback to a simpler query
        const simpleQuery = query(collection(db, 'appointments'));
        const snapshot = await getDocs(simpleQuery);
        
        // Filter manually
        const bookedSlots = snapshot.docs
          .map(doc => doc.data())
          .filter(data => {
            // Only consider active appointments
            if (!['scheduled', 'checked-in', 'in-progress'].includes(data.status)) {
              return false;
            }
            
            // Check if the date matches the requested date
            try {
              const appointmentDate = data.date.toDate();
              const appointmentDateString = format(appointmentDate, 'yyyy-MM-dd');
              const requestedDateString = format(date, 'yyyy-MM-dd');
              return appointmentDateString === requestedDateString;
            } catch (e) {
              console.error('❌ Error processing appointment date:', e);
              return false;
            }
          })
          .map(data => data.time);
          
        console.log(`✅ Fallback found ${bookedSlots.length} booked slots:`, bookedSlots);
        return bookedSlots;
      } catch (fallbackError) {
        console.error('❌ Fallback for getting booked slots failed:', fallbackError);
        return []; // Return empty array in case of error
      }
    }
    
    // Return empty array in case of any error
    return [];
  }
};