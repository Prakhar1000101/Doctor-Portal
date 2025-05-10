'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { verifySecurityCode, getUserRole, setUserRole } from '@/lib/firebase/auth';
import { securityCodeSchema } from '@/lib/utils/validators';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type FormValues = z.infer<typeof securityCodeSchema>;

export default function SecurityCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams?.get('role') as 'reception' | 'doctor' | null;
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in, redirect to sign in
        router.push('/auth/signin');
        return;
      }

      if (!role) {
        router.push('/auth/role-selection');
        return;
      }

      // Check if user already has this role assigned and verified
      try {
        const userRole = await getUserRole(user.uid);
        // If user already has this role (already passed security), send them to dashboard
        if (userRole === role) {
          router.push(`/dashboard/${role}`);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    });

    return () => unsubscribe();
  }, [router, role]);

  const form = useForm<FormValues>({
    resolver: zodResolver(securityCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!role || !auth.currentUser) return;

    try {
      setIsLoading(true);

      const isValid = verifySecurityCode(data.code, role);

      if (isValid) {
        // Set the role only after successful verification
        await setUserRole(auth.currentUser.uid, role);
        toast.success('Security code verified!');
        router.push(`/dashboard/${role}`);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          toast.error('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            router.push('/auth/role-selection');
          }, 2000);
        } else {
          toast.error(`Invalid security code. ${3 - newAttempts} attempts remaining.`);
          form.reset();
        }
      }
    } catch (error) {
      console.error('Error during security verification:', error);
      toast.error('Failed to verify security code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    router.push('/auth/role-selection');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold">Security Verification</h1>
          <p className="mt-2 text-gray-600">
            Enter the security code for {role === 'reception' ? 'Reception' : 'Doctor'} access
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter security code"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="w-full flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Role Selection
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}