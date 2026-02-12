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
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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
      const raw =
        localStorage.getItem('infrapilot_user') ||
        localStorage.getItem('candidate_user') ||
        localStorage.getItem('user')

      if (!raw) return 'Candidate'

      const user = JSON.parse(raw)

      const first = user?.firstName || user?.first_name
      const last = user?.lastName || user?.last_name
      const full = user?.name || user?.fullName || user?.full_name

      const composed =
        (first || last) && `${first || ''} ${last || ''}`.trim()
      return composed || full || user?.email || 'Candidate'
    } catch {
      return 'Candidate'
    }
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

  // 🔥 UPDATED: Download using resumeUrl from backend
  const downloadResumeUsed = (resumeUrl: string | null) => {
    if (!resumeUrl) {
      alert('No resume available for this application.')
      return
    }

    window.open(resumeUrl, '_blank')
  }

  const sortedApplications = useMemo(() => {
    const copy = [...applications]
    copy.sort((a: any, b: any) => {
      const da = new Date(a?.appliedDate || 0).getTime()
      const db = new Date(b?.appliedDate || 0).getTime()
      return db - da
    })
    return copy
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
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">
            Welcome, <span className="text-white">{candidateName}</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Track your applications and download the resume used
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
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
            <p className="text-sm text-gray-400">
              View job details and download the resume used for each application
            </p>
          </div>

          {sortedApplications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200 w-[34%]">
                      Job
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200 w-[16%]">
                      Job ID
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200 w-[16%]">
                      Status
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200 w-[16%]">
                      Applied
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200 w-[18%]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700">
                  {sortedApplications.map((a: any) => {
                    const id = a._id || a.id
                    const jobTitle = a.jobTitle || 'Job'
                    const jobId = a.jobId || '-'
                    const status = a.status || 'Applied'
                    const appliedAt = a.appliedDate
                    const expanded = openId === id

                    return (
                      <>
                        <tr key={id} className="hover:bg-gray-900/40 align-top">
                          <td className="p-4">
                            <p className="font-semibold truncate" title={jobTitle}>
                              {jobTitle}
                            </p>
                          </td>

                          <td className="p-4 text-gray-300">
                            <span className="block truncate" title={String(jobId)}>
                              {jobId}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-blue-900/40 border border-blue-700 text-blue-200 text-xs">
                              {status}
                            </span>
                          </td>

                          <td className="p-4 text-gray-300">
                            {appliedAt ? new Date(appliedAt).toLocaleDateString() : '-'}
                          </td>

                          <td className="p-4">
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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
                                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded whitespace-nowrap"
                              >
                                {expanded ? 'Hide Job' : 'View Job'}
                              </button>

                              <button
                                onClick={() => downloadResumeUsed(a.resumeUrl)}
                                className="px-3 py-2 text-sm bg-green-700 hover:bg-green-600 rounded whitespace-nowrap"
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
                                <p className="text-sm text-gray-400 mb-2">
                                  Full Job Description
                                </p>

                                {detailLoading ? (
                                  <div className="text-gray-300">
                                    Loading job description…
                                  </div>
                                ) : (
                                  <div className="whitespace-pre-wrap text-gray-200 text-sm">
                                    {detail?.jobDescription ||
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
