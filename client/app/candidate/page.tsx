'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

type Application = any

export default function CandidateDashboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(false)
  const [error, setError] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [candidateName, setCandidateName] = useState<string>('Candidate')

  const clearAuthAndGoLogin = () => {
    try {
      localStorage.removeItem('infrapilot_user')
      localStorage.removeItem('infrapilot_token')
      localStorage.removeItem('candidate_authenticated')
    } catch {}
    router.replace('/candidate/login')
  }

  const resolveCandidateName = () => {
    try {
      const raw = localStorage.getItem('infrapilot_user')
      if (!raw) return 'Candidate'
      const user = JSON.parse(raw)
      return user?.name || user?.email || 'Candidate'
    } catch {
      return 'Candidate'
    }
  }

  // ✅ FIXED — USES user.id
  const loadApplications = async () => {
    setError('')
    setAppsLoading(true)

    try {
      const rawUser = localStorage.getItem('infrapilot_user')
      if (!rawUser) return clearAuthAndGoLogin()

      const user = JSON.parse(rawUser)

      // 🔥 IMPORTANT FIX HERE
      const candidateId =
        user?.candidateId ||
        user?._id ||
        user?.id

      if (!candidateId) {
        setError('Candidate ID not found.')
        return
      }

      const res = await fetchWithAuth(
        `/api/v1/job-applications/candidate/${candidateId}`
      )

      if (res.status === 401) return clearAuthAndGoLogin()

      const json = await res.json()
      setApplications(json?.jobs || [])

    } catch (e: any) {
      setError(e?.message || 'Failed to load applications')
    } finally {
      setAppsLoading(false)
    }
  }

  const downloadResumeUsed = (fileUrl?: string) => {
    if (!fileUrl) {
      alert('No resume available for this application.')
      return
    }

    const link = document.createElement('a')
    link.href = fileUrl
    link.target = '_blank'
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a: any, b: any) => {
      const da = new Date(a?.appliedDate || 0).getTime()
      const db = new Date(b?.appliedDate || 0).getTime()
      return db - da
    })
  }, [applications])

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('infrapilot_token')
        if (!token) return clearAuthAndGoLogin()

        setCandidateName(resolveCandidateName())
        await loadApplications()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading candidate dashboard…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, <span>{candidateName}</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Track your applications and download the resume used
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold"
          >
            {appsLoading ? 'Refreshing…' : 'Refresh'}
          </button>

          <button
            onClick={clearAuthAndGoLogin}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-200">
            {error}
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
                <thead className="bg-gray-900">
                  <tr>
                    <th className="p-4 text-left">Job Title</th>
                    <th className="p-4 text-left">Job ID</th>
                    <th className="p-4 text-left">Description</th>
                    <th className="p-4 text-left">Resume Status</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Applied</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700">
                  {sortedApplications.map((a: any) => {
                    const resumeUrl = a?.resumeUsed?.fileUrl

                    return (
                      <tr key={a._id} className="hover:bg-gray-900/40">
                        <td className="p-4 font-semibold">
                          {a.jobTitle}
                          <div className="text-xs text-gray-400">
                            {a.companyName}
                          </div>
                        </td>

                        <td className="p-4 text-gray-300">
                          {a.jobId || '-'}
                        </td>

                        <td className="p-4 text-gray-300 text-sm max-w-xs truncate">
                          {a.description || a.jobDescriptionFull || '-'}
                        </td>

                        <td className="p-4 text-sm">
                          {a.resumeStatus || 'Pending'}
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-1 bg-blue-900/40 border border-blue-700 text-blue-200 rounded text-xs capitalize">
                            {a.status}
                          </span>
                        </td>

                        <td className="p-4 text-gray-300">
                          {a.appliedDate
                            ? new Date(a.appliedDate).toLocaleDateString()
                            : '-'}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => downloadResumeUsed(resumeUrl)}
                            disabled={!resumeUrl}
                            className={`px-3 py-2 text-sm rounded ${
                              resumeUrl
                                ? 'bg-green-700 hover:bg-green-600'
                                : 'bg-gray-600 cursor-not-allowed'
                            }`}
                          >
                            Download Resume
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
