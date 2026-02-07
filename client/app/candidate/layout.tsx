'use client'

import { Inter } from 'next/font/google'
import '../globals.css'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
        {/* Top Bar (navigation links + profile area removed completely) */}
        <nav className="bg-white shadow-lg border-b border-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Brand only */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold">IP</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Infrapilot</span>
              </div>

              {/* Simple logout (optional but useful) */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Logout
              </button>
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
                <p className="text-xs text-gray-600">Candidate Portal • Version 2.0</p>
                <p className="text-xs text-gray-600 mt-1">Need help? Contact support@infrapilot.tech</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
