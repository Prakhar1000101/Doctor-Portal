'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2Icon, Stethoscope } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<'reception' | 'doctor' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in, redirect to sign in
        router.push('/auth/signin');
        return;
      }

      // Check if user already has a role
      try {
        const userRole = await getUserRole(user.uid);
        if (userRole === 'reception' || userRole === 'doctor') {
          // User already has a role, redirect to their dashboard
          router.push(`/dashboard/${userRole}`);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRoleSelect = async (role: 'reception' | 'doctor') => {
    setSelectedRole(role);

    if (auth.currentUser) {
      try {
        // Don't set the role yet, just redirect to security code page
        router.push(`/auth/security-code?role=${role}`);
      } catch (error: any) {
        toast.error('Failed to process role selection');
        setSelectedRole(null);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Select Your Role</h1>
          <p className="mt-2 text-gray-600">
            Choose the appropriate role for your responsibilities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Reception Role */}
          <div
            className={`border rounded-xl p-6 text-center cursor-pointer transition-all hover:shadow-md ${selectedRole === 'reception' ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-gray-200'
              }`}
            onClick={() => handleRoleSelect('reception')}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle2Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Reception</h2>
            <p className="text-gray-500 text-sm mb-4">
              Manage appointments and patient records
            </p>
            <Button
              variant={selectedRole === 'reception' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handleRoleSelect('reception')}
            >
              Select
            </Button>
          </div>

          {/* Doctor Role */}
          <div
            className={`border rounded-xl p-6 text-center cursor-pointer transition-all hover:shadow-md ${selectedRole === 'doctor' ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'border-gray-200'
              }`}
            onClick={() => handleRoleSelect('doctor')}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Doctor</h2>
            <p className="text-gray-500 text-sm mb-4">
              Access patient consultations and prescriptions
            </p>
            <Button
              variant={selectedRole === 'doctor' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handleRoleSelect('doctor')}
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}