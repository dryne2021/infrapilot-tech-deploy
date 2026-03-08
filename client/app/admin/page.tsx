'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReportsManagement from './ReportsManagement'

import { fetchWithAuth } from '@/utils/fetchWithAuth'

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
  const [resumeReport, setResumeReport] = useState<any[]>([])

  // New state for recruiter data
  const [recruiterDetails, setRecruiterDetails] = useState<any[]>([])
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null)
  const [recruiterCandidates, setRecruiterCandidates] = useState<any[]>([])
  const [candidateJobStats, setCandidateJobStats] = useState<Record<string, any>>({})
  const [loadingRecruiterData, setLoadingRecruiterData] = useState(false)
  const [showRecruiterDetailModal, setShowRecruiterDetailModal] = useState(false)

  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('admin_authenticated')
    router.replace('/admin/login')
  }

  // Load all recruiters with their assigned candidates
  const loadRecruiterDetails = async () => {
    setLoadingRecruiterData(true)
    try {
      // Fetch all recruiters
      const recruitersRes = await fetchWithAuth('/api/v1/admin/recruiters')
      if (recruitersRes.ok) {
        const recruitersJson = await recruitersRes.json()
        const recruitersList = Array.isArray(recruitersJson) ? recruitersJson : recruitersJson?.data || []
        
        // For each recruiter, fetch their assigned candidates
        const recruitersWithStats = await Promise.all(
          recruitersList.map(async (recruiter: any) => {
            const recruiterId = recruiter._id || recruiter.id
            if (!recruiterId) return recruiter

            try {
              const candidatesRes = await fetchWithAuth(`/api/v1/admin/recruiters/${recruiterId}/candidates`)
              if (candidatesRes.ok) {
                const candidatesJson = await candidatesRes.json()
                const candidates = Array.isArray(candidatesJson) ? candidatesJson : candidatesJson?.data || []
                
                return {
                  ...recruiter,
                  assignedCandidates: candidates,
                  assignedCount: candidates.length
                }
              }
            } catch (error) {
              console.error(`Error fetching candidates for recruiter ${recruiterId}:`, error)
            }
            
            return {
              ...recruiter,
              assignedCandidates: [],
              assignedCount: 0
            }
          })
        )
        
        setRecruiterDetails(recruitersWithStats)
      }
    } catch (error) {
      console.error('Error loading recruiter details:', error)
    } finally {
      setLoadingRecruiterData(false)
    }
  }

  // Load job stats for a specific candidate
  const loadCandidateJobStats = async (candidateId: string) => {
    if (candidateJobStats[candidateId]) return // Already loaded

    try {
      const jobsRes = await fetchWithAuth(`/api/v1/admin/candidates/${candidateId}/applications`)
      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json()
        const jobs = Array.isArray(jobsJson) ? jobsJson : jobsJson?.data || []
        
        setCandidateJobStats(prev => ({
          ...prev,
          [candidateId]: {
            totalJobs: jobs.length,
            jobs: jobs,
            status: jobs.reduce((acc: Record<string, number>, job: any) => {
              const status = job.status || 'applied'
              acc[status] = (acc[status] || 0) + 1
              return acc
            }, {})
          }
        }))
      }
    } catch (error) {
      console.error(`Error loading job stats for candidate ${candidateId}:`, error)
    }
  }

  // Open recruiter detail modal
  const openRecruiterDetail = async (recruiter: any) => {
    setSelectedRecruiter(recruiter)
    setRecruiterCandidates(recruiter.assignedCandidates || [])
    
    // Load job stats for each candidate if not already loaded
    if (recruiter.assignedCandidates) {
      for (const candidate of recruiter.assignedCandidates) {
        const candidateId = candidate._id || candidate.id
        if (candidateId) {
          await loadCandidateJobStats(candidateId)
        }
      }
    }
    
    setShowRecruiterDetailModal(true)
  }

  // Close recruiter detail modal
  const closeRecruiterDetail = () => {
    setShowRecruiterDetailModal(false)
    setSelectedRecruiter(null)
    setRecruiterCandidates([])
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const statsRes = await fetchWithAuth('/api/v1/admin/dashboard')
        if (statsRes.status === 401) {
          console.error('Admin dashboard stats failed: 401 (unauthorized)')
          handleLogout()
          return
        }

        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          const data = statsJson?.data ?? statsJson
          if (data) setStats((prev) => ({ ...prev, ...data }))
        }

        const activityRes = await fetchWithAuth('/api/v1/admin/activity')
        if (activityRes.status === 401) {
          console.error('Admin activity failed: 401 (unauthorized)')
          handleLogout()
          return
        }

        if (activityRes.ok) {
          const activityJson = await activityRes.json()
          setRecentActivity(Array.isArray(activityJson) ? activityJson : activityJson?.data || [])
        }

        // Load daily resume generation report
        const reportRes = await fetchWithAuth('/api/v1/admin/reports/resumes/daily')
        if (reportRes.ok) {
          const reportJson = await reportRes.json()
          const reportData = reportJson?.data ?? reportJson
          setResumeReport(Array.isArray(reportData) ? reportData : [])
        }

        // Load recruiter details
        await loadRecruiterDetails()
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      }
    }

    const checkAdminAuth = async () => {
      try {
        const userStr = localStorage.getItem('infrapilot_user')
        const token = localStorage.getItem('infrapilot_token')

        if (!userStr || !token) {
          router.replace('/admin/login')
          return
        }

        const userData = JSON.parse(userStr)

        if (userData.role !== 'admin' && !userData.isAdmin) {
          router.replace('/admin/login')
          return
        }

        setUser(userData)
        setIsAuthenticated(true)

        await loadDashboardData()
      } catch (error) {
        console.error('Admin auth check failed:', error)
        router.replace('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-800 text-lg font-semibold">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  // Color palette for consistent theming
  const colors = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-purple-600 hover:bg-purple-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    pink: 'bg-pink-600 hover:bg-pink-700 text-white',
    teal: 'bg-teal-600 hover:bg-teal-700 text-white',
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-blue-100 text-sm">Welcome, {user?.name || 'Administrator'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors shadow-md"
        >
          Logout
        </button>
      </div>

      <div className="px-6 pt-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
              activeTab === 'dashboard' ? colors.primary : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
              activeTab === 'candidates' ? colors.success : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Candidates
          </button>
          <button
            onClick={() => setActiveTab('recruiters')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
              activeTab === 'recruiters' ? colors.secondary : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Recruiters
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
              activeTab === 'plans' ? colors.warning : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Plans
          </button>
          <button
  onClick={() => setActiveTab('reports')}
  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md ${
    activeTab === 'reports' ? colors.indigo : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  }`}
>
  Reports
</button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
                <p className="text-blue-100 text-sm">Total Candidates</p>
                <p className="text-3xl font-bold">{stats.totalCandidates}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow-lg text-white">
                <p className="text-green-100 text-sm">Active Subscriptions</p>
                <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
                <p className="text-yellow-100 text-sm">Pending Payments</p>
                <p className="text-3xl font-bold">{stats.pendingPayments}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
                <p className="text-purple-100 text-sm">Monthly Revenue</p>
                <p className="text-3xl font-bold">${stats.monthlyRevenue}</p>
              </div>
            </div>

            {/* Recruiter Stats Summary */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span> Recruiter Overview
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                  <p className="text-indigo-600 text-sm font-semibold">Total Recruiters</p>
                  <p className="text-3xl font-bold text-indigo-700">{recruiterDetails.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <p className="text-green-600 text-sm font-semibold">Active Recruiters</p>
                  <p className="text-3xl font-bold text-green-700">
                    {recruiterDetails.filter(r => r.isActive).length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <p className="text-purple-600 text-sm font-semibold">Total Assigned Candidates</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {recruiterDetails.reduce((sum, r) => sum + (r.assignedCount || 0), 0)}
                  </p>
                </div>
              </div>

              {loadingRecruiterData ? (
                <p className="text-gray-500">Loading recruiter data...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Recruiter</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Candidates</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recruiterDetails.map((recruiter, index) => (
                        <tr key={recruiter._id || recruiter.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {recruiter.firstName} {recruiter.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{recruiter.email}</p>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-600">{recruiter.department || '—'}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full font-semibold ${
                              recruiter.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {recruiter.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-indigo-600">{recruiter.assignedCount || 0}</span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openRecruiterDetail(recruiter)}
                              className={`px-3 py-1 text-xs rounded-lg ${colors.info} shadow-sm`}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🔄</span> Recent Activity
              </h2>
              {recentActivity.length === 0 ? (
                <p className="text-gray-500">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-white ${
                            item.color || 'bg-blue-500'
                          }`}
                        >
                          <span>{item.icon || '📌'}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{item.action}</p>
                          <p className="text-gray-500 text-sm">{item.user}</p>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">{item.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Resume Generation Report */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📄 Daily Resume Generation Report
              </h2>

              {resumeReport.length === 0 ? (
                <p className="text-gray-500">No resumes generated today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Recruiter
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Candidate
                        </th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Resumes Generated Today
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {resumeReport.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-3 font-semibold text-gray-800">
                            {row.recruiter}
                          </td>
                          <td className="p-3 text-gray-600">
                            {row.candidate}
                          </td>
                          <td className="p-3 font-bold text-purple-600">
                            {row.totalResumes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && <CandidateManagement />}
        {activeTab === 'recruiters' && <RecruiterManagement />}
        {activeTab === 'plans' && <PlanManagement />}
        {activeTab === 'reports' && <ReportsManagement />}
      </div>

      {/* Recruiter Detail Modal */}
      {showRecruiterDetailModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedRecruiter.firstName} {selectedRecruiter.lastName}
                </h3>
                <p className="text-blue-100 text-sm">{selectedRecruiter.email}</p>
              </div>
              <button
                onClick={closeRecruiterDetail}
                className="text-white hover:text-gray-200 text-2xl"
              >
                &times;
              </button>
            </div>
            

            <div className="p-6">
              {/* Recruiter Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-indigo-600 text-xs font-semibold uppercase">Department</p>
                  <p className="text-lg font-semibold text-indigo-800">{selectedRecruiter.department || '—'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-purple-600 text-xs font-semibold uppercase">Specialization</p>
                  <p className="text-lg font-semibold text-purple-800">{selectedRecruiter.specialization || '—'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-600 text-xs font-semibold uppercase">Max Candidates</p>
                  <p className="text-lg font-semibold text-green-800">{selectedRecruiter.maxCandidates || 20}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-600 text-xs font-semibold uppercase">Assigned</p>
                  <p className="text-lg font-semibold text-orange-800">
                    {selectedRecruiter.assignedCount || 0} / {selectedRecruiter.maxCandidates || 20}
                  </p>
                </div>
              </div>
              

              {/* Candidates List with Job Stats */}
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-xl">👥</span> Assigned Candidates ({recruiterCandidates.length})
              </h4>
              
              {recruiterCandidates.length === 0 ? (
                <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">No candidates assigned</p>
              ) : (
                <div className="space-y-3">
                  {recruiterCandidates.map((candidate) => {
                    const candidateId = candidate._id || candidate.id
                    const jobStats = candidateJobStats[candidateId] || { totalJobs: 0, jobs: [], status: {} }
                    
                    return (
                      <div key={candidateId} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`}</p>
                            <p className="text-sm text-gray-600">{candidate.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Target: {candidate.targetRole || 'Not specified'}</p>
                          </div>
                          <div className="mt-3 md:mt-0 flex flex-wrap gap-2">
                            <div className="bg-blue-100 px-3 py-1 rounded-full">
                              <span className="text-xs font-semibold text-blue-700">Jobs: {jobStats.totalJobs}</span>
                            </div>
                            {jobStats.status && Object.entries(jobStats.status).map(([status, count]) => (
                              <div key={status} className="bg-gray-200 px-3 py-1 rounded-full">
                                <span className="text-xs font-semibold text-gray-700">
                                  {status}: {count as number}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Show job applications if any */}
                        {jobStats.jobs && jobStats.jobs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">Recent Applications:</p>
                            <div className="flex flex-wrap gap-2">
                              {jobStats.jobs.slice(0, 3).map((job: any, idx: number) => (
                                <div key={idx} className="bg-white px-2 py-1 rounded text-xs border border-gray-200">
                                  {job.title || job.position || 'Position'} at {job.company}
                                </div>
                              ))}
                              {jobStats.jobs.length > 3 && (
                                <div className="text-xs text-gray-500 px-2 py-1">
                                  +{jobStats.jobs.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary Statistics */}
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">📈</span> Summary Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Total Candidates</p>
                    <p className="text-xl font-bold text-indigo-600">{recruiterCandidates.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Total Job Applications</p>
                    <p className="text-xl font-bold text-purple-600">
                      {recruiterCandidates.reduce((sum, c) => {
                        const id = c._id || c.id
                        return sum + (candidateJobStats[id]?.totalJobs || 0)
                      }, 0)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Candidates with Jobs</p>
                    <p className="text-xl font-bold text-green-600">
                      {recruiterCandidates.filter(c => {
                        const id = c._id || c.id
                        return (candidateJobStats[id]?.totalJobs || 0) > 0
                      }).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Avg Apps/Candidate</p>
                    <p className="text-xl font-bold text-orange-600">
                      {recruiterCandidates.length > 0
                        ? (recruiterCandidates.reduce((sum, c) => {
                            const id = c._id || c.id
                            return sum + (candidateJobStats[id]?.totalJobs || 0)
                          }, 0) / recruiterCandidates.length).toFixed(1)
                        : 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={closeRecruiterDetail}
                className={`px-4 py-2 rounded-lg ${colors.primary} shadow-md`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}