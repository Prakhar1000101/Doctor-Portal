'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { getDoctorByUserId } from '@/lib/firebase/doctors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from 'lucide-react';

type Doctor = {
  id: string;
  userId: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
};

type Patient = {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
};

type Medicine = {
  name: string;
  dosage: string;
  duration: string;
};

export default function PrescriptionsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '', duration: '' }]);
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: '',
    diagnosis: '',
    instructions: '',
    nextVisit: '',
    doctorNotes: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      try {
        setError(null);
        const role = await getUserRole(user.uid);
        if (role !== 'doctor') {
          toast.error('You do not have access to this page');
          router.push('/auth/role-selection');
          return;
        }

        // Get doctor info
        const doctorInfo = await getDoctorByUserId(user.uid);
        if (doctorInfo && doctorInfo.id) {
          setDoctor(doctorInfo as Doctor);
        }

        // Fetch patients list
        console.log('Fetching patients...');
        const patientsQuery = query(
          collection(db, 'patients'),
          orderBy('name', 'asc')
        );
        
        const patientsSnapshot = await getDocs(patientsQuery);
        console.log('Found patients:', patientsSnapshot.size);
        
        const patientsData = patientsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().fullName || 'Unknown',
          age: doc.data().age,
          gender: doc.data().gender,
          phone: doc.data().phone,
          email: doc.data().email,
        }));
        
        console.log('Processed patients data:', patientsData);
        setPatients(patientsData);
      } catch (error: any) {
        console.error('Error:', error);
        let errorMessage = 'Error loading data';
        
        if (error.code === 'failed-precondition' || 
            error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
            error.message?.includes('failed to fetch')) {
          errorMessage = 'Unable to connect to the database. This might be caused by an ad blocker or firewall. Please try:';
          setError(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setFormData(prev => ({
        ...prev,
        patientName: patient.name,
        patientAge: patient.age?.toString() || '',
        patientGender: patient.gender || '',
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicineChange = (index: number, field: keyof Medicine, value: string) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index] = { ...updatedMedicines[index], [field]: value };
    setMedicines(updatedMedicines);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      const updatedMedicines = medicines.filter((_, i) => i !== index);
      setMedicines(updatedMedicines);
    }
  };

  const generatePDF = () => {
    try {
      if (!selectedPatient || !doctor) {
        toast.error('Please select a patient first');
        return;
      }

      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add hospital logo/header with gradient background
      doc.setFillColor(44, 62, 80); // Dark blue
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Add hospital name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Hospital Clinic', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Healthcare Excellence', pageWidth / 2, 30, { align: 'center' });

      // Add doctor information box
      doc.setDrawColor(44, 62, 80);
      doc.setFillColor(244, 247, 250);
      doc.rect(10, 45, pageWidth - 20, 25, 'FD');
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(12);
      doc.text(doctor.name, 15, 55);
      doc.setFontSize(10);
      doc.text(doctor.specialization, 15, 62);
      doc.text(`Phone: ${doctor.phone}`, pageWidth - 60, 55);
      doc.text(`Email: ${doctor.email}`, pageWidth - 60, 62);

      // Add prescription title
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('PRESCRIPTION', pageWidth / 2, 85, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - 25, 85, { align: 'right' });

      // Add patient information with modern design
      doc.setFillColor(244, 247, 250);
      doc.rect(10, 95, pageWidth - 20, 30, 'F');
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(11);
      doc.text('Patient Information:', 15, 105);
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${formData.patientName}`, 20, 113);
      doc.text(`Age: ${formData.patientAge} years    Gender: ${formData.patientGender}`, 20, 120);

      // Add diagnosis section
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(11);
      doc.text('Diagnosis:', 15, 140);
      doc.setTextColor(0, 0, 0);
      const diagnosisLines = doc.splitTextToSize(formData.diagnosis, pageWidth - 40);
      doc.text(diagnosisLines, 20, 148);

      // Add medications using styled autoTable
      doc.setTextColor(44, 62, 80);
      doc.text('Medications:', 15, 170);
      
      // Format medicines for the table
      const medicationsData = medicines
        .filter(med => med.name.trim() !== '')
        .map(med => [`${med.name} - ${med.dosage} - ${med.duration}`]);
      
      autoTable(doc, {
        startY: 175,
        head: [['Medication - Dosage - Duration']],
        body: medicationsData,
        margin: { left: 15, right: 15 },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: [255, 255, 255],
          fontSize: 11
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [244, 247, 250]
        }
      });

      // Get the Y position after the table
      const finalY = (doc as any).lastAutoTable.finalY || 175;

      // Add instructions with background
      doc.setFillColor(244, 247, 250);
      doc.rect(10, finalY + 10, pageWidth - 20, 35, 'F');
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(11);
      doc.text('Instructions:', 15, finalY + 20);
      doc.setTextColor(0, 0, 0);
      const instructionLines = doc.splitTextToSize(formData.instructions, pageWidth - 40);
      doc.text(instructionLines, 20, finalY + 28);

      // Add next visit if specified
      let currentY = finalY + 55;
      if (formData.nextVisit) {
        doc.setTextColor(44, 62, 80);
        doc.text('Next Visit:', 15, currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(format(new Date(formData.nextVisit), 'dd/MM/yyyy'), 50, currentY);
        currentY += 15;
      }

      // Add doctor's notes if any
      if (formData.doctorNotes) {
        doc.setFillColor(244, 247, 250);
        doc.rect(10, currentY, pageWidth - 20, 30, 'F');
        doc.setTextColor(44, 62, 80);
        doc.text('Doctor\'s Notes:', 15, currentY + 10);
        doc.setTextColor(0, 0, 0);
        const noteLines = doc.splitTextToSize(formData.doctorNotes, pageWidth - 40);
        doc.text(noteLines, 20, currentY + 18);
        currentY += 40;
      }

      // Add signature section
      const signatureY = pageHeight - 50;
      doc.setDrawColor(44, 62, 80);
      doc.line(pageWidth - 80, signatureY, pageWidth - 20, signatureY);
      doc.setTextColor(44, 62, 80);
      doc.text(doctor.name, pageWidth - 50, signatureY + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.text(doctor.specialization, pageWidth - 50, signatureY + 12, { align: 'center' });

      // Add footer with gradient
      doc.setFillColor(44, 62, 80);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('Hospital Clinic Management System', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text('24/7 Emergency Contact: +1 234 567 890', pageWidth / 2, pageHeight - 6, { align: 'center' });

      // Save the PDF
      const fileName = `prescription_${formData.patientName.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      doc.save(fileName);
      
      toast.success('Prescription PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate prescription PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto pt-8 pb-16">
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <ul className="list-disc list-inside space-y-2 text-red-700">
              <li>Disabling your ad blocker for this site</li>
              <li>Checking your firewall settings</li>
              <li>Ensuring you have a stable internet connection</li>
              <li>Refreshing the page</li>
            </ul>
            <Button 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Generate Prescription</h1>
        <p className="text-gray-500 mt-1">Create and download prescription as PDF</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="mb-2">Prescription Form</CardTitle>
          <CardDescription>Fill in the prescription details to generate a PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); generatePDF(); }}>
            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientSelect">Select Patient</Label>
                  <Select 
                    defaultValue={selectedPatient?.id} 
                    onValueChange={handlePatientSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.length === 0 ? (
                        <SelectItem value="no-patients" disabled>
                          No patients found
                        </SelectItem>
                      ) : (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {patients.length === 0 && !isLoading && (
                    <p className="text-sm text-red-500 mt-1">
                      No patients available. Please add patients first.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    name="patientAge"
                    value={formData.patientAge}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Input
                    id="patientGender"
                    name="patientGender"
                    value={formData.patientGender}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Medications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <Button
                  type="button"
                  onClick={addMedicine}
                  className="flex items-center gap-2"
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> Add Medicine
                </Button>
              </div>
              <div className="space-y-4">
                {medicines.map((medicine, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <Label htmlFor={`medicine-name-${index}`}>Medicine Name</Label>
                      <Input
                        id={`medicine-name-${index}`}
                        value={medicine.name}
                        onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                        placeholder="Enter medicine name"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`medicine-dosage-${index}`}>Dosage</Label>
                      <Input
                        id={`medicine-dosage-${index}`}
                        value={medicine.dosage}
                        onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                        placeholder="e.g., 1-0-1"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`medicine-duration-${index}`}>Duration</Label>
                      <Input
                        id={`medicine-duration-${index}`}
                        value={medicine.duration}
                        onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                        placeholder="e.g., 7 days"
                        required
                      />
                    </div>
                    {medicines.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Next Visit - Made Optional */}
            <div className="space-y-2">
              <Label htmlFor="nextVisit">Next Visit (Optional)</Label>
              <Input
                id="nextVisit"
                name="nextVisit"
                type="date"
                value={formData.nextVisit}
                onChange={handleInputChange}
              />
            </div>

            {/* Doctor's Notes */}
            <div className="space-y-2">
              <Label htmlFor="doctorNotes">Doctor's Notes (Optional)</Label>
              <Textarea
                id="doctorNotes"
                name="doctorNotes"
                value={formData.doctorNotes}
                onChange={handleInputChange}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={!selectedPatient}
            >
              Generate Prescription PDF
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 