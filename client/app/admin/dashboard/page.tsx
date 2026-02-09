'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import CandidateManagement from './CandidateManagement'
import PlanManagement from './PlanManagement'
import RecruiterManagement from './RecruiterManagement'

type AdminStats = {
  totalCandidates: number
  activeSubscriptions: number
  pendingPayments: number
  monthlyRevenue: number
  totalRecruiters: number
  activeRecruiters: number
  unassignedCandidates: number
  candidatesWithCredentials: number
}

export default function AdminPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'recruiters' | 'plans'>(
    'dashboard'
  )

  const [stats, setStats] = useState<AdminStats>({
    totalCandidates: 0,
    activeSubscriptions: 0,
    pendingPayments: 0,
    monthlyRevenue: 0,
    totalRecruiters: 0,
    activeRecruiters: 0,
    unassignedCandidates: 0,
    candidatesWithCredentials: 0,
  })

  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const clearAuthAndGoLogin = () => {
    try {
      localStorage.removeItem('infrapilot_user')
      localStorage.removeItem('infrapilot_token')
      localStorage.removeItem('admin_authenticated')
    } catch {}
    setUser(null)
    setIsAuthenticated(false)
    router.replace('/login')
  }

  // ✅ Robust fetch: sends Bearer token + cookies
  const apiFetch = async (path: string, init?: RequestInit) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('infrapilot_token') : null

    const headers = new Headers(init?.headers || {})
    headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    // Support both absolute and relative API URLs
    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
      '' // if blank, assumes same-origin proxy/rewrite

    const url = path.startsWith('http') ? path : `${base}${path}`

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    })

    return res
  }

  const loadDashboardData = async () => {
    // Stats
    const statsRes = await apiFetch('/api/v1/admin/dashboard')
    if (statsRes.status === 401) return 'unauthorized' as const
    if (statsRes.ok) {
      const statsJson = await statsRes.json()
      const data = statsJson?.data ?? statsJson
      if (data) setStats((prev) => ({ ...prev, ...data }))
    } else {
      console.error('Admin dashboard stats failed:', statsRes.status)
    }

    // Activity
    const activityRes = await apiFetch('/api/v1/admin/activity')
    if (activityRes.status === 401) return 'unauthorized' as const
    if (activityRes.ok) {
      const activityJson = await activityRes.json()
      setRecentActivity(Array.isArray(activityJson) ? activityJson : activityJson?.data || [])
    } else {
      console.error('Admin activity failed:', activityRes.status)
    }

    return 'ok' as const
  }

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const token = localStorage.getItem('infrapilot_token')
        if (!token) {
          clearAuthAndGoLogin()
          return
        }

        // ✅ Verify who is logged in from backend (prevents stale localStorage loops)
        const meRes = await apiFetch('/api/v1/auth/me')
        if (meRes.status === 401) {
          clearAuthAndGoLogin()
          return
        }

        if (!meRes.ok) {
          console.error('Auth me failed:', meRes.status)
          clearAuthAndGoLogin()
          return
        }

        const meJson = await meRes.json()
        const meUser = meJson?.user

        if (!meUser || (meUser.role !== 'admin' && !meUser.isAdmin)) {
          clearAuthAndGoLogin()
          return
        }

        // Store/refresh user in localStorage so other pages see it
        try {
          localStorage.setItem('infrapilot_user', JSON.stringify(meUser))
        } catch {}

        if (cancelled) return
        setUser(meUser)
        setIsAuthenticated(true)

        const dashStatus = await loadDashboardData()
        if (dashStatus === 'unauthorized') {
          clearAuthAndGoLogin()
          return
        }
      } catch (err) {
        console.error('Admin boot failed:', err)
        clearAuthAndGoLogin()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    boot()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    clearAuthAndGoLogin()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm">Welcome, {user?.name || 'Administrator'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6">
        <div className="flex gap-2 mb-6">
          {(['dashboard', 'candidates', 'recruiters', 'plans'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-gray-800 border-gray-700 hover:border-blue-500'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">Total Candidates</p>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">Active Subscriptions</p>
                <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold">${stats.monthlyRevenue}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
              {recentActivity.length === 0 ? (
                <p className="text-gray-400">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-900 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                            item.color || 'bg-gray-700'
                          }`}
                        >
                          <span>{item.icon || '📌'}</span>
                        </div>
                        <div>
                          <p className="font-semibold">{item.action}</p>
                          <p className="text-gray-400 text-sm">{item.user}</p>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">{item.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && <CandidateManagement />}
        {activeTab === 'recruiters' && <RecruiterManagement />}
        {activeTab === 'plans' && <PlanManagement />}
      </div>
    </div>
  )
}
