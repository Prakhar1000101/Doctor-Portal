import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ClipboardCheck,
  UserPlus,
  FileText,
  Shield
} from 'lucide-react';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.jpg"
            alt="Hospital Background"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Streamline Your Clinic Management
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              A comprehensive solution for appointment scheduling, patient management, and prescription handling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg">
                  Get Started
                </Button>
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform offers a complete suite of tools designed to modernize and streamline clinic operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-gray-600">
                Efficiently manage appointments with our intuitive calendar interface. Book, reschedule, and manage patient visits with ease.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <UserPlus className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Patient Management</h3>
              <p className="text-gray-600">
                Maintain comprehensive patient records, including medical history, contact information, and insurance details.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Digital Prescriptions</h3>
              <p className="text-gray-600">
                Create, manage, and print professional prescriptions. Add medications, dosages, and special instructions with ease.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <ClipboardCheck className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Role-Based Access</h3>
              <p className="text-gray-600">
                Separate portals for reception staff and doctors, ensuring the right people have access to the right information.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Data Management</h3>
              <p className="text-gray-600">
                Your data is secure with our robust authentication system and role-based security measures.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">Email Notifications</h3>
              <p className="text-gray-600">
                Automated email notifications for appointments, reminders, and important updates to keep everyone informed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Healthcare professionals trust our platform to streamline their clinic operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden mr-4">
                  <Image
                    src="https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg"
                    alt="Dr. Sarah Johnson"
                    width={48}
                    height={48}
                  />
                </div>
                <div>
                  <h4 className="font-bold">Dr. Sarah Johnson</h4>
                  <p className="text-gray-500 text-sm">Primary Care Physician</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "This system has completely transformed how we manage patient appointments and records. The intuitive interface saves us hours every week."
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden mr-4">
                  <Image
                    src="https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg"
                    alt="Rebecca Chen"
                    width={48}
                    height={48}
                  />
                </div>
                <div>
                  <h4 className="font-bold">Rebecca Chen</h4>
                  <p className="text-gray-500 text-sm">Clinic Manager</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "The reception module is perfect for our busy clinic. Patient check-ins are smoother, and we can easily track appointment status throughout the day."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gray-50 p-8 rounded-xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden mr-4">
                  <Image
                    src="https://images.pexels.com/photos/6749773/pexels-photo-6749773.jpeg"
                    alt="Dr. Michael Patel"
                    width={48}
                    height={48}
                  />
                </div>
                <div>
                  <h4 className="font-bold">Dr. Michael Patel</h4>
                  <p className="text-gray-500 text-sm">Cardiologist</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "The prescription module is fantastic. Creating detailed medication instructions is quick, and patients appreciate the clear, professional format."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Clinic Management?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join healthcare professionals who are using our platform to streamline their operations and improve patient care.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}