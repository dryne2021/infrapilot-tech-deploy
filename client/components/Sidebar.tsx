'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  UsersIcon, 
  BriefcaseIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  LogoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/outline';

interface SidebarProps {
  userRole: 'admin' | 'recruiter' | 'candidate';
}

const navigationItems = {
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Candidates', href: '/admin/candidates', icon: UserIcon },
    { name: 'Recruiters', href: '/admin/recruiters', icon: BriefcaseIcon },
    { name: 'Applications', href: '/admin/applications', icon: DocumentTextIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon },
  ],
  recruiter: [
    { name: 'Dashboard', href: '/recruiter/dashboard', icon: HomeIcon },
    { name: 'Candidates', href: '/recruiter/candidates', icon: UsersIcon },
    { name: 'Applications', href: '/recruiter/applications', icon: DocumentTextIcon },
    { name: 'New Application', href: '/recruiter/applications/new', icon: BriefcaseIcon },
    { name: 'Profile', href: '/recruiter/profile', icon: UserIcon },
  ],
  candidate: [
    { name: 'Dashboard', href: '/candidate/dashboard', icon: HomeIcon },
    { name: 'Applications', href: '/candidate/applications', icon: DocumentTextIcon },
    { name: 'Resumes', href: '/candidate/resumes', icon: DocumentTextIcon },
    { name: 'Profile', href: '/candidate/profile', icon: UserIcon },
  ],
};

export default function Sidebar({ userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const navigation = navigationItems[userRole] || [];

  return (
    <div className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <Link href={`/${userRole}/dashboard`} className="flex items-center space-x-2">
            <BriefcaseIcon className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold">Infrapilot</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex justify-center w-full">
            <BriefcaseIcon className="h-8 w-8 text-blue-500" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-800"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info and logout */}
      <div className="border-t border-gray-800 p-4">
        {!collapsed ? (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}').name}
                </p>
                <p className="text-xs text-gray-400 capitalize">{userRole}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogoutIcon className="h-5 w-5 mr-3" />
              Logout
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserIcon className="h-6 w-6" />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-800"
              title="Logout"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}