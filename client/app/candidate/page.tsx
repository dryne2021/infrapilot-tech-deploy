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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading candidate dashboard…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#1a4978] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Zero2Hire</h1>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Welcome back, {candidateName}
            </div>
            <button
              onClick={handleLogout}
              className="bg-white text-[#1a4978] px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Applications Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Applications</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm space-y-1">
            <div><span className="font-medium">FULL NAME:</span> {candidateName}</div>
            <div><span className="font-medium">EMAIL ADDRESS:</span> {candidateId || 'Not available'}</div>
            <div><span className="font-medium">PHONE NUMBER:</span> Not available</div>
            <div><span className="font-medium">JOB ROLE:</span> Not available</div>
            <div><span className="font-medium">SUBSCRIPTION TYPE:</span> Not available</div>
            <div><span className="font-medium">SUBSCRIPTION EXPIRY DATE:</span> Not available</div>
          </div>
        </div>

        <hr className="my-6 border-gray-300" />

        {/* Generate Resume Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Generate Resume</h2>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Job ID<span className="text-red-500">*</span>:
              </label>
              <input 
                type="text" 
                placeholder="Enter or paste the Job ID"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4978]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Job Description:
              </label>
              <textarea 
                rows={3}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4978]"
              ></textarea>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-300" />

        {/* Job Applications Table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Job Applications</h2>
          
          {sortedApplications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded">
              No applications found.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Job ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Job Description</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Resumé Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedApplications.map((app) => {
                    const fullText =
                      app.description || app.jobDescriptionFull || '-'
                    
                    const isExpanded = expandedId === app._id
                    
                    // Truncate description to first ~100 characters for preview
                    const previewText = fullText.length > 100 
                      ? fullText.substring(0, 100) + '...' 
                      : fullText

                    return (
                      <tr key={app._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">
                          {app.jobId || '-'}
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="text-gray-600">
                            {isExpanded ? fullText : previewText}
                          </div>
                          {fullText.length > 100 && (
                            <button
                              onClick={() =>
                                setExpandedId(
                                  isExpanded ? null : app._id
                                )
                              }
                              className="text-[#1a4978] text-xs mt-1 hover:underline"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-green-600 font-medium">
                            Generated
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(app.appliedDate).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          })}, {new Date(app.appliedDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => downloadResume(app?.resumeText)}
                            className="text-[#1a4978] hover:text-[#0f2d4a] text-lg"
                            title="Download Resume"
                          >
                            🔗
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