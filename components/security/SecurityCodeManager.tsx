'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateSecurityCodes } from '@/lib/firebase/security';
import { auth } from '@/lib/firebase/config';
import { toast } from 'sonner';

const securityCodeSchema = z.object({
  receptionCode: z.string().min(6, 'Security code must be at least 6 characters'),
  doctorCode: z.string().min(6, 'Security code must be at least 6 characters'),
});

type SecurityCodeFormValues = z.infer<typeof securityCodeSchema>;

export default function SecurityCodeManager() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SecurityCodeFormValues>({
    resolver: zodResolver(securityCodeSchema),
    defaultValues: {
      receptionCode: '',
      doctorCode: '',
    },
  });

  const onSubmit = async (data: SecurityCodeFormValues) => {
    if (!auth.currentUser) {
      toast.error('You must be logged in to update security codes');
      return;
    }

    try {
      setIsLoading(true);
      await updateSecurityCodes(
        {
          reception: data.receptionCode,
          doctor: data.doctorCode,
        },
        auth.currentUser.uid
      );
      toast.success('Security codes updated successfully');
      form.reset();
    } catch (error: any) {
      console.error('Error updating security codes:', error);
      toast.error('Failed to update security codes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Security Codes</CardTitle>
        <CardDescription>
          Set new security codes for role verification. Make sure to communicate these changes to the relevant staff members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="receptionCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reception Security Code</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new reception security code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="doctorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor Security Code</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new doctor security code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Security Codes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 