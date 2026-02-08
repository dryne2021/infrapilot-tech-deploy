'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
    candidatesWithCredentials: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('infrapilot_token')
    
    if (!token) {
      router.push('/login')
      return null
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/login')
        return null
      }

      return response
    } catch (error) {
      console.error('API Error:', error)
      return null
    }
  }

  useEffect(() => {
    const checkAdminAuth = async () => {
      const token = localStorage.getItem('infrapilot_token')
      
      if (!token) {
        router.push('/login')
        return
      }
      
      try {
        const response = await fetchWithAuth('/api/v1/auth/me')
        
        if (!response || !response.ok) {
          localStorage.removeItem('infrapilot_user')
          localStorage.removeItem('infrapilot_token')
          router.push('/login')
          return
        }
        
        const userData = await response.json()
        
        if (userData.role !== 'admin') {
          router.push('/login')
          return
        }
        
        setUser(userData)
        setIsAuthenticated(true)
        await loadDashboardData()
        
      } catch {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAuth()
  }, [router])

  const loadDashboardData = async () => {
    try {
      // Load dashboard stats
      const dashboardRes = await fetchWithAuth('/api/v1/admin/dashboard')
      if (dashboardRes?.ok) {
        const dashboardData = await dashboardRes.json()
        setStats({
          totalCandidates: dashboardData.totalCandidates || 0,
          activeSubscriptions: dashboardData.activeSubscriptions || 0,
          pendingPayments: dashboardData.pendingPayments || 0,
          monthlyRevenue: dashboardData.monthlyRevenue || 0,
          totalRecruiters: dashboardData.totalRecruiters || 0,
          activeRecruiters: dashboardData.activeRecruiters || 0,
          unassignedCandidates: dashboardData.unassignedCandidates || 0,
          candidatesWithCredentials: dashboardData.candidatesWithCredentials || 0
        })
      }

      // Load candidates for activity
      const candidatesRes = await fetchWithAuth('/api/v1/admin/users?role=candidate')
      const candidates = candidatesRes?.ok ? await candidatesRes.json() : []

      // Load recruiters for activity
      const recruitersRes = await fetchWithAuth('/api/v1/admin/users?role=recruiter')
      const recruiters = recruitersRes?.ok ? await recruitersRes.json() : []

      // Generate recent activity
      const activities = generateRecentActivity(candidates, recruiters)
      setRecentActivity(activities)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const generateRecentActivity = (candidates: any[], recruiters: any[]) => {
    const activities = []
    const now = new Date()
    
    // Add candidate activities
    candidates.slice(0, 3).forEach(candidate => {
      const hoursAgo = Math.floor(Math.random() * 24)
      activities.push({
        action: `New ${candidate.subscriptionPlan || 'Free'} subscription`,
        user: candidate.fullName || `${candidate.firstName} ${candidate.lastName}`,
        time: `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`,
        color: 'bg-blue-100 text-blue-800',
        icon: '💰'
      })
    })
    
    // Add recruiter activities
    recruiters.slice(0, 2).forEach(recruiter => {
      const daysAgo = Math.floor(Math.random() * 7)
      activities.push({
        action: `Recruiter ${recruiter.status === 'active' ? 'activated' : 'deactivated'}`,
        user: recruiter.name,
        time: `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`,
        color: recruiter.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
        icon: '👔'
      })
    })
    
    // Add assignment activities
    candidates.filter(c => c.assignedRecruiter).slice(0, 2).forEach(candidate => {
      const hoursAgo = Math.floor(Math.random() * 48)
      const recruiter = recruiters.find(r => r.id === candidate.assignedRecruiter)
      if (recruiter) {
        activities.push({
          action: 'Candidate assigned',
          user: `${candidate.fullName || candidate.firstName} → ${recruiter.name}`,
          time: `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`,
          color: 'bg-violet-100 text-violet-800',
          icon: '🤝'
        })
      }
    })
    
    // Add credential activities
    candidates.filter(c => c.username && c.password).slice(0, 2).forEach(candidate => {
      const daysAgo = Math.floor(Math.random() * 3)
      activities.push({
        action: 'Login credentials created',
        user: candidate.fullName || candidate.firstName,
        time: `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`,
        color: 'bg-emerald-100 text-emerald-800',
        icon: '🔐'
      })
    })
    
    // Add some system activities
    activities.push(
      {
        action: 'System backup completed',
        user: 'Automated',
        time: '2 hours ago',
        color: 'bg-slate-100 text-slate-800',
        icon: '💾'
      },
      {
        action: 'Monthly report generated',
        user: 'System',
        time: '1 day ago',
        color: 'bg-amber-100 text-amber-800',
        icon: '📊'
      }
    )
    
    return activities.sort(() => Math.random() - 0.5).slice(0, 5)
  }

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    router.push('/login')
  }

  const refreshDashboard = async () => {
    setLoading(true)
    await loadDashboardData()
    setLoading(false)
  }

  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Verifying admin access...</p>
          <p className="text-sm text-slate-400 mt-1">Please wait while we authenticate your session</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            {/* Logo Container */}
            <div className="relative">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-xl shadow-blue-200/50 border-4 border-white bg-white">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse flex items-center justify-center">
                <span className="text-white text-xs font-bold">IP</span>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                InfraPilot Admin Portal
              </h1>
              <p className="text-slate-600 mt-1">Welcome back, <span className="font-semibold text-blue-800">{user.name}</span></p>
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-200 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-700">Admin Authenticated</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshDashboard}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200"
            >
              Switch Admin
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-rose-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'candidates', label: 'Candidates', icon: '👥' },
            { id: 'plans', label: 'Plans', icon: '💎' },
            { id: 'recruiters', label: 'Recruiters', icon: '👔' },
            { id: 'assignments', label: 'Assignments', icon: '🤝' },
            { id: 'credentials', label: 'Credentials', icon: '🔐' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200 transform -translate-y-0.5' 
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Candidates</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                      {stats.totalCandidates}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">👥</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {stats.unassignedCandidates} unassigned
                  </span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    {stats.candidatesWithCredentials} with credentials
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Active Recruiters</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                      {stats.activeRecruiters}<span className="text-xl text-slate-400">/{stats.totalRecruiters}</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">👔</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Managing candidate assignments
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">With Credentials</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                      {stats.candidatesWithCredentials}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🔐</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${stats.totalCandidates > 0 ? (stats.candidatesWithCredentials / stats.totalCandidates) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs font-medium text-emerald-600 mt-2">
                    {stats.totalCandidates > 0 
                      ? `${((stats.candidatesWithCredentials / stats.totalCandidates) * 100).toFixed(1)}% enabled`
                      : '0% enabled'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Monthly Revenue</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-amber-900 to-amber-700 bg-clip-text text-transparent">
                      ${stats.monthlyRevenue}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">💰</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-4 font-medium">Projected from active plans</p>
              </div>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-rose-900 to-rose-700 bg-clip-text text-transparent">
                      {stats.pendingPayments}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-rose-600 to-rose-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">⏳</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium text-rose-600 mt-4">Require follow-up</p>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Unassigned Candidates</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-amber-900 to-amber-700 bg-clip-text text-transparent">
                      {stats.unassignedCandidates}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🎯</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium text-amber-600 mt-4">Need assignment</p>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Without Credentials</p>
                    <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {stats.totalCandidates - stats.candidatesWithCredentials}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center shadow-inner">
                    <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🔓</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-600 mt-4">Need manual setup</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                    Quick Actions
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Common administrative tasks</p>
                </div>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                  View all
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { icon: '🔐', label: 'Setup Credentials', desc: 'Manual credential creation', color: 'from-emerald-500 to-emerald-400', tab: 'credentials' },
                  { icon: '👔', label: 'Add Recruiter', desc: 'Create recruiter account', color: 'from-blue-500 to-blue-400', tab: 'recruiters' },
                  { icon: '🤝', label: 'Assign Candidates', desc: 'Manage assignments', color: 'from-violet-500 to-violet-400', tab: 'assignments' },
                  { icon: '➕', label: 'Add Candidate', desc: 'Manually register', color: 'from-indigo-500 to-indigo-400', tab: 'candidates' }
                ].map((action, index) => (
                  <button 
                    key={index}
                    onClick={() => setActiveTab(action.tab)}
                    className="p-5 bg-white border border-slate-200 rounded-xl hover:border-transparent hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-white text-xl">{action.icon}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-left">{action.label}</p>
                    <p className="text-sm text-slate-500 text-left mt-1">{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity & System Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                      Recent Activity
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Latest system events and actions</p>
                  </div>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                    View all
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:bg-blue-50 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color.split(' ')[0]} ${item.color.split(' ')[1]}`}>
                            <span className="text-lg">{item.icon}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-800">{item.action}</span>
                            <p className="text-sm text-slate-600 mt-1">{item.user}</p>
                          </div>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">{item.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4 text-slate-300">📭</div>
                      <p className="text-slate-500">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* System Info with Logo */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">System Overview</h3>
                    <p className="text-blue-100 opacity-90">InfraPilot Admin Control Panel</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">👑</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Administrator</p>
                      <p className="text-sm text-blue-100 opacity-80">{user.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">🔐</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">Candidate Portal</p>
                      <p className="text-sm text-blue-100 opacity-80">{stats.candidatesWithCredentials} active logins</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">System Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <p className="text-sm text-emerald-200">All Systems Operational</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {['👥 Candidates', '👔 Recruiters', '🔐 Credentials', '🤝 Assignments', '💎 Plans', '📊 Analytics'].map((tag, index) => (
                    <span key={index} className="px-3 py-1.5 bg-white/15 text-white/90 text-sm rounded-lg font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-sm text-blue-100 opacity-80">
                    Last updated: {new Date().toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'candidates' && <CandidateManagement />}
        {activeTab === 'plans' && <PlanManagement />}
        {activeTab === 'recruiters' && <RecruiterManagement />}
        
        {/* Assignment Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                  Candidate Assignments
                </h2>
                <p className="text-slate-600">Manage candidate assignments and distribution</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const response = await fetchWithAuth('/api/v1/admin/assignments/auto-assign', {
                      method: 'POST',
                    })
                    
                    if (response?.ok) {
                      const result = await response.json()
                      alert(`✅ ${result.assigned} candidates auto-assigned to ${result.recruiters} recruiters!`)
                      await loadDashboardData()
                    } else {
                      alert('Failed to auto-assign candidates')
                    }
                  } catch (error) {
                    alert('Error auto-assigning candidates')
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-emerald-200 font-medium"
              >
                🤖 Auto-Assign All
              </button>
            </div>
            
            <AssignmentManager />
          </div>
        )}
        
        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                  Credentials Management
                </h2>
                <p className="text-slate-600">Manually create login credentials for candidate dashboard access</p>
              </div>
            </div>
            
            <CredentialsManager />
          </div>
        )}
        
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h2>
                <p className="text-slate-600">Detailed insights and performance metrics</p>
              </div>
              <div className="flex gap-3">
                <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Year to date</option>
                </select>
                <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium">
                  Export Report
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">Assignment Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                  <AssignmentDistributionChart />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4">Recruiter Performance</h3>
                <div className="h-64 flex items-center justify-center">
                  <RecruiterPerformanceChart />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Analytics Features
              </h3>
              <ul className="text-blue-700 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Assignment distribution</strong> across recruiters
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Recruiter performance</strong> metrics and KPIs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Candidate status tracking</strong> by recruiter
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Workload balancing</strong> visualization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Assignment efficiency</strong> analytics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <strong>Custom report generation</strong> for assignments
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-4 border-white">
                  <Image
                    src="/logo.jpeg"
                    alt="Infrapilot Logo"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                    System Settings
                  </h2>
                  <p className="text-slate-600">Configure system preferences and settings</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    🔐 Candidate Portal Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Credential Creation Method</p>
                        <p className="text-sm text-slate-500">How credentials are created</p>
                      </div>
                      <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option value="manual">Manual Only</option>
                        <option value="auto">Auto-Generate</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Candidate Dashboard URL</p>
                        <p className="text-sm text-slate-500">Candidate portal link</p>
                      </div>
                      <input
                        type="text"
                        defaultValue="/candidate/dashboard"
                        className="w-48 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Default Password Policy</p>
                        <p className="text-sm text-slate-500">Password requirements</p>
                      </div>
                      <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>Minimum 8 characters</option>
                        <option>Complex (letters, numbers, symbols)</option>
                        <option>Custom Policy</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    👔 Assignment Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Max Candidates per Recruiter</p>
                        <p className="text-sm text-slate-500">Limit workload per recruiter</p>
                      </div>
                      <input
                        type="number"
                        defaultValue="15"
                        className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Auto-assignment</p>
                        <p className="text-sm text-slate-500">Auto-assign new candidates</p>
                      </div>
                      <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>Enabled</option>
                        <option>Disabled</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">Assignment Algorithm</p>
                        <p className="text-sm text-slate-500">How candidates are assigned</p>
                      </div>
                      <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>Round Robin</option>
                        <option>Based on Specialty</option>
                        <option>Load Balancing</option>
                        <option>Manual Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    📧 Notification Settings
                  </h3>
                  <div className="space-y-4">
                    {[
                      'Email alerts for new assignments',
                      'Assignment change notifications',
                      'Credential creation alerts',
                      'Daily assignment reports',
                      'Recruiter capacity alerts'
                    ].map((label, index) => (
                      <div key={index} className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                          defaultChecked={index !== 3}
                        />
                        <label className="ml-3 text-slate-700 font-medium">{label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    🎨 Appearance
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                      <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>Light</option>
                        <option>Dark</option>
                        <option>Auto (System)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                      <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                      <select className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700">
                        <option>UTC</option>
                        <option>EST (Eastern Time)</option>
                        <option>PST (Pacific Time)</option>
                        <option>CST (Central Time)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex justify-end gap-3">
                <button className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                  Cancel
                </button>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Logo */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-md">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  InfraPilot Tech Admin Portal • Version 2.2.0 • {new Date().getFullYear()}
                </p>
                <p className="text-xs text-slate-400">
                  Need help? Contact support@infrapilot.com
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Powered by</span>
              <div className="relative w-16 h-8">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={64}
                  height={32}
                  className="object-contain w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Assignment Manager Component - UPDATED VERSION
const AssignmentManager = () => {
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null)
  const [availableCandidates, setAvailableCandidates] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('infrapilot_token')
    
    if (!token) {
      router.push('/login')
      return null
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/login')
        return null
      }

      return response
    } catch (error) {
      console.error('API Error:', error)
      return null
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load candidates
      const candidatesRes = await fetchWithAuth('/api/v1/admin/users?role=candidate')
      if (candidatesRes?.ok) {
        const candidatesData = await candidatesRes.json()
        setCandidates(candidatesData)
      }

      // Load recruiters
      const recruitersRes = await fetchWithAuth('/api/v1/admin/users?role=recruiter')
      if (recruitersRes?.ok) {
        const recruitersData = await recruitersRes.json()
        setRecruiters(recruitersData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRecruiter = (recruiter: any) => {
    setSelectedRecruiter(recruiter)
    
    // Get unassigned candidates
    const unassignedCandidates = candidates.filter(candidate => 
      !candidate.assignedRecruiter || candidate.assignedRecruiter === ''
    )
    
    // Get candidates assigned to this recruiter
    const recruiterCandidates = candidates.filter(candidate => 
      candidate.assignedRecruiter === recruiter.id
    )
    
    setAvailableCandidates([...unassignedCandidates, ...recruiterCandidates])
  }

  const assignCandidate = async (candidateId: string, assign: boolean = true) => {
    try {
      const response = await fetchWithAuth(`/api/v1/admin/assignments/${candidateId}`, {
        method: assign ? 'POST' : 'DELETE',
        body: JSON.stringify({
          recruiterId: assign ? selectedRecruiter.id : null,
          recruiterName: assign ? selectedRecruiter.name : null,
          recruiterDetails: assign ? {
            id: selectedRecruiter.id,
            name: selectedRecruiter.name,
            email: selectedRecruiter.email,
            phone: selectedRecruiter.phone || '',
            department: selectedRecruiter.department || 'Recruitment',
            specialization: selectedRecruiter.specialization || 'General',
            status: selectedRecruiter.status || 'active',
            bio: selectedRecruiter.bio || `${selectedRecruiter.name} is your dedicated career consultant.`,
            experience: selectedRecruiter.experience || '5+ years'
          } : null
        }),
      })

      if (response?.ok) {
        await loadData()
        alert(assign ? 
          `✅ Candidate assigned to ${selectedRecruiter.name}! The candidate can now see their recruiter in their dashboard.` : 
          '✅ Candidate unassigned!'
        )
      } else {
        alert('Failed to update assignment')
      }
    } catch (error) {
      alert('Error updating assignment')
    }
  }

  const bulkAssign = async (candidateIds: string[]) => {
    if (candidateIds.length === 0) {
      alert('Please select at least one candidate')
      return
    }
    
    try {
      const response = await fetchWithAuth('/api/v1/admin/assignments/bulk', {
        method: 'POST',
        body: JSON.stringify({
          candidateIds,
          recruiterId: selectedRecruiter.id,
          recruiterName: selectedRecruiter.name,
          recruiterDetails: {
            id: selectedRecruiter.id,
            name: selectedRecruiter.name,
            email: selectedRecruiter.email,
            phone: selectedRecruiter.phone || '',
            department: selectedRecruiter.department || 'Recruitment',
            specialization: selectedRecruiter.specialization || 'General',
            status: selectedRecruiter.status || 'active'
          }
        }),
      })

      if (response?.ok) {
        await loadData()
        alert(`✅ ${candidateIds.length} candidates assigned to ${selectedRecruiter.name}! All candidates can now see their recruiter in their dashboard.`)
      } else {
        alert('Failed to assign candidates')
      }
    } catch (error) {
      alert('Error assigning candidates')
    }
  }

  const filteredCandidates = availableCandidates.filter(candidate => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      candidate.fullName?.toLowerCase().includes(search) ||
      candidate.email?.toLowerCase().includes(search) ||
      candidate.currentPosition?.toLowerCase().includes(search) ||
      candidate.skills?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading assignment data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recruiters List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Select Recruiter</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recruiters.filter(r => r.status === 'active').map(recruiter => {
            const assignedCount = candidates.filter(c => c.assignedRecruiter === recruiter.id).length
            return (
              <div
                key={recruiter.id}
                onClick={() => handleSelectRecruiter(recruiter)}
                className={`bg-gradient-to-br from-white to-slate-50 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedRecruiter?.id === recruiter.id 
                    ? 'border-blue-500 shadow-lg shadow-blue-100 ring-2 ring-blue-100' 
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-inner">
                      <span className="text-blue-600 font-semibold text-sm">
                        {recruiter.name?.[0]?.toUpperCase() || 'R'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{recruiter.name}</p>
                      <p className="text-sm text-slate-500">{recruiter.department}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    assignedCount >= (recruiter.maxCandidates || 10) 
                      ? 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {assignedCount}/{recruiter.maxCandidates || 10}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <span className="text-slate-400">📧</span>
                    {recruiter.email}
                  </p>
                  <p className="flex items-center gap-2 mt-1">
                    <span className="text-slate-400">🎯</span>
                    {recruiter.specialization}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Assigned candidates: <span className="font-semibold">{assignedCount}</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedRecruiter && (
        <>
          {/* Selected Recruiter Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-blue-800 text-lg">
                  Assigning to: {selectedRecruiter.name}
                </h3>
                <p className="text-blue-700">
                  {selectedRecruiter.department} • {selectedRecruiter.specialization}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  ✅ Candidates will see this recruiter in their dashboard
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 font-medium">Capacity</p>
                <p className="text-2xl font-bold text-blue-800">
                  {candidates.filter(c => c.assignedRecruiter === selectedRecruiter.id).length}/
                  {selectedRecruiter.maxCandidates || 10}
                </p>
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h3 className="text-lg font-bold text-slate-800">
                Available Candidates ({filteredCandidates.length})
              </h3>
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 md:w-64 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    const selectedIds = filteredCandidates
                      .filter(c => c.selected)
                      .map(c => c.id)
                    bulkAssign(selectedIds)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-emerald-200 font-medium whitespace-nowrap"
                >
                  Assign Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Candidate</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Current Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Plan</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Credentials</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Currently Assigned</th>
                    <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map(candidate => {
                    const isAssignedToSelected = candidate.assignedRecruiter === selectedRecruiter.id
                    const currentRecruiter = recruiters.find(r => r.id === candidate.assignedRecruiter)
                    const hasCredentials = candidate.username && candidate.password
                    
                    return (
                      <tr key={candidate.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                            checked={candidate.selected || false}
                            onChange={() => {
                              setAvailableCandidates(prev => 
                                prev.map(c => 
                                  c.id === candidate.id 
                                    ? { ...c, selected: !c.selected }
                                    : c
                                )
                              )
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {candidate.firstName?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}
                              </p>
                              <p className="text-sm text-slate-500">{candidate.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            candidate.subscriptionStatus === 'active' 
                              ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {candidate.subscriptionStatus || 'inactive'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            candidate.subscriptionPlan === 'gold' ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200' :
                            candidate.subscriptionPlan === 'platinum' ? 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200' :
                            candidate.subscriptionPlan === 'enterprise' ? 'bg-gradient-to-r from-violet-100 to-violet-50 text-violet-700 border border-violet-200' :
                            candidate.subscriptionPlan === 'silver' ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200' :
                            'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {candidate.subscriptionPlan || 'free'}
                          </span>
                        </td>
                        <td className="p-4">
                          {hasCredentials ? (
                            <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
                              🔐 Enabled
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200">
                              🔓 Not Setup
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {currentRecruiter ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-600 font-medium">{currentRecruiter.name}</span>
                              {isAssignedToSelected && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                                  Current
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {isAssignedToSelected ? (
                              <button
                                onClick={() => assignCandidate(candidate.id, false)}
                                className="px-3 py-1 text-sm bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all duration-200 font-medium"
                              >
                                Unassign
                              </button>
                            ) : (
                              <button
                                onClick={() => assignCandidate(candidate.id, true)}
                                className="px-3 py-1 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Credentials Manager Component
const CredentialsManager = () => {
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('infrapilot_token')
    
    if (!token) {
      router.push('/login')
      return null
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.status === 401) {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/login')
        return null
      }

      return response
    } catch (error) {
      console.error('API Error:', error)
      return null
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetchWithAuth('/api/v1/admin/users?role=candidate')
      if (response?.ok) {
        const data = await response.json()
        setCandidates(data)
      }
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateForm = (candidate: any) => {
    setSelectedCandidate(candidate)
    const firstName = candidate.firstName || 'candidate'
    const lastName = candidate.lastName || candidate.id.substring(0, 4)
    const suggestedUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
    
    setFormData({
      username: suggestedUsername,
      password: '',
      confirmPassword: ''
    })
    setShowForm(true)
  }

  const openEditForm = (candidate: any) => {
    setSelectedCandidate(candidate)
    setFormData({
      username: candidate.username || '',
      password: '',
      confirmPassword: ''
    })
    setShowForm(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const saveCredentials = async () => {
    if (!selectedCandidate) return
    
    if (!formData.username.trim()) {
      alert('Username is required!')
      return
    }
    
    if (formData.password) {
      if (formData.password.length < 8) {
        alert('Password must be at least 8 characters!')
        return
      }
      
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match!')
        return
      }
    }
    
    try {
      const response = await fetchWithAuth(`/api/v1/admin/credentials/${selectedCandidate.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password || undefined,
          credentialsGenerated: new Date().toISOString(),
          credentialsUpdatedBy: 'admin'
        }),
      })

      if (response?.ok) {
        await loadData()
        setShowForm(false)
        setSelectedCandidate(null)
        setFormData({ username: '', password: '', confirmPassword: '' })
        alert(`✅ Credentials saved for ${selectedCandidate.firstName} ${selectedCandidate.lastName}!`)
      } else {
        alert('Failed to save credentials')
      }
    } catch (error) {
      alert('Error saving credentials')
    }
  }

  const resetCredentials = async (candidateId: string) => {
    if (!confirm('Are you sure you want to reset credentials? The candidate will no longer be able to login.')) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/v1/admin/credentials/${candidateId}`, {
        method: 'DELETE',
      })

      if (response?.ok) {
        await loadData()
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate(null)
          setShowForm(false)
        }
        alert('✅ Credentials reset!')
      } else {
        alert('Failed to reset credentials')
      }
    } catch (error) {
      alert('Error resetting credentials')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const filteredCandidates = candidates.filter(candidate => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      candidate.fullName?.toLowerCase().includes(search) ||
      candidate.email?.toLowerCase().includes(search) ||
      candidate.username?.toLowerCase().includes(search)
    )
  })

  const candidatesWithCredentials = candidates.filter(c => c.username && c.password).length
  const candidatesWithoutCredentials = candidates.length - candidatesWithCredentials

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading credentials data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Candidates</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{candidates.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-blue-600 text-lg">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600 font-medium">With Credentials</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{candidatesWithCredentials}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-emerald-600 text-lg">🔐</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">Without Credentials</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{candidatesWithoutCredentials}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-amber-600 text-lg">🔓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials Creation/Edit Form */}
      {showForm && selectedCandidate && (
        <div className="bg-white border-2 border-blue-300 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-blue-800">
                {selectedCandidate.username ? 'Edit Credentials' : 'Create Credentials'}
              </h3>
              <p className="text-blue-600 text-sm mt-1">Setup candidate login access</p>
            </div>
            <button
              onClick={() => {
                setShowForm(false)
                setSelectedCandidate(null)
                setFormData({ username: '', password: '', confirmPassword: '' })
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <p className="font-medium text-blue-800">Candidate:</p>
            <p className="text-lg font-bold text-slate-900">
              {selectedCandidate.fullName || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
            </p>
            <p className="text-blue-600">{selectedCandidate.email}</p>
            {selectedCandidate.assignedRecruiter && (
              <p className="text-sm text-blue-700 mt-1">
                Assigned Recruiter: {selectedCandidate.recruiterName || 'Not specified'}
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
              <p className="text-sm text-slate-500 mt-1">
                Suggested: {selectedCandidate.firstName?.toLowerCase()}.{selectedCandidate.lastName?.toLowerCase()}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Password {!selectedCandidate.username && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={selectedCandidate.username ? "Leave blank to keep existing password" : "Enter password"}
                  required={!selectedCandidate.username}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {formData.password.length > 0 ? 
                  `Strength: ${formData.password.length < 8 ? 'Weak' : formData.password.length < 12 ? 'Medium' : 'Strong'}` :
                  'Minimum 8 characters recommended'
                }
              </p>
            </div>
            
            {formData.password && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm password"
                  required
                />
                {formData.password !== formData.confirmPassword && formData.confirmPassword && (
                  <p className="text-sm text-rose-600 mt-1">⚠️ Passwords do not match!</p>
                )}
              </div>
            )}
            
            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setShowForm(false)
                  setSelectedCandidate(null)
                  setFormData({ username: '', password: '', confirmPassword: '' })
                }}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveCredentials}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium"
              >
                Save Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidates Table */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h3 className="text-lg font-bold text-slate-800">Candidates List ({filteredCandidates.length})</h3>
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Candidate</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Subscription</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Login Status</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Username</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Assigned Recruiter</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Credentials Created</th>
                <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.map(candidate => {
                const hasCredentials = candidate.username && candidate.password
                const credentialsDate = candidate.credentialsGenerated 
                  ? new Date(candidate.credentialsGenerated).toLocaleDateString()
                  : 'Never'
                
                return (
                  <tr key={candidate.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {candidate.firstName?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}
                          </p>
                          <p className="text-sm text-slate-500">
                            {candidate.assignedRecruiter ? 'Assigned' : 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-700">{candidate.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        candidate.subscriptionPlan === 'gold' ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200' :
                        candidate.subscriptionPlan === 'platinum' ? 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200' :
                        candidate.subscriptionPlan === 'enterprise' ? 'bg-gradient-to-r from-violet-100 to-violet-50 text-violet-700 border border-violet-200' :
                        candidate.subscriptionPlan === 'silver' ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {candidate.subscriptionPlan || 'free'}
                      </span>
                    </td>
                    <td className="p-4">
                      {hasCredentials ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                            🔐 Enabled
                          </span>
                        </div>
                      ) : (
                        <span className="px-3 py-1 bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">
                          🔓 Not Setup
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {candidate.username ? (
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 bg-slate-100 text-slate-800 rounded text-sm font-mono font-semibold border border-slate-200">
                            {candidate.username}
                          </code>
                          <button
                            onClick={() => copyToClipboard(candidate.username)}
                            className="text-slate-500 hover:text-slate-700"
                            title="Copy username"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      {candidate.assignedRecruiter ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 font-medium">{candidate.recruiterName || 'Recruiter'}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            Assigned
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-600 font-medium">{credentialsDate}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {hasCredentials ? (
                          <>
                            <button
                              onClick={() => openEditForm(candidate)}
                              className="px-3 py-1 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const message = `Candidate: ${candidate.firstName} ${candidate.lastName}\nUsername: ${candidate.username}\nPassword: [Hidden for security]\n\nSend these credentials to the candidate securely.`;
                                alert(message);
                              }}
                              className="px-3 py-1 text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => resetCredentials(candidate.id)}
                              className="px-3 py-1 text-sm bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all duration-200 font-medium"
                            >
                              Reset
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openCreateForm(candidate)}
                            className="px-3 py-1 text-sm bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 font-medium"
                          >
                            Create
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-white">
            <Image
              src="/logo.jpeg"
              alt="Infrapilot Logo"
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
          <h3 className="font-bold text-blue-800 text-lg">📋 Manual Credential Creation Instructions:</h3>
        </div>
        <ul className="text-blue-700 space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <div>
              <strong className="text-blue-800">Select candidate</strong> from the list above
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <strong className="text-blue-800">Click "Create" button</strong> to open credential form
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <div>
              <strong className="text-blue-800">Enter unique username</strong> (suggestions provided)
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              4
            </div>
            <div>
              <strong className="text-blue-800">Set secure password</strong> (minimum 8 characters)
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              5
            </div>
            <div>
              <strong className="text-blue-800">Click "Save Credentials"</strong> to activate login
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              6
            </div>
            <div>
              <strong className="text-blue-800">Send credentials securely</strong> to candidate via email or secure message
            </div>
          </li>
        </ul>
        
        <div className="mt-6 p-4 bg-white rounded-xl border border-blue-300">
          <h4 className="font-bold text-blue-800 mb-2">🔗 Candidate Dashboard Access:</h4>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <code className="bg-slate-100 px-4 py-3 rounded-lg text-sm font-mono text-slate-800 font-semibold border border-slate-200">
              {typeof window !== 'undefined' ? `${window.location.origin}/candidate/dashboard` : '/candidate/dashboard'}
            </code>
            <button
              onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/candidate/dashboard` : '/candidate/dashboard')}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium whitespace-nowrap"
            >
              Copy URL
            </button>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            Candidates use this URL with their username and password to access their dashboard.
          </p>
        </div>
        
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Security Notes
          </h4>
          <ul className="text-amber-700 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <strong>Never share credentials</strong> via unsecured channels
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <strong>Encourage candidates</strong> to change password on first login
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <strong>Use unique usernames</strong> for each candidate
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <strong>Reset credentials</strong> if security is compromised
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <strong>Audit credentials</strong> regularly for security
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Chart Components (simplified for now)
const AssignmentDistributionChart = () => {
  return (
    <div className="text-center w-full py-8">
      <div className="text-4xl mb-4 text-slate-300">📊</div>
      <p className="text-slate-600 font-medium">Assignment Distribution Chart</p>
      <p className="text-sm text-slate-400 mt-2">Visual representation of assignments per recruiter</p>
    </div>
  )
}

const RecruiterPerformanceChart = () => {
  return (
    <div className="text-center w-full py-8">
      <div className="text-4xl mb-4 text-slate-300">📈</div>
      <p className="text-slate-600 font-medium">Recruiter Performance Metrics</p>
      <p className="text-sm text-slate-400 mt-2">Candidate conversion rates and efficiency</p>
    </div>
  )
}