'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * RecruiterManagement.jsx (UI + Add Recruiter + Edit Recruiter + Assign/Unassign + Delete)
 * - REAL backend (MongoDB)
 * - NO localhost fallback
 * - Reads NEXT_PUBLIC_API_BASE_URL correctly
 */

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

function classNames(...arr) {
  return arr.filter(Boolean).join(' ')
}

const Chip = ({ children, tone = 'gray' }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  }
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone] || tones.gray
      )}
    >
      {children}
    </span>
  )
}

const Btn = ({ children, onClick, variant = 'ghost', disabled, type = 'button' }) => {
  const variants = {
    ghost: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-600',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant] || variants.ghost
      )}
    >
      {children}
    </button>
  )
}

export default function RecruiterManagement() {
  const [recruiters, setRecruiters] = useState([])
  const [availableCandidates, setAvailableCandidates] = useState([])
  const [assignedCandidatesMap, setAssignedCandidatesMap] = useState({})
  const [selectedRecruiter, setSelectedRecruiter] = useState(null)

  const [showAssignCandidates, setShowAssignCandidates] = useState(false)
  const [showAddRecruiter, setShowAddRecruiter] = useState(false)
  const [showEditRecruiter, setShowEditRecruiter] = useState(false) // ✅ New state for edit form
  const [editingRecruiter, setEditingRecruiter] = useState(null) // ✅ Store recruiter being edited

  const [loading, setLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [candidateSearch, setCandidateSearch] = useState('')

  // ✅ Add Recruiter form (POST to DB)
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

  // ✅ Edit Recruiter form (will be populated when editing)
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '', // Optional for editing
    department: 'Technical',
    specialization: 'IT/Software',
    maxCandidates: 20,
    isActive: true,
  })

  const departments = [
    'Technical',
    'Finance',
    'Healthcare',
    'Marketing',
    'Sales',
    'Operations',
    'HR',
  ]

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

  // ✅ DELETE recruiter
  const handleDeleteRecruiter = async (recruiterId) => {
    const confirmDelete = confirm(
      "Are you sure you want to permanently delete this recruiter?\n\nThis action cannot be undone."
    )

    if (!confirmDelete) return

    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${recruiterId}`, {
        method: 'DELETE',
      })

      alert('✅ Recruiter deleted successfully')

      // Reload recruiters
      await loadRecruiters()

    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ CREATE recruiter in MongoDB via backend
  const handleCreateRecruiter = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      alert('Email and password are required')
      return
    }

    setLoading(true)
    try {
      await api('/api/v1/admin/recruiters', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      alert('✅ Recruiter created successfully')
      setShowAddRecruiter(false)

      // reset form
      setFormData({
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

      await loadRecruiters()
    } catch (e2) {
      alert(e2.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ NEW: Edit recruiter function - opens form with recruiter data
  const handleEditRecruiter = (recruiter) => {
    setEditingRecruiter(recruiter)
    setEditFormData({
      firstName: recruiter.firstName || '',
      lastName: recruiter.lastName || '',
      email: recruiter.email || '',
      phone: recruiter.phone || '',
      username: recruiter.username || '',
      password: '', // Password field is left empty for security
      department: recruiter.department || 'Technical',
      specialization: recruiter.specialization || 'IT/Software',
      maxCandidates: recruiter.maxCandidates || 20,
      isActive: recruiter.isActive !== undefined ? recruiter.isActive : true,
    })
    setShowEditRecruiter(true)
  }

  // ✅ NEW: Handle update recruiter
  const handleUpdateRecruiter = async (e) => {
    e.preventDefault()

    if (!editFormData.email) {
      alert('Email is required')
      return
    }

    const recruiterId = normalizeId(editingRecruiter)
    if (!recruiterId) return

    setLoading(true)
    try {
      // Create payload - only include password if it was changed
      const payload = { ...editFormData }
      if (!payload.password) {
        delete payload.password // Don't send empty password
      }

      await api(`/api/v1/admin/recruiters/${recruiterId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      alert('✅ Recruiter updated successfully')
      setShowEditRecruiter(false)
      setEditingRecruiter(null)

      // Reset edit form
      setEditFormData({
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

      await loadRecruiters()
    } catch (e2) {
      alert(e2.message)
    } finally {
      setLoading(false)
    }
  }

  /* ============================
     FILTERS
  ============================ */
  const filteredRecruiters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return recruiters.filter((r) => {
      const name = `${r.firstName || ''} ${r.lastName || ''}`.toLowerCase()
      const email = (r.email || '').toLowerCase()

      const okSearch = !term || name.includes(term) || email.includes(term)
      const okDept = filterDepartment === 'all' || r.department === filterDepartment
      const okStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? !!r.isActive : !r.isActive)

      return okSearch && okDept && okStatus
    })
  }, [recruiters, searchTerm, filterDepartment, filterStatus])

  const modalCandidates = useMemo(() => {
    const term = candidateSearch.trim().toLowerCase()
    if (!term) return availableCandidates
    return availableCandidates.filter((c) => {
      const name = (c.fullName || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      return name.includes(term) || email.includes(term) || phone.includes(term)
    })
  }, [availableCandidates, candidateSearch])

  const openAssignModal = async (recruiter) => {
    setSelectedRecruiter(recruiter)
    setCandidateSearch('')
    setShowAssignCandidates(true)
    const rid = normalizeId(recruiter)
    if (rid && !assignedCandidatesMap[rid]) {
      await loadCandidatesForRecruiter(rid)
    }
  }

  const closeAssignModal = () => {
    setShowAssignCandidates(false)
    setSelectedRecruiter(null)
    setCandidateSearch('')
  }

  /* ============================
     UI
  ============================ */
  return (
    <div className="space-y-6">
      {/* Header + Add Button */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recruiter Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add recruiters, edit their details, assign candidates, and manage workloads.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            API Base:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
              {API_BASE || 'NOT SET'}
            </code>
          </p>
        </div>

        <div className="flex gap-2">
          <Btn variant="ghost" onClick={loadRecruiters} disabled={loading}>
            Refresh
          </Btn>
          <Btn variant="primary" onClick={() => setShowAddRecruiter(true)} disabled={loading}>
            + Add Recruiter
          </Btn>
        </div>
      </div>

      {loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl shadow-sm">
          Working…
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search recruiter (name / email)
            </label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. John, john@company.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recruiters list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm font-semibold text-gray-800">
            Recruiters ({filteredRecruiters.length})
          </p>
        </div>

        {filteredRecruiters.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-900 font-semibold">No recruiters found</p>
            <p className="text-sm text-gray-600 mt-1">Try changing your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRecruiters.map((r) => {
              const rid = normalizeId(r)
              const assigned = assignedCandidatesMap[rid] || []
              const isActive = !!r.isActive

              return (
                <div key={rid} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {(r.firstName || r.lastName)
                            ? `${r.firstName || ''} ${r.lastName || ''}`.trim()
                            : (r.username || r.email || 'Recruiter')}
                        </p>
                        <Chip tone={isActive ? 'green' : 'red'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Chip>
                        {r.department ? <Chip tone="blue">{r.department}</Chip> : null}
                        {typeof r.maxCandidates === 'number' ? (
                          <Chip tone="gray">Max: {r.maxCandidates}</Chip>
                        ) : null}
                      </div>

                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {r.email || '—'}
                        {r.phone ? <span className="text-gray-400"> • {r.phone}</span> : null}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => loadCandidatesForRecruiter(rid)}
                          className="text-gray-700 hover:underline"
                        >
                          Load assigned candidates
                        </button>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          Assigned: <span className="font-semibold">{assigned.length}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Btn
                        variant="primary"
                        onClick={() => openAssignModal(r)}
                        disabled={loading}
                      >
                        + Assign Candidate
                      </Btn>

                      {/* ✅ NEW: Edit Recruiter Button */}
                      <Btn
                        variant="warning"
                        onClick={() => handleEditRecruiter(r)}
                        disabled={loading}
                      >
                        ✏️ Edit
                      </Btn>

                      <Btn
                        variant="danger"
                        onClick={() => handleDeleteRecruiter(rid)}
                        disabled={loading}
                      >
                        Delete
                      </Btn>
                    </div>
                  </div>

                  {assigned.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        Assigned candidates
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {assigned.map((c) => (
                          <div
                            key={normalizeId(c)}
                            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {c.fullName || c.email || 'Candidate'}
                                </p>
                                <p className="text-xs text-gray-600 truncate">{c.email || ''}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUnassignCandidate(rid, normalizeId(c))}
                                className="text-xs font-semibold text-red-700 hover:underline"
                              >
                                Unassign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ✅ Add Recruiter Modal */}
      {showAddRecruiter && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">Add Recruiter</p>
                <p className="text-sm text-gray-600">
                  This will be saved in MongoDB via the backend.
                </p>
              </div>
              <Btn onClick={() => setShowAddRecruiter(false)}>Close</Btn>
            </div>

            <form onSubmit={handleCreateRecruiter} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                  <input
                    value={formData.firstName}
                    onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    value={formData.lastName}
                    onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={formData.username}
                    onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        department: e.target.value,
                        specialization: specializations[e.target.value]?.[0] || '',
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {(specializations[formData.department] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max candidates</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.maxCandidates}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, maxCandidates: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={!!formData.isActive}
                    onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Btn onClick={() => setShowAddRecruiter(false)} disabled={loading}>
                  Cancel
                </Btn>
                <Btn variant="primary" type="submit" disabled={loading}>
                  Create Recruiter
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ NEW: Edit Recruiter Modal */}
      {showEditRecruiter && editingRecruiter && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">Edit Recruiter</p>
                <p className="text-sm text-gray-600">
                  Editing: {editingRecruiter.firstName || ''} {editingRecruiter.lastName || ''} ({editingRecruiter.email})
                </p>
              </div>
              <Btn onClick={() => {
                setShowEditRecruiter(false)
                setEditingRecruiter(null)
              }}>Close</Btn>
            </div>

            <form onSubmit={handleUpdateRecruiter} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                  <input
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={editFormData.username}
                    onChange={(e) => setEditFormData((p) => ({ ...p, username: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Enter new password to change"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) =>
                      setEditFormData((p) => ({
                        ...p,
                        department: e.target.value,
                        specialization: specializations[e.target.value]?.[0] || '',
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Specialization</label>
                  <select
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData((p) => ({ ...p, specialization: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {(specializations[editFormData.department] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max candidates</label>
                  <input
                    type="number"
                    min={1}
                    value={editFormData.maxCandidates}
                    onChange={(e) =>
                      setEditFormData((p) => ({ ...p, maxCandidates: Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={!!editFormData.isActive}
                    onChange={(e) => setEditFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  <label htmlFor="editIsActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Btn onClick={() => {
                  setShowEditRecruiter(false)
                  setEditingRecruiter(null)
                }} disabled={loading}>
                  Cancel
                </Btn>
                <Btn variant="warning" type="submit" disabled={loading}>
                  Update Recruiter
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignCandidates && selectedRecruiter && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  Assign candidates
                </p>
                <p className="text-sm text-gray-600 truncate">
                  Recruiter:{' '}
                  <span className="font-semibold">
                    {selectedRecruiter.firstName || selectedRecruiter.username || 'Recruiter'}{' '}
                    {selectedRecruiter.lastName || ''}
                  </span>{' '}
                  <span className="text-gray-400">•</span>{' '}
                  <span className="text-gray-700">{selectedRecruiter.email}</span>
                </p>
              </div>
              <Btn onClick={closeAssignModal}>Close</Btn>
            </div>

            <div className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-md">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Search candidates (name / email / phone)
                  </label>
                  <input
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search unassigned candidates..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="blue">Unassigned: {availableCandidates.length}</Chip>
                  <Chip tone="gray">Showing: {modalCandidates.length}</Chip>
                </div>
              </div>

              <div className="mt-4">
                {availableCandidates.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="font-semibold text-gray-900">No unassigned candidates</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Everyone is already assigned.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {modalCandidates.map((c) => (
                      <div
                        key={normalizeId(c)}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {c.fullName || c.email || 'Candidate'}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {c.email || ''}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleAssignCandidate(normalizeId(c))}
                            className="shrink-0 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end">
                <Btn onClick={closeAssignModal}>Close</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}