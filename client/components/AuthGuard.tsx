'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface UserToken {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push(redirectTo);
          return;
        }

        // Decode token to get user info
        const decoded = jwtDecode<UserToken>(token);
        
        // Check token expiration
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push(redirectTo);
          return;
        }

        // Check if user role is allowed
        if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
          // Redirect to appropriate dashboard based on role
          switch (decoded.role) {
            case 'admin':
              router.push('/admin/dashboard');
              break;
            case 'recruiter':
              router.push('/recruiter/dashboard');
              break;
            case 'candidate':
              router.push('/candidate/dashboard');
              break;
            default:
              router.push(redirectTo);
          }
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}