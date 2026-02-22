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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading candidate dashboard…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {candidateName}
            </h1>
            <p className="text-gray-500 text-sm">
              Track your applications and download your resumes
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Latest Application Card */}
        {latestApplication && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              Latest Application
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Job ID</span>
                <div className="font-medium text-gray-900">
                  {latestApplication.jobId || '-'}
                </div>
              </div>

              <div className="md:col-span-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Job Description</span>
                <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {latestApplication.description ||
                    latestApplication.jobDescriptionFull ||
                    '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Application History</h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Job Title</th>
                    <th className="px-5 py-3 font-medium">Job ID</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Applied</th>
                    <th className="px-5 py-3 font-medium">Resume</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {sortedApplications.map((app) => {
                    const fullText =
                      app.description || app.jobDescriptionFull || '-'

                    const isExpanded = expandedId === app._id

                    return (
                      <tr key={app._id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">
                            {app.jobTitle}
                          </div>
                          <div className="text-xs text-gray-500">
                            {app.companyName}
                          </div>
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {app.jobId || '-'}
                        </td>

                        <td className="px-5 py-3 max-w-xs">
                          <div className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {fullText}
                          </div>

                          {fullText.length > 100 && (
                            <button
                              onClick={() =>
                                setExpandedId(
                                  isExpanded ? null : app._id
                                )
                              }
                              className="text-blue-600 text-xs mt-1 hover:text-blue-800 font-medium"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${app.status === 'applied' ? 'bg-blue-100 text-blue-800' : ''}
                            ${app.status === 'reviewed' ? 'bg-purple-100 text-purple-800' : ''}
                            ${app.status === 'interviewed' ? 'bg-green-100 text-green-800' : ''}
                            ${app.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                            ${app.status === 'hired' ? 'bg-emerald-100 text-emerald-800' : ''}
                          `}>
                            {app.status}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(app.appliedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>

                        <td className="px-5 py-3">
                          <button
                            onClick={() => downloadResume(app?.resumeText)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            Download
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
      </div>
    </div>
  )
}