'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  Home, 
  ClipboardList, 
  ChevronDown,
  ChevronRight,
  User,
  PlusCircle,
  FileText,
  Menu,
  X,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserRole } from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

type SidebarItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
  subItems?: SidebarItem[];
};

type SidebarContentProps = {
  userRole: string | null;
  sidebarItems: SidebarItem[];
  expanded: { [key: string]: boolean };
  toggleExpand: (label: string) => void;
  pathname: string | null;
  setIsMobileMenuOpen: (state: boolean) => void;
};

const SidebarContent: React.FC<SidebarContentProps> = ({ 
  userRole, 
  sidebarItems, 
  expanded, 
  toggleExpand, 
  pathname, 
  setIsMobileMenuOpen 
}) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-primary">
        {userRole === 'reception' ? 'Reception Portal' : 'Doctor Portal'}
      </h2>
    </div>
    
    <nav className="flex-1 py-4 overflow-y-auto">
      <ul className="space-y-1 px-2">
        {sidebarItems.map((item) => (
          <li key={item.label}>
            {item.subItems ? (
              <div>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted group transition-colors",
                    expanded[item.label] ? "bg-muted" : "",
                    pathname?.startsWith(item.href) ? "bg-muted text-primary font-medium" : "text-gray-700"
                  )}
                  onClick={() => toggleExpand(item.label)}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-gray-500 group-hover:text-primary">{item.icon}</span>
                    {item.label}
                  </div>
                  {expanded[item.label] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                
                {expanded[item.label] && (
                  <ul className="mt-1 space-y-1 pl-9">
                    {item.subItems.map((subItem) => (
                      <li key={subItem.label}>
                        <Link
                          href={subItem.href}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors",
                            pathname === subItem.href || 
                            (pathname?.includes(subItem.href) && 
                              subItem.href !== '/dashboard/reception' && 
                              subItem.href !== '/dashboard/doctor')
                              ? "bg-muted text-primary font-medium"
                              : "text-gray-700"
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm hover:bg-muted group transition-colors",
                  pathname === item.href || 
                  (pathname?.includes(item.href) && 
                    item.href !== '/dashboard/reception' && 
                    item.href !== '/dashboard/doctor')
                    ? "bg-muted text-primary font-medium"
                    : "text-gray-700"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-3 text-gray-500 group-hover:text-primary">{item.icon}</span>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  </div>
);

const DashboardSidebar = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  // Auto-expand sections based on current path
  useEffect(() => {
    if (pathname) {
      // Create initial expanded state
      const initialExpanded: { [key: string]: boolean } = {};
      
      // Check reception items
      if (pathname.includes('/dashboard/reception/patients')) {
        initialExpanded['Patients'] = true;
      }
      
      if (pathname.includes('/dashboard/reception/appointments')) {
        initialExpanded['Appointments'] = true;
      }
      
      // Set the expanded state
      setExpanded(prev => ({
        ...prev,
        ...initialExpanded
      }));
    }
  }, [pathname]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        try {
          const role = await getUserRole(user.uid);
          console.log('🔵 [Sidebar] User role detected:', role);
          setUserRole(role);
        } catch (error) {
          console.error('❌ [Sidebar] Error fetching user role:', error);
        }
      } else {
        console.log('❌ [Sidebar] No authenticated user found');
        setUserRole(null);
      }
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const receptionItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      icon: <Home size={18} />,
      href: '/dashboard/reception',
    },
    {
      label: 'My Patients',
      icon: <Users size={18} />,
      href: '/dashboard/reception/patients',
    },
    {
      label: 'Appointments',
      icon: <Calendar size={18} />,
      href: '/dashboard/reception/appointments',
      subItems: [
        {
          label: 'All Appointments',
          icon: <ClipboardList size={18} />,
          href: '/dashboard/reception/appointments',
        },
        {
          label: 'Book Appointment',
          icon: <PlusCircle size={18} />,
          href: '/dashboard/reception/appointments/book',
        },
      ],
    },
  ];
  
  const doctorItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      icon: <Home size={18} />,
      href: '/dashboard/doctor',
    },
    {
      label: 'My Patients',
      icon: <Users size={18} />,
      href: '/dashboard/doctor/patients',
    },
    {
      label: 'Appointments',
      icon: <Calendar size={18} />,
      href: '/dashboard/doctor/appointments',
    },
    {
      label: 'Prescriptions',
      icon: <FileText size={18} />,
      href: '/dashboard/doctor/prescriptions',
    },
    {
      label: 'Security',
      icon: <Lock size={18} />,
      href: '/dashboard/doctor/security',
    },
  ];
  
  // Determine sidebar items based on role
  const sidebarItems = userRole === 'doctor' ? doctorItems : 
                      userRole === 'reception' ? receptionItems :
                      [];
  
  // Add logging for debugging
  console.log('🔍 [Sidebar] Current user role:', userRole);
  console.log('🔍 [Sidebar] Loading state:', isLoading);
  console.log('🔍 [Sidebar] Number of sidebar items:', sidebarItems.length);
  
  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Loading state UI
  if (isLoading) {
    return (
      <>
        {/* Mobile Toggle Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            className="p-2 bg-white rounded-md shadow-md"
            disabled
          >
            <Menu size={20} />
          </button>
        </div>
        
        {/* Desktop Loading Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-gray-200 h-screen overflow-y-auto fixed top-0 left-0 bg-white">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  }
  
  // Don't render anything if no role is set (after loading)
  if (!isLoading && !userRole) {
    return null;
  }
  
  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-2 bg-white rounded-md shadow-md"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-gray-200 h-screen overflow-y-auto fixed top-0 left-0 bg-white">
        <SidebarContent 
          userRole={userRole}
          sidebarItems={sidebarItems}
          expanded={expanded}
          toggleExpand={toggleExpand}
          pathname={pathname}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </aside>
      
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={toggleMobileMenu}></div>
          <aside className="absolute top-0 left-0 w-64 h-full bg-white shadow-xl">
            <SidebarContent 
              userRole={userRole}
              sidebarItems={sidebarItems}
              expanded={expanded}
              toggleExpand={toggleExpand}
              pathname={pathname}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          </aside>
        </div>
      )}
    </>
  );
};

export default DashboardSidebar;