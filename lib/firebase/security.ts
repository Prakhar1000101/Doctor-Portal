import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

const SECURITY_DOC_ID = 'role_security';

export type SecurityCodes = {
  reception: string;
  doctor: string;
  lastUpdated: Date;
  lastUpdatedBy: string;
};

// Get security codes
export const getSecurityCodes = async () => {
  try {
    const securityDoc = await getDoc(doc(db, 'security', SECURITY_DOC_ID));
    if (!securityDoc.exists()) {
      throw new Error('Security codes not found');
    }
    return securityDoc.data() as SecurityCodes;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Update security codes
export const updateSecurityCodes = async (
  newCodes: { reception?: string; doctor?: string },
  userId: string
) => {
  try {
    const securityRef = doc(db, 'security', SECURITY_DOC_ID);
    const existingDoc = await getDoc(securityRef);
    
    const updatedData = {
      ...(existingDoc.exists() ? existingDoc.data() : {}),
      ...newCodes,
      lastUpdated: new Date(),
      lastUpdatedBy: userId
    };

    await setDoc(securityRef, updatedData);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}; 