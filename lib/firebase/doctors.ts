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
  orderBy 
} from 'firebase/firestore';
import { db } from './config';

export type Doctor = {
  id?: string;
  userId: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
};

// Get all doctors
export const getAllDoctors = async () => {
  try {
    const doctorsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'doctor'),
      orderBy('name', 'asc')
    );
    
    const doctorSnapshot = await getDocs(doctorsQuery);
    
    return doctorSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: doc.id,
        name: data.name,
        specialization: data.specialization || '',
        email: data.email,
        phone: data.phone || ''
      } as Doctor;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get doctor by user ID
export const getDoctorByUserId = async (userId: string) => {
  try {
    const doctorDoc = await getDoc(doc(db, 'users', userId));
    
    if (!doctorDoc.exists() || doctorDoc.data().role !== 'doctor') {
      throw new Error('Doctor not found');
    }
    
    const data = doctorDoc.data();
    
    return {
      id: doctorDoc.id,
      userId: doctorDoc.id,
      name: data.name,
      specialization: data.specialization || '',
      email: data.email,
      phone: data.phone || ''
    } as Doctor;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Update doctor profile
export const updateDoctorProfile = async (userId: string, profileData: Partial<Omit<Doctor, 'id' | 'userId'>>) => {
  try {
    const doctorRef = doc(db, 'users', userId);
    await updateDoc(doctorRef, profileData);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
};