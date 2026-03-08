'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

export default function CandidateDashboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applications, setApplications] = useState<any[]>([])
  const [candidateName, setCandidateName] = useState('Candidate')
  const [candidateId, setCandidateId] = useState<string | null>(null)

  // Track expanded job description
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const redirectToLogin = () => {
    router.replace('/candidate/login')
  }

  const handleLogout = async () => {
    try {
      await fetchWithAuth('/api/v1/auth/logout', {
        method: 'POST',
      })
    } catch (err) {
      console.error('Logout failed')
    }

    router.replace('/candidate/login')
  }

  const loadProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/auth/me')

      if (res.status === 401) {
        redirectToLogin()
        return null
      }

      const data = await res.json()

      if (!data?.profile?._id) {
        setError('Candidate profile not found.')
        return null
      }

      setCandidateName(data.user?.name || 'Candidate')
      setCandidateId(data.profile._id)

      return data.profile._id
    } catch (err: any) {
      setError('Failed to load profile')
      return null
    }
  }

  const loadApplications = async (cid: string) => {
    try {
      const res = await fetchWithAuth(
        `/api/v1/job-applications/candidate/${cid}`
      )

      if (res.status === 401) {
        redirectToLogin()
        return
      }

      const data = await res.json()
      setApplications(data?.jobs || [])
    } catch (err: any) {
      setError('Failed to load applications')
    }
  }

  const downloadResume = async (resumeText?: string) => {
    if (!resumeText) {
      alert('No resume available')
      return
    }

    try {
      const res = await fetchWithAuth('/api/v1/resume/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: resumeText,
          name: candidateName,
        }),
      })

      if (!res.ok) {
        alert('Failed to generate resume file')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `Resume_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Error downloading resume')
    }
  }

  useEffect(() => {
    ;(async () => {
      const cid = await loadProfile()
      if (cid) await loadApplications(cid)
      setLoading(false)
    })()
  }, [])

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      return (
        new Date(b.appliedDate).getTime() -
        new Date(a.appliedDate).getTime()
      )
    })
  }, [applications])

  const latestApplication = sortedApplications[0] || null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700 font-medium">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">👤</span>
              Welcome, {candidateName}
            </h1>
            <p className="text-blue-100 text-sm">
              Track your applications and download the resume used
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2 hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 text-red-700 mb-6 flex items-center gap-3 shadow-md">
            <span className="text-red-500 text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Latest Highlight */}
        {latestApplication && (
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
              <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shadow-sm">✨</span>
              Latest Application
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  Job ID
                </span>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {latestApplication.jobId || '-'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                  Company
                </span>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {latestApplication.companyName || '-'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
                  Job Description
                </span>
                <div className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {latestApplication.description ||
                    latestApplication.jobDescriptionFull ||
                    '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-purple-100 p-2 rounded-lg text-purple-600 shadow-sm">📋</span>
              My Applications 
              <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-sm ml-2">
                {sortedApplications.length}
              </span>
            </h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4 opacity-50">📭</div>
              <p className="text-gray-600 font-medium">No applications found.</p>
              <p className="text-sm text-gray-500 mt-2">Your applied jobs will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job Title</th>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Job ID</th>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Applied</th>
                    <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resume</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {sortedApplications.map((app, index) => {
                    const fullText =
                      app.description || app.jobDescriptionFull || '-'

                    const isExpanded = expandedId === app._id

                    const getStatusColor = (status: string) => {
                      const colors: any = {
                        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                        applied: 'bg-blue-100 text-blue-700 border-blue-200',
                        approved: 'bg-green-100 text-green-700 border-green-200',
                        rejected: 'bg-red-100 text-red-700 border-red-200',
                        interview: 'bg-purple-100 text-purple-700 border-purple-200',
                        hired: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        reviewing: 'bg-orange-100 text-orange-700 border-orange-200',
                      }
                      return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'
                    }

                    const getStatusIcon = (status: string) => {
                      const icons: any = {
                        pending: '⏳',
                        applied: '📝',
                        approved: '✅',
                        rejected: '❌',
                        interview: '🎯',
                        hired: '🎉',
                        reviewing: '👀',
                      }
                      return icons[status?.toLowerCase()] || '📌'
                    }

                    return (
                      <tr key={app._id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all group">
                        <td className="p-4">
                          <div className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {app.jobTitle || 'Position Applied'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            {app.companyName || 'Company'}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-mono text-sm bg-gray-50 px-2 py-1 rounded border border-gray-200 text-gray-600">
                            {app.jobId || '-'}
                          </span>
                        </td>

                        <td className="p-4 text-sm max-w-xs">
                          <div className={isExpanded ? 'text-gray-700' : 'truncate text-gray-700'}>
                            {fullText}
                          </div>

                          {fullText.length > 100 && (
                            <button
                              onClick={() =>
                                setExpandedId(
                                  isExpanded ? null : app._id
                                )
                              }
                              className="text-blue-600 text-xs mt-1 hover:text-blue-800 font-medium flex items-center gap-1 group"
                            >
                              <span className="bg-blue-50 px-2 py-0.5 rounded-full group-hover:bg-blue-100 transition-colors">
                                {isExpanded ? (
                                  <>Show Less ↑</>
                                ) : (
                                  <>View Full ↓</>
                                )}
                              </span>
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                            <span>{getStatusIcon(app.status)}</span>
                            {app.status || 'Pending'}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-400">📅</span>
                            <span className="text-gray-600 font-medium">
                              {new Date(app.appliedDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => downloadResume(app?.resumeText)}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                          >
                            <span>📥</span> Download
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {sortedApplications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Applications</p>
                  <p className="text-3xl font-bold mt-1">{sortedApplications.length}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold mt-1">
                    {sortedApplications.filter(a => a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'applied').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white text-xl">⏳</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Interview</p>
                  <p className="text-3xl font-bold mt-1">
                    {sortedApplications.filter(a => a.status?.toLowerCase() === 'interview').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white text-xl">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Hired</p>
                  <p className="text-3xl font-bold mt-1">
                    {sortedApplications.filter(a => a.status?.toLowerCase() === 'hired').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white text-xl">🎉</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Timeline (optional enhancement) */}
        {sortedApplications.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-amber-100 p-2 rounded-lg text-amber-600">⏱️</span>
              Recent Activity
            </h3>
            <div className="space-y-3">
              {sortedApplications.slice(0, 3).map((app) => (
                <div key={app._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    {app.status?.toLowerCase() === 'hired' ? '🎉' : 
                     app.status?.toLowerCase() === 'interview' ? '🎯' : '📝'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      Applied to {app.jobTitle || 'position'} at {app.companyName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(app.appliedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                    {app.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}