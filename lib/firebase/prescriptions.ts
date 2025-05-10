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

export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

export type Prescription = {
  id?: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  appointmentId: string;
  diagnosis: string;
  medications: Medication[];
  notes?: string;
  followUp?: Date | null;
  createdAt?: string;
};

// Add a new prescription
export const addPrescription = async (prescriptionData: Omit<Prescription, 'createdAt'>) => {
  try {
    const prescriptionRef = await addDoc(collection(db, 'prescriptions'), {
      ...prescriptionData,
      followUp: prescriptionData.followUp ? Timestamp.fromDate(prescriptionData.followUp) : null,
      createdAt: Timestamp.now()
    });
    
    return prescriptionRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Update a prescription
export const updatePrescription = async (prescriptionId: string, prescriptionData: Partial<Prescription>) => {
  try {
    const prescriptionRef = doc(db, 'prescriptions', prescriptionId);
    
    // Convert followUp date to Timestamp if it exists
    const updateData = { ...prescriptionData };
    if (updateData.followUp) {
      updateData.followUp = Timestamp.fromDate(updateData.followUp);
    }
    
    await updateDoc(prescriptionRef, updateData);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Delete a prescription
export const deletePrescription = async (prescriptionId: string) => {
  try {
    await deleteDoc(doc(db, 'prescriptions', prescriptionId));
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get a prescription by ID
export const getPrescription = async (prescriptionId: string) => {
  try {
    const prescriptionDoc = await getDoc(doc(db, 'prescriptions', prescriptionId));
    
    if (!prescriptionDoc.exists()) {
      throw new Error('Prescription not found');
    }
    
    const data = prescriptionDoc.data();
    
    return {
      id: prescriptionDoc.id,
      ...data,
      followUp: data.followUp ? data.followUp.toDate() : null,
      createdAt: data.createdAt.toDate().toISOString()
    } as Prescription;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all prescriptions for a specific patient
export const getPrescriptionsByPatient = async (patientId: string) => {
  try {
    const prescriptionsQuery = query(
      collection(db, 'prescriptions'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    
    const prescriptionSnapshot = await getDocs(prescriptionsQuery);
    
    return prescriptionSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        followUp: data.followUp ? data.followUp.toDate() : null,
        createdAt: data.createdAt.toDate().toISOString()
      } as Prescription;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all prescriptions for a specific doctor
export const getPrescriptionsByDoctor = async (doctorId: string) => {
  try {
    const prescriptionsQuery = query(
      collection(db, 'prescriptions'),
      where('doctorId', '==', doctorId),
      orderBy('createdAt', 'desc')
    );
    
    const prescriptionSnapshot = await getDocs(prescriptionsQuery);
    
    return prescriptionSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        followUp: data.followUp ? data.followUp.toDate() : null,
        createdAt: data.createdAt.toDate().toISOString()
      } as Prescription;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get prescription by appointment
export const getPrescriptionByAppointment = async (appointmentId: string) => {
  try {
    const prescriptionsQuery = query(
      collection(db, 'prescriptions'),
      where('appointmentId', '==', appointmentId)
    );
    
    const prescriptionSnapshot = await getDocs(prescriptionsQuery);
    
    if (prescriptionSnapshot.empty) {
      return null;
    }
    
    const doc = prescriptionSnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      followUp: data.followUp ? data.followUp.toDate() : null,
      createdAt: data.createdAt.toDate().toISOString()
    } as Prescription;
  } catch (error: any) {
    throw new Error(error.message);
  }
};