'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * RecruiterManagement.jsx
 * - Uses REAL backend (MongoDB)
 * - NO localhost fallback
 * - Reads NEXT_PUBLIC_API_BASE_URL correctly
 */

/* ============================
   ✅ FIXED API BASE
============================ */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

function authHeaders() {
  const token = localStorage.getItem('infrapilot_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function api(path, options = {}) {
  if (!API_BASE) throw new Error('API base URL not configured')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

const normalizeId = (obj) => obj?._id || obj?.id

const RecruiterManagement = () => {
  const [recruiters, setRecruiters] = useState([])
  const [availableCandidates, setAvailableCandidates] = useState([])
  const [assignedCandidatesMap, setAssignedCandidatesMap] = useState({})
  const [selectedRecruiter, setSelectedRecruiter] = useState(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssignCandidates, setShowAssignCandidates] = useState(false)
  const [loading, setLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    department: 'Technical',
    specialization: 'IT/Software',
    maxCandidates: 20,
    isActive: true,
  })

  const departments = ['Technical', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Operations', 'HR']

  const specializations = {
    Technical: ['IT/Software', 'Engineering', 'Data Science', 'Cybersecurity'],
    Finance: ['Banking', 'Accounting', 'FinTech'],
    Healthcare: ['Medical', 'Pharmaceutical'],
    Marketing: ['Digital Marketing', 'SEO'],
    Sales: ['B2B', 'B2C'],
    Operations: ['Supply Chain', 'Logistics'],
    HR: ['Recruitment', 'HR Ops'],
  }

  /* ============================
     LOADERS
  ============================ */
  const loadRecruiters = async () => {
    setLoading(true)
    try {
      const data = await api('/api/v1/admin/recruiters')
      setRecruiters(Array.isArray(data) ? data : data.recruiters || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUnassignedCandidates = async () => {
    setLoading(true)
    try {
      const data = await api('/api/v1/admin/candidates/unassigned')
      setAvailableCandidates(Array.isArray(data) ? data : data.candidates || [])
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCandidatesForRecruiter = async (recruiterId) => {
    setLoading(true)
    try {
      const data = await api(`/api/v1/admin/recruiters/${recruiterId}/candidates`)
      setAssignedCandidatesMap((prev) => ({
        ...prev,
        [recruiterId]: Array.isArray(data) ? data : data.candidates || [],
      }))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecruiters()
  }, [])

  useEffect(() => {
    if (showAssignCandidates && selectedRecruiter) {
      loadUnassignedCandidates()
    }
  }, [showAssignCandidates, selectedRecruiter])

  /* ============================
     ACTIONS
  ============================ */
  const handleAssignCandidate = async (candidateId) => {
    const recruiterId = normalizeId(selectedRecruiter)
    if (!recruiterId) return

    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${recruiterId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
      })

      await loadRecruiters()
      await loadUnassignedCandidates()
      await loadCandidatesForRecruiter(recruiterId)

      alert('✅ Candidate assigned successfully')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignCandidate = async (recruiterId, candidateId) => {
    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${recruiterId}/unassign`, {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
      })

      await loadRecruiters()
      await loadCandidatesForRecruiter(recruiterId)
      await loadUnassignedCandidates()

      alert('✅ Candidate unassigned')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ============================
     FILTERS
  ============================ */
  const filteredRecruiters = useMemo(() => {
    return recruiters.filter((r) => {
      const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase()
      return (
        name.includes(searchTerm.toLowerCase()) &&
        (filterDepartment === 'all' || r.department === filterDepartment) &&
        (filterStatus === 'all' || (filterStatus === 'active' ? r.isActive : !r.isActive))
      )
    })
  }, [recruiters, searchTerm, filterDepartment, filterStatus])

  /* ============================
     UI
  ============================ */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">👔 Recruiter Management</h2>

      <p className="text-xs text-gray-600">
        API Base:{' '}
        <code className="bg-gray-100 px-2 py-1 rounded">
          {API_BASE || 'NOT SET'}
        </code>
      </p>

      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          Working…
        </div>
      )}

      {/* Recruiters */}
      <div className="bg-white rounded shadow">
        {filteredRecruiters.map((r) => {
          const rid = normalizeId(r)
          const assigned = assignedCandidatesMap[rid] || []

          return (
            <div key={rid} className="border-b p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{r.firstName} {r.lastName}</p>
                  <p className="text-sm text-gray-600">{r.email}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedRecruiter(r)
                    setShowAssignCandidates(true)
                  }}
                  className="text-blue-600 text-sm"
                >
                  ➕ Assign Candidate
                </button>
              </div>

              {assigned.length > 0 && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {assigned.map((c) => (
                    <div key={normalizeId(c)} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{c.fullName || c.email}</p>
                      <button
                        onClick={() => handleUnassignCandidate(rid, normalizeId(c))}
                        className="text-xs text-red-600 mt-1"
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Assign Modal */}
      {showAssignCandidates && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded p-6 w-full max-w-4xl">
            <h3 className="font-bold mb-4">
              Assign candidates to {selectedRecruiter.firstName}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableCandidates.map((c) => (
                <div key={normalizeId(c)} className="border p-3 rounded">
                  <p className="font-medium">{c.fullName || c.email}</p>
                  <button
                    onClick={() => handleAssignCandidate(normalizeId(c))}
                    className="text-sm text-blue-600 mt-2"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAssignCandidates(false)}
              className="mt-6 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecruiterManagement
