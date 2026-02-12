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

  const downloadResume = (url?: string) => {
    if (!url) {
      alert('No resume available')
      return
    }

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  // 🔥 NEW: Latest application (FIRST VISIBLE)
  const latestApplication = sortedApplications[0] || null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading candidate dashboard…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {candidateName}
          </h1>
          <p className="text-gray-400 text-sm">
            Track your applications and download the resume used
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-semibold"
        >
          Logout
        </button>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-200 mb-4">
            {error}
          </div>
        )}

        {/* 🔥 NEW: Highlight Job ID + Description FIRST */}
        {latestApplication && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-3 text-blue-300">
              Latest Application
            </h2>

            <div className="mb-4">
              <span className="text-gray-400 text-sm">Job ID:</span>
              <div className="text-lg font-semibold">
                {latestApplication.jobId || '-'}
              </div>
            </div>

            <div>
              <span className="text-gray-400 text-sm">Job Description:</span>
              <div className="text-sm mt-1">
                {latestApplication.description ||
                  latestApplication.jobDescriptionFull ||
                  '-'}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">My Applications</h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 text-left">
                  <tr>
                    <th className="p-4">Job Title</th>
                    <th className="p-4">Job ID</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Applied</th>
                    <th className="p-4">Resume</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700">
                  {sortedApplications.map((app) => (
                    <tr key={app._id}>
                      <td className="p-4 font-semibold">
                        {app.jobTitle}
                        <div className="text-xs text-gray-400">
                          {app.companyName}
                        </div>
                      </td>

                      <td className="p-4">{app.jobId || '-'}</td>

                      <td className="p-4 text-sm max-w-xs truncate">
                        {app.description || app.jobDescriptionFull || '-'}
                      </td>

                      <td className="p-4 capitalize">{app.status}</td>

                      <td className="p-4">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() =>
                            downloadResume(app?.resumeUsed?.fileUrl)
                          }
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
