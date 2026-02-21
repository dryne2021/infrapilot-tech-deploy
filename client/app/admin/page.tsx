'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

  // ✅ New state for recruiter data
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

  // ✅ Load all recruiters with their assigned candidates
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

  // ✅ Load job stats for a specific candidate
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

  // ✅ Open recruiter detail modal
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

  // ✅ Close recruiter detail modal
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

        // ✅ Load recruiter details
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
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

            {/* ✅ Recruiter Stats Summary */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold mb-4">📊 Recruiter Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm">Total Recruiters</p>
                  <p className="text-2xl font-bold">{recruiterDetails.length}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm">Active Recruiters</p>
                  <p className="text-2xl font-bold">
                    {recruiterDetails.filter(r => r.isActive).length}
                  </p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm">Total Assigned Candidates</p>
                  <p className="text-2xl font-bold">
                    {recruiterDetails.reduce((sum, r) => sum + (r.assignedCount || 0), 0)}
                  </p>
                </div>
              </div>

              {loadingRecruiterData ? (
                <p className="text-gray-400">Loading recruiter data...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-400">Recruiter</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-400">Department</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-400">Status</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-400">Assigned Candidates</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recruiterDetails.map((recruiter) => (
                        <tr key={recruiter._id || recruiter.id} className="hover:bg-gray-750">
                          <td className="p-3">
                            <div>
                              <p className="font-semibold">
                                {recruiter.firstName} {recruiter.lastName}
                              </p>
                              <p className="text-xs text-gray-400">{recruiter.email}</p>
                            </div>
                          </td>
                          <td className="p-3 text-sm">{recruiter.department || '—'}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              recruiter.isActive 
                                ? 'bg-green-900 text-green-200' 
                                : 'bg-red-900 text-red-200'
                            }`}>
                              {recruiter.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-semibold">{recruiter.assignedCount || 0}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openRecruiterDetail(recruiter)}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg"
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

      {/* ✅ Recruiter Detail Modal */}
      {showRecruiterDetailModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">
                  {selectedRecruiter.firstName} {selectedRecruiter.lastName}
                </h3>
                <p className="text-gray-400 text-sm">{selectedRecruiter.email}</p>
              </div>
              <button
                onClick={closeRecruiterDetail}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              {/* Recruiter Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Department</p>
                  <p className="text-lg font-semibold">{selectedRecruiter.department || '—'}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Specialization</p>
                  <p className="text-lg font-semibold">{selectedRecruiter.specialization || '—'}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Max Candidates</p>
                  <p className="text-lg font-semibold">{selectedRecruiter.maxCandidates || 20}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Assigned</p>
                  <p className="text-lg font-semibold">{selectedRecruiter.assignedCount || 0} / {selectedRecruiter.maxCandidates || 20}</p>
                </div>
              </div>

              {/* Candidates List with Job Stats */}
              <h4 className="font-semibold mb-3">Assigned Candidates ({recruiterCandidates.length})</h4>
              
              {recruiterCandidates.length === 0 ? (
                <p className="text-gray-400 bg-gray-900 p-4 rounded-lg">No candidates assigned</p>
              ) : (
                <div className="space-y-3">
                  {recruiterCandidates.map((candidate) => {
                    const candidateId = candidate._id || candidate.id
                    const jobStats = candidateJobStats[candidateId] || { totalJobs: 0, jobs: [], status: {} }
                    
                    return (
                      <div key={candidateId} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`}</p>
                            <p className="text-sm text-gray-400">{candidate.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Target: {candidate.targetRole || 'Not specified'}</p>
                          </div>
                          <div className="mt-3 md:mt-0 flex gap-2">
                            <div className="bg-blue-900/30 px-3 py-1 rounded-full">
                              <span className="text-xs text-blue-400">Jobs: {jobStats.totalJobs}</span>
                            </div>
                            {/* FIXED: Type assertion for count */}
                            {jobStats.status && Object.entries(jobStats.status).map(([status, count]) => (
                              <div key={status} className="bg-gray-700 px-3 py-1 rounded-full">
                                <span className="text-xs text-gray-300">
                                  {status}: {count as number}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Show job applications if any */}
                        {jobStats.jobs && jobStats.jobs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-2">Recent Applications:</p>
                            <div className="flex flex-wrap gap-2">
                              {jobStats.jobs.slice(0, 3).map((job: any, idx: number) => (
                                <div key={idx} className="bg-gray-800 px-2 py-1 rounded text-xs">
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

              {/* Summary Stats */}
              <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold mb-3">Summary Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Total Candidates</p>
                    <p className="text-lg font-semibold">{recruiterCandidates.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Job Applications</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {recruiterCandidates.reduce((sum, c) => {
                        const id = c._id || c.id
                        return sum + (candidateJobStats[id]?.totalJobs || 0)
                      }, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Candidates with Jobs</p>
                    <p className="text-lg font-semibold">
                      {recruiterCandidates.filter(c => {
                        const id = c._id || c.id
                        return (candidateJobStats[id]?.totalJobs || 0) > 0
                      }).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg Apps/Candidate</p>
                    <p className="text-lg font-semibold">
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

            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end">
              <button
                onClick={closeRecruiterDetail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
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