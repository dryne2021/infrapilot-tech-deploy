'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import API_BASE_URL from '@/utils/apiBase'

import CandidateManagement from './CandidateManagement'
import PlanManagement from './PlanManagement'
import RecruiterManagement from './RecruiterManagement'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
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
  const router = useRouter()

  // ✅ Always call backend with absolute URL in production
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('infrapilot_token')

    const fullUrl = url.startsWith('/')
      ? `${API_BASE_URL}${url}`
      : url

    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return res
  }

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const userStr = localStorage.getItem('infrapilot_user')
        const adminAuth = localStorage.getItem('admin_authenticated')

        if (!userStr || adminAuth !== 'true') {
          router.push('/login')
          return
        }

        const userData = JSON.parse(userStr)

        if (userData.role !== 'admin' && !userData.isAdmin) {
          router.push('/login')
          return
        }

        // ✅ verify session with backend (now absolute URL)
        const response = await fetchWithAuth('/api/v1/auth/me')

        // If your backend doesn’t implement /auth/me for admin token,
        // you can comment this out—but first test after deploy.
        if (!response.ok) {
          localStorage.removeItem('infrapilot_user')
          localStorage.removeItem('infrapilot_token')
          localStorage.removeItem('admin_authenticated')
          router.push('/login')
          return
        }

        setUser(userData)
        setIsAuthenticated(true)

        // Load dashboard data
        await loadDashboardData()
      } catch (error) {
        console.error('Admin auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    const loadDashboardData = async () => {
      try {
        // These endpoints depend on your backend routes.
        // Keep your original endpoints here—just ensure they start with "/api/..."
        // so fetchWithAuth prefixes correctly.

        const statsRes = await fetchWithAuth('/api/v1/admin/dashboard')
        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          // support both {success,data} and raw object
          const data = statsJson?.data ?? statsJson
          if (data) setStats((prev) => ({ ...prev, ...data }))
        }

        const activityRes = await fetchWithAuth('/api/v1/admin/activity')
        if (activityRes.ok) {
          const activityJson = await activityRes.json()
          setRecentActivity(Array.isArray(activityJson) ? activityJson : activityJson?.data || [])
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      }
    }

    checkAdminAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('admin_authenticated')
    router.push('/login')
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
          {['dashboard', 'candidates', 'recruiters', 'plans'].map((tab) => (
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
                    <div key={idx} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${item.color || 'bg-gray-700'}`}>
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
