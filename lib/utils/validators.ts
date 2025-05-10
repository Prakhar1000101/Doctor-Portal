import { z } from 'zod';

// User authentication schemas
export const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions" })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Please enter your password" }),
  rememberMe: z.boolean().optional()
});

export const securityCodeSchema = z.object({
  code: z.string().min(1, { message: "Security code is required" })
});

// Patient schemas
export const patientSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  dateOfBirth: z.date({ required_error: "Date of birth is required" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  medicalHistory: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional()
});

// Appointment schemas
export const appointmentSchema = z.object({
  patientId: z.string().min(1, { message: "Patient selection is required" }),
  doctorId: z.string().min(1, { message: "Doctor selection is required" }),
  date: z.date({ required_error: "Date is required" }),
  time: z.string().min(1, { message: "Time is required" }),
  reason: z.string().min(1, { message: "Reason for appointment is required" }),
  notes: z.string().optional()
});

// Prescription schemas
export const medicationSchema = z.object({
  name: z.string().min(1, { message: "Medication name is required" }),
  dosage: z.string().min(1, { message: "Dosage is required" }),
  frequency: z.string().min(1, { message: "Frequency is required" }),
  duration: z.string().min(1, { message: "Duration is required" })
});

export const prescriptionSchema = z.object({
  diagnosis: z.string().min(1, { message: "Diagnosis is required" }),
  medications: z.array(medicationSchema).min(1, { message: "At least one medication is required" }),
  notes: z.string().optional(),
  followUp: z.date().optional().nullable()
});