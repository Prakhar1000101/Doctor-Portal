'use client';

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './config';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'reception' | null;
  createdAt: string;
  specialty?: string; // For doctors
  phoneNumber?: string;
};

// Get a user by ID
export const getUser = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const data = userDoc.data();
    
    return {
      id: userDoc.id,
      ...data,
      createdAt: data.createdAt
    } as User;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get all doctors
export const getAllDoctors = async () => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'doctor'),
      orderBy('name', 'asc')
    );
    
    const userSnapshot = await getDocs(usersQuery);
    
    return userSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: typeof data.createdAt === 'string' 
          ? data.createdAt 
          : data.createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as User;
    });
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return []; // Return empty array on error
  }
};

// Get all users by role
export const getUsersByRole = async (role: 'doctor' | 'reception') => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', role),
      orderBy('name', 'asc')
    );
    
    const userSnapshot = await getDocs(usersQuery);
    
    return userSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: typeof data.createdAt === 'string' 
          ? data.createdAt 
          : data.createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as User;
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}; 