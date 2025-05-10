import React from 'react';
import Link from 'next/link';
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">HUB THE SOLUTION</h3>
            <p className="text-gray-400 mb-4">
              Advancing healthcare management through innovative digital solutions.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/signin"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/signup"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-2">
                <MdEmail className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                <a
                  href="mailto:info@hubthesolution.com"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  hubthesolutions@gmail.com
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MdPhone className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                <a
                  href="tel:+91-82692-62025"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  +91-82692-62025
                </a>
              </li>
              <li className="flex items-start space-x-2">
                <MdLocationOn className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                <span className="text-gray-400 max-w-xs">
                  227, Dhan Trident, Vijay Nagar Indore 452010(M.P)
                </span>
              </li>
            </ul>
          </div>

          <div className="md:ml-auto">
            <h3 className="text-xl font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; {currentYear} HUB THE SOLUTION. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;