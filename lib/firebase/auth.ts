'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,  // Add this import
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import axios from 'axios';

// Sign up a new user
export const signUp = async (name: string, email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const uid = userCredential.user?.uid;
    if (!uid) {
      throw new Error('Failed to retrieve user ID');
    }

    // Retry logic for Firestore write
    let retries = 3;
    while (retries > 0) {
      try {
        await setDoc(doc(db, 'users', uid), {
          name,
          email,
          role: null,
          createdAt: new Date().toISOString(),
        }, { merge: true });
        break; // Success, exit the retry loop
      } catch (firestoreError: any) {
        retries--;
        if (retries === 0) {
          console.error('Firestore write failed after retries:', firestoreError);
          throw new Error('Failed to save user data. Please try again later.');
        }
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return userCredential.user;
  } catch (error: any) {
    console.error('Sign up error:', error);
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please contact support.');
    }
    throw new Error(error.message || 'Failed to sign up');
  }
};

// Sign in existing user
export async function signIn(email: string, password: string) {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    console.log('Signing in with:', { email, password }); // Debug log

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyD6H2_RgyeFNFeRuKY03G2lGjzopikvZ68`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Firebase signIn error:', error.response?.data || error.message);

    // Handle Firebase error codes
    const errorCode = error.response?.data?.error?.message;
    switch (errorCode) {
      case 'EMAIL_NOT_FOUND':
        throw new Error('No account found with this email');
      case 'INVALID_PASSWORD':
        throw new Error('Incorrect password');
      case 'USER_DISABLED':
        throw new Error('This account has been disabled');
      default:
        throw new Error(errorCode || 'Failed to sign in');
    }
  }
}

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Set user role
export const setUserRole = async (userId: string, role: 'reception' | 'doctor') => {
  try {
    await setDoc(doc(db, 'users', userId), { role }, { merge: true });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get user role
export const getUserRole = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Verify security code
export const verifySecurityCode = async (code: string, role: 'reception' | 'doctor') => {
  try {
    const securityDoc = await getDoc(doc(db, 'security', 'role_security'));
    if (!securityDoc.exists()) {
      throw new Error('Security codes not configured');
    }

    const securityData = securityDoc.data();
    return securityData[role] === code;
  } catch (error: any) {
    console.error('Error verifying security code:', error);
    return false;
  }
};