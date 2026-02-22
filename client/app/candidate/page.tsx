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
      await fetchWithAuth('/api/v1/auth/logout', { method: 'POST' })
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
    } catch {
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
    } catch {
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
        headers: { 'Content-Type': 'application/json' },
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
    } catch {
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
    return [...applications].sort(
      (a, b) =>
        new Date(b.appliedDate).getTime() -
        new Date(a.appliedDate).getTime()
    )
  }, [applications])

  const latestApplication = sortedApplications[0] || null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg font-medium">
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white shadow-sm border-b px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Candidate Job Applications
          </h1>
          <p className="text-sm text-gray-500">
            Welcome back, {candidateName}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
        >
          Logout
        </button>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* LATEST APPLICATION CARD */}
        {latestApplication && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-bold text-blue-700 mb-4">
              Latest Application
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-500">Job Title</p>
                <p className="font-semibold text-gray-800">
                  {latestApplication.jobTitle}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Job ID</p>
                <p className="font-semibold text-gray-800">
                  {latestApplication.jobId || '-'}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-gray-500">Description</p>
                <p className="text-gray-700 mt-1">
                  {latestApplication.description ||
                    latestApplication.jobDescriptionFull ||
                    '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* APPLICATIONS TABLE */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-100">
            <h2 className="font-semibold text-gray-700">
              My Applications
            </h2>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="p-4 text-left">Job</th>
                    <th className="p-4 text-left">Job ID</th>
                    <th className="p-4 text-left">Description</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Applied</th>
                    <th className="p-4 text-left">Resume</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {sortedApplications.map((app) => {
                    const fullText =
                      app.description || app.jobDescriptionFull || '-'
                    const isExpanded = expandedId === app._id

                    return (
                      <tr key={app._id} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">
                            {app.jobTitle}
                          </div>
                          <div className="text-xs text-gray-500">
                            {app.companyName}
                          </div>
                        </td>

                        <td className="p-4">{app.jobId || '-'}</td>

                        <td className="p-4 max-w-xs">
                          <div className={isExpanded ? '' : 'truncate'}>
                            {fullText}
                          </div>

                          {fullText.length > 100 && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : app._id)
                              }
                              className="text-blue-600 text-xs mt-1 hover:underline"
                            >
                              {isExpanded ? 'Show Less' : 'View Full'}
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 capitalize">
                            {app.status}
                          </span>
                        </td>

                        <td className="p-4">
                          {new Date(app.appliedDate).toLocaleDateString()}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() =>
                              downloadResume(app?.resumeText)
                            }
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-xs font-semibold transition"
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