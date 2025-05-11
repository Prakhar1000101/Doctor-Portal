'use client';

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';

export type Medicine = {
  id?: string;
  name: string;
  createdAt?: Date;
  usageCount?: number;
};

// Add a new medicine to the database
export const addMedicine = async (name: string) => {
  try {
    // Check if medicine already exists
    const existingMedicine = await getMedicineByName(name);
    if (existingMedicine) {
      return existingMedicine.id;
    }

    const medicineRef = await addDoc(collection(db, 'medicines'), {
      name: name.trim(),
      createdAt: Timestamp.now(),
      usageCount: 1
    });
    
    return medicineRef.id;
  } catch (error: any) {
    console.error('Error adding medicine:', error);
    throw new Error(error.message);
  }
};

// Get medicine by exact name
export const getMedicineByName = async (name: string) => {
  try {
    const medicinesQuery = query(
      collection(db, 'medicines'),
      where('name', '==', name.trim())
    );
    
    const medicineSnapshot = await getDocs(medicinesQuery);
    
    if (medicineSnapshot.empty) {
      return null;
    }
    
    const doc = medicineSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Medicine;
  } catch (error: any) {
    console.error('Error getting medicine by name:', error);
    throw new Error(error.message);
  }
};

// Search medicines by partial name
export const searchMedicines = async (searchTerm: string, maxResults: number = 10) => {
  try {
    console.log('Searching for medicines with term:', searchTerm);
    
    // Simple query that should work without complex indexes
    const medicinesQuery = query(
      collection(db, 'medicines'),
      orderBy('name'),
      limit(maxResults)
    );
    
    const medicineSnapshot = await getDocs(medicinesQuery);
    console.log('Found medicines:', medicineSnapshot.size);
    
    // Filter results in JavaScript
    const results = medicineSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Medicine))
      .filter(med => 
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    console.log('Filtered results:', results);
    return results;
  } catch (error: any) {
    console.error('Error searching medicines:', error);
    throw new Error(error.message);
  }
}; 