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

export type Patient = {
  id?: string;
  fullName: string;
  name?: string;
  email?: string;
  phone: string;
  dateOfBirth?: Date;
  age?: number;
  address: string;
  medicalHistory?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  createdAt?: string;
  gender?: string;
  guardian?: string;
  bloodGroup?: string;
  notes?: string;
};

// Add a new patient
export const addPatient = async (patientData: Patient) => {
  try {
    const patientRef = await addDoc(collection(db, 'patients'), {
      ...patientData,
      // Only convert dateOfBirth to Timestamp if it exists
      ...(patientData.dateOfBirth && { 
        dateOfBirth: Timestamp.fromDate(patientData.dateOfBirth) 
      }),
      createdAt: Timestamp.now()
    });
    
    return patientRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Update a patient
export const updatePatient = async (patientId: string, patientData: Partial<Patient>) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    
    // Convert date of birth to Timestamp if it exists
    const updateData = { ...patientData };
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = Timestamp.fromDate(updateData.dateOfBirth);
    }
    
    await updateDoc(patientRef, updateData);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Delete a patient
export const deletePatient = async (patientId: string) => {
  try {
    await deleteDoc(doc(db, 'patients', patientId));
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get a patient by ID
export const getPatient = async (patientId: string) => {
  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    
    if (!patientDoc.exists()) {
      throw new Error('Patient not found');
    }
    
    const data = patientDoc.data();
    
    return {
      id: patientDoc.id,
      ...data,
      dateOfBirth: data.dateOfBirth?.toDate(),
      createdAt: data.createdAt?.toDate().toISOString()
    } as Patient;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all patients
export const getAllPatients = async () => {
  try {
    const patientsQuery = query(
      collection(db, 'patients'),
      orderBy('name', 'asc')
    );
    
    const patientSnapshot = await getDocs(patientsQuery);
    
    return patientSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Handle potential field name differences
        fullName: data.name || data.fullName, // Support both field names
        // Only process dateOfBirth if it exists as a Timestamp
        ...(data.dateOfBirth && { dateOfBirth: data.dateOfBirth.toDate() }),
        // Ensure createdAt is properly formatted if it exists as a Timestamp
        ...(data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? { createdAt: data.createdAt.toDate().toISOString() }
          : {}) // Otherwise keep as is (might be a string already)
      };
    });
  } catch (error: any) {
    console.error('Error fetching patients:', error);
    return []; // Return empty array instead of throwing, to prevent dashboard crashes
  }
};

// Search patients
export const searchPatients = async (searchTerm: string) => {
  try {
    // Get all patients (Firestore doesn't support direct text search)
    const patients = await getAllPatients();
    
    // Filter patients by search term
    return patients.filter(patient => {
      const fullName = patient.fullName.toLowerCase();
      const phone = patient.phone;
      const email = patient.email?.toLowerCase() || '';
      
      const term = searchTerm.toLowerCase();
      
      return (
        fullName.includes(term) || 
        phone.includes(term) || 
        email.includes(term)
      );
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get raw patient data for debugging
export const getRawPatients = async () => {
  try {
    const patientsQuery = query(
      collection(db, 'patients')
    );
    
    const patientSnapshot = await getDocs(patientsQuery);
    
    return patientSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    console.error('Error fetching raw patients:', error);
    return [];
  }
};