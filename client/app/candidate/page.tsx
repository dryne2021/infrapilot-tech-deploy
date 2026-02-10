'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

type Application = any

export default function CandidateDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(false)
  const [error, setError] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const clearAuthAndGoLogin = () => {
    try {
      localStorage.removeItem('infrapilot_user')
      localStorage.removeItem('infrapilot_token')
      localStorage.removeItem('candidate_authenticated')
    } catch {}
    router.replace('/candidate/login')
  }

  const loadApplications = async () => {
    setError('')
    setAppsLoading(true)
    try {
      const res = await fetchWithAuth('/api/v1/candidate/applications')
      if (res.status === 401) return clearAuthAndGoLogin()
      const json = await res.json().catch(() => ({}))
      const list = json?.data ?? json
      setApplications(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load applications')
    } finally {
      setAppsLoading(false)
    }
  }

  const loadApplicationDetail = async (id: string) => {
    setDetailLoading(true)
    setError('')
    try {
      const res = await fetchWithAuth(`/api/v1/candidate/applications/${id}`)
      if (res.status === 401) return clearAuthAndGoLogin()
      const json = await res.json().catch(() => ({}))
      setDetail(json?.data ?? json)
    } catch (e: any) {
      setError(e?.message || 'Failed to load application details')
    } finally {
      setDetailLoading(false)
    }
  }

  // ✅ download the resume used for THIS application
  const downloadResumeUsed = (applicationId: string) => {
    // best: backend returns the file stream
    window.open(`/api/v1/candidate/applications/${applicationId}/resume`, '_blank')
  }

  useEffect(() => {
    ;(async () => {
      try {
        const token = localStorage.getItem('infrapilot_token')
        if (!token) return clearAuthAndGoLogin()
        await loadApplications()
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
          <p className="text-gray-400 text-sm">Track your applications and download the resume used</p>
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

      <div className="px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">My Applications</h2>
            <p className="text-sm text-gray-400">Job ID • full job description • resume used</p>
          </div>

          {applications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">Job</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">Job ID</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">Applied</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {applications.map((a: any) => {
                    const id = a._id || a.id
                    const job = a.job || a.jobId || a.jobDetails || {}
                    const jobTitle = job.title || a.jobTitle || 'Job'
                    const jobId = job.jobId || job.publicId || job._id || a.jobId || '-'
                    const status = a.status || 'Applied'
                    const appliedAt = a.appliedAt || a.createdAt

                    const expanded = openId === id

                    return (
                      <>
                        <tr key={id} className="hover:bg-gray-900/40">
                          <td className="p-4">
                            <p className="font-semibold">{jobTitle}</p>
                          </td>
                          <td className="p-4 text-gray-300">{jobId}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 rounded bg-blue-900/40 border border-blue-700 text-blue-200 text-xs">
                              {status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">
                            {appliedAt ? new Date(appliedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={async () => {
                                  if (expanded) {
                                    setOpenId(null)
                                    setDetail(null)
                                    return
                                  }
                                  setOpenId(id)
                                  await loadApplicationDetail(id)
                                }}
                                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
                              >
                                {expanded ? 'Hide Job' : 'View Job'}
                              </button>

                              <button
                                onClick={() => downloadResumeUsed(id)}
                                className="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded"
                              >
                                Download Resume Used
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={5} className="p-4 bg-gray-900/30">
                              <div className="rounded-lg border border-gray-700 p-4">
                                <p className="text-sm text-gray-400 mb-2">Full Job Description</p>

                                {detailLoading ? (
                                  <div className="text-gray-300">Loading job description…</div>
                                ) : (
                                  <div className="whitespace-pre-wrap text-gray-200 text-sm">
                                    {detail?.job?.description ||
                                      detail?.jobDescription ||
                                      detail?.job?.fullDescription ||
                                      'No description available.'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
