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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700 font-medium">Loading your dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="bg-white/20 p-2 rounded-lg">👤</span>
              Welcome, {candidateName}
            </h1>
            <p className="text-blue-100 text-sm">
              Track your applications and download the resume used
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center gap-2"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6 flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            {error}
          </div>
        )}

        {/* Latest Highlight */}
        {latestApplication && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-md">
            <h2 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
              <span className="bg-indigo-100 p-2 rounded-lg text-indigo-600">✨</span>
              Latest Application
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Job ID</span>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {latestApplication.jobId || '-'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Company</span>
                <div className="text-lg font-bold text-gray-800 mt-1">
                  {latestApplication.companyName || '-'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-100 md:col-span-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Job Description</span>
                <div className="text-sm text-gray-700 mt-2">
                  {latestApplication.description ||
                    latestApplication.jobDescriptionFull ||
                    '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-purple-100 p-2 rounded-lg text-purple-600">📋</span>
              My Applications ({sortedApplications.length})
            </h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-600 font-medium">No applications found.</p>
              <p className="text-sm text-gray-500 mt-2">Your applied jobs will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
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
                  {sortedApplications.map((app) => {
                    const fullText =
                      app.description || app.jobDescriptionFull || '-'

                    const isExpanded = expandedId === app._id

                    const getStatusColor = (status: string) => {
                      const colors: any = {
                        pending: 'bg-yellow-100 text-yellow-700',
                        approved: 'bg-green-100 text-green-700',
                        rejected: 'bg-red-100 text-red-700',
                        interview: 'bg-blue-100 text-blue-700',
                        hired: 'bg-purple-100 text-purple-700',
                      }
                      return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700'
                    }

                    return (
                      <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">
                            {app.jobTitle || 'Position'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {app.companyName}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-mono text-sm text-gray-600">
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
                              className="text-blue-600 text-xs mt-1 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>Show Less <span>↑</span></>
                              ) : (
                                <>View Full <span>↓</span></>
                              )}
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                            {app.status || 'Pending'}
                          </span>
                        </td>

                        <td className="p-4 text-sm text-gray-600">
                          {new Date(app.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => downloadResume(app?.resumeText)}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all"
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
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-800">{sortedApplications.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {sortedApplications.filter(a => a.status?.toLowerCase() === 'pending').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Interview</p>
              <p className="text-2xl font-bold text-blue-600">
                {sortedApplications.filter(a => a.status?.toLowerCase() === 'interview').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Hired</p>
              <p className="text-2xl font-bold text-green-600">
                {sortedApplications.filter(a => a.status?.toLowerCase() === 'hired').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}