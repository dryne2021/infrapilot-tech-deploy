'use client'

import { Inter } from 'next/font/google'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

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

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'https://infrapilot-tech-deploy.onrender.com'

  // ✅ Public candidate routes (no auth required)
  const PUBLIC_ROUTES = ['/candidate/login', '/candidate/register', '/candidate/forgot-password']

  const forceLogoutToCandidateLogin = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('infrapilot_profile')
    localStorage.removeItem('candidate_authenticated')
    localStorage.removeItem('candidate_id')
    router.replace('/candidate/login') // ✅ replace avoids loop/back
  }

  useEffect(() => {
    const checkAuth = async () => {
      // ✅ If on a public page, don't run auth enforcement
      if (PUBLIC_ROUTES.includes(pathname)) {
        setLoading(false)
        return
      }

      const userStr = localStorage.getItem('infrapilot_user')
      const token = localStorage.getItem('infrapilot_token')

      // ✅ require BOTH user + token for protected routes
      if (!userStr || !token) {
        forceLogoutToCandidateLogin()
        return
      }

      try {
        const userData = JSON.parse(userStr)

        // ✅ must be candidate
        if (userData?.role !== 'candidate') {
          forceLogoutToCandidateLogin()
          return
        }

        // ✅ verify token still valid (recommended)
        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!meRes.ok) {
          forceLogoutToCandidateLogin()
          return
        }

        const me = await meRes.json()

        // Refresh stored user/profile
        if (me?.user) localStorage.setItem('infrapilot_user', JSON.stringify(me.user))
        if (me?.profile) localStorage.setItem('infrapilot_profile', JSON.stringify(me.profile))
        if (me?.profile?._id) localStorage.setItem('candidate_id', me.profile._id)

        setUser(me.user || userData)
      } catch (err) {
        console.error('Candidate auth check failed:', err)
        forceLogoutToCandidateLogin()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const handleLogout = () => {
    forceLogoutToCandidateLogin()
  }

  // ✅ Loading UI (only for protected pages)
  if (loading) {
    return (
      <div className={`${inter.className} min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading candidate portal...</p>
        </div>
      </div>
    )
  }

  // ✅ For public pages (login/register), do NOT show nav/footer
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <div className={inter.className}>{children}</div>
  }

  // ✅ Protected layout UI (nav/footer)
  return (
    <div className={`${inter.className} bg-gray-50 min-h-screen`}>
      {/* Top Bar */}
      <nav className="bg-white shadow-lg border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Brand */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">IP</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Infrapilot</span>
            </div>

            {/* Logout */}
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
      <main className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-[calc(100vh-64px)]">
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
    </div>
  )
}
