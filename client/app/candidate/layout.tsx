'use client'

import { Inter } from 'next/font/google'
import './globals.css'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('infrapilot_user')
      
      if (!userStr) {
        router.push('/candidate/login')
        return
      }
      
      try {
        const userData = JSON.parse(userStr)
        
        if (userData.role !== 'candidate') {
          router.push('/candidate/login')
          return
        }
        
        setUser(userData)
      } catch {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/candidate/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    router.push('/candidate/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading candidate portal...</p>
        </div>
      </div>
    )
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        {/* Top Navigation Bar */}
        <nav className="bg-white shadow-lg border-b border-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold">IP</span>
                  </div>
                  <div>
                    <span className="text-xl font-bold text-gray-900">Infrapilot</span>
                    <span className="text-sm text-blue-700 font-medium ml-2">Candidate Portal</span>
                  </div>
                </div>
                
                {/* Navigation Links */}
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    href="/candidate/dashboard"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                      pathname === '/candidate/dashboard'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-700 hover:text-blue-600 hover:border-blue-400'
                    }`}
                  >
                    🏠 Dashboard
                  </Link>
                  <Link
                    href="/candidate/assignments"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                      pathname === '/candidate/assignments'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-700 hover:text-blue-600 hover:border-blue-400'
                    }`}
                  >
                    📋 My Applications
                  </Link>
                  <Link
                    href="/candidate/profile"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                      pathname === '/candidate/profile'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-700 hover:text-blue-600 hover:border-blue-400'
                    }`}
                  >
                    👤 My Profile
                  </Link>
                  <Link
                    href="/candidate/resumes"
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium border-b-2 ${
                      pathname === '/candidate/resumes'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-700 hover:text-blue-600 hover:border-blue-400'
                    }`}
                  >
                    📄 My Resumes
                  </Link>
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.name || 'Candidate'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {user?.email || 'candidate@email.com'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {user?.name?.[0]?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-300 py-1 z-10">
                      <Link
                        href="/candidate/profile"
                        className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      >
                        👤 My Profile
                      </Link>
                      <Link
                        href="/candidate/settings"
                        className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                      >
                        ⚙️ Settings
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/candidate/dashboard"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/candidate/dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                🏠 Dashboard
              </Link>
              <Link
                href="/candidate/assignments"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/candidate/assignments'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 My Applications
              </Link>
              <Link
                href="/candidate/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/candidate/profile'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                👤 My Profile
              </Link>
              <Link
                href="/candidate/resumes"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/candidate/resumes'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📄 My Resumes
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-300">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center mr-2">
                    <span className="text-white text-sm font-bold">IP</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Infrapilot Career Platform</p>
                    <p className="text-xs text-gray-600">© 2024 All rights reserved</p>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-gray-600">
                  Candidate Portal • Version 2.0
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Need help? Contact support@infrapilot.tech
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}