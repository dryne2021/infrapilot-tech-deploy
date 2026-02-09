'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

const RecruiterManagement = () => {
  const [recruiters, setRecruiters] = useState([])
  const [unassignedCandidates, setUnassignedCandidates] = useState([])
  const [selectedRecruiterCandidates, setSelectedRecruiterCandidates] = useState([])

  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssignCandidates, setShowAssignCandidates] = useState(false)
  const [selectedRecruiter, setSelectedRecruiter] = useState(null)

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

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

  // Departments and specializations
  const departments = ['Technical', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Operations', 'HR']
  const specializations = {
    Technical: ['IT/Software', 'Engineering', 'Data Science', 'Cybersecurity', 'Cloud', 'DevOps', 'Mobile Development', 'QA/Testing'],
    Finance: ['Banking & Finance', 'Accounting', 'Investment', 'Insurance', 'FinTech', 'Audit', 'Taxation'],
    Healthcare: ['Medical', 'Pharmaceutical', 'Biotech', 'Healthcare IT', 'Nursing', 'Medical Devices', 'Healthcare Admin'],
    Marketing: ['Digital Marketing', 'Content', 'SEO', 'Social Media', 'Brand Management', 'Market Research', 'Advertising'],
    Sales: ['B2B Sales', 'B2C Sales', 'Account Management', 'Business Development', 'Sales Operations', 'Retail'],
    Operations: ['Supply Chain', 'Logistics', 'Manufacturing', 'Quality Control', 'Project Management', 'Facilities'],
    HR: ['Talent Acquisition', 'HR Operations', 'Compensation', 'Training & Development', 'Employee Relations', 'Recruitment'],
  }

  // -------------------------
  // Helpers
  // -------------------------
  const getId = (x) => x?._id || x?.id

  const apiJson = async (url, options = {}) => {
    const res = await fetchWithAuth(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
    })
    const json = await res.json().catch(() => ({}))
    return { res, json }
  }

  const loadRecruiters = async () => {
    const { res, json } = await apiJson('/api/v1/admin/recruiters')
    if (res.status === 401) throw new Error('Unauthorized (401). Please login again.')
    if (!res.ok) throw new Error(json?.error || json?.message || `Failed to load recruiters (${res.status})`)
    const list = json?.data ?? json?.recruiters ?? json
    setRecruiters(Array.isArray(list) ? list : [])
  }

  const loadUnassignedCandidates = async () => {
    const { res, json } = await apiJson('/api/v1/admin/candidates/unassigned')
    if (res.status === 401) throw new Error('Unauthorized (401). Please login again.')
    if (!res.ok) throw new Error(json?.error || json?.message || `Failed to load unassigned candidates (${res.status})`)
    const list = json?.data ?? json?.candidates ?? json
    setUnassignedCandidates(Array.isArray(list) ? list : [])
  }

  const loadRecruiterCandidates = async (recruiterId) => {
    const { res, json } = await apiJson(`/api/v1/admin/recruiters/${recruiterId}/candidates`)
    if (res.status === 401) throw new Error('Unauthorized (401). Please login again.')
    if (!res.ok) throw new Error(json?.error || json?.message || `Failed to load recruiter candidates (${res.status})`)
    const list = json?.data ?? json?.candidates ?? json
    setSelectedRecruiterCandidates(Array.isArray(list) ? list : [])
  }

  const refreshAll = async () => {
    await Promise.all([loadRecruiters(), loadUnassignedCandidates()])
    if (selectedRecruiter?._id || selectedRecruiter?.id) {
      await loadRecruiterCandidates(getId(selectedRecruiter))
    }
  }

  // -------------------------
  // Initial load
  // -------------------------
  useEffect(() => {
    ;(async () => {
      setError('')
      setPageLoading(true)
      try {
        await Promise.all([loadRecruiters(), loadUnassignedCandidates()])
      } catch (e) {
        setError(e?.message || 'Failed to load data from backend.')
      } finally {
        setPageLoading(false)
      }
    })()
  }, [])

  // -------------------------
  // When opening assign modal
  // -------------------------
  useEffect(() => {
    ;(async () => {
      if (!showAssignCandidates || !selectedRecruiter) return
      setError('')
      try {
        await Promise.all([
          loadUnassignedCandidates(),
          loadRecruiterCandidates(getId(selectedRecruiter)),
        ])
      } catch (e) {
        setError(e?.message || 'Failed to load assignment data.')
      }
    })()
  }, [showAssignCandidates, selectedRecruiter])

  // -------------------------
  // UI handlers
  // -------------------------
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    return password
  }

  // -------------------------
  // Backend actions
  // -------------------------
  const handleAddRecruiter = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      alert('Please fill all required fields!')
      return
    }

    setLoading(true)
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        username: formData.username || undefined,
        password: formData.password,
        department: formData.department,
        specialization: formData.specialization,
        maxCandidates: Number(formData.maxCandidates || 20),
        isActive: !!formData.isActive,
      }

      const { res, json } = await apiJson('/api/v1/admin/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(json?.error || json?.message || `Create recruiter failed (${res.status})`)

      await loadRecruiters()

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

      setShowAddForm(false)
      alert('✅ Recruiter added successfully!')
    } catch (e) {
      setError(e?.message || 'Failed to create recruiter.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecruiter = async (id) => {
    const ok = window.confirm('⚠️ Are you sure you want to delete this recruiter?\n\nAll assigned candidates will be unassigned.')
    if (!ok) return

    setLoading(true)
    setError('')
    try {
      // Backend should handle cleanup, but even if it doesn't, you already have a dedicated unassign endpoint
      // We'll just delete recruiter and refresh lists.
      const { res, json } = await apiJson(`/api/v1/admin/recruiters/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(json?.error || json?.message || `Delete recruiter failed (${res.status})`)

      await refreshAll()
      alert('✅ Recruiter deleted successfully!')
    } catch (e) {
      setError(e?.message || 'Failed to delete recruiter.')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecruiterStatus = async (id) => {
    const recruiter = recruiters.find((r) => String(getId(r)) === String(id))
    if (!recruiter) return

    const newStatus = !recruiter.isActive

    setLoading(true)
    setError('')
    try {
      const payload = { ...recruiter, isActive: newStatus }

      const { res, json } = await apiJson(`/api/v1/admin/recruiters/${id}`, {
        method: 'PUT', // ✅ matches your router
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(json?.error || json?.message || `Update recruiter failed (${res.status})`)

      await loadRecruiters()
      alert(`✅ Recruiter status changed to ${newStatus ? 'Active' : 'Inactive'}`)
    } catch (e) {
      setError(e?.message || 'Failed to update recruiter status.')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignCandidate = async (candidateId) => {
    if (!selectedRecruiter) return
    const recruiterId = getId(selectedRecruiter)

    setLoading(true)
    setError('')
    try {
      const { res, json } = await apiJson(`/api/v1/admin/recruiters/${recruiterId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      if (!res.ok) throw new Error(json?.error || json?.message || `Assign failed (${res.status})`)

      await Promise.all([loadUnassignedCandidates(), loadRecruiterCandidates(recruiterId), loadRecruiters()])
      alert('✅ Candidate assigned successfully!')
    } catch (e) {
      setError(e?.message || 'Failed to assign candidate.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignCandidate = async (candidateId) => {
    if (!selectedRecruiter) return
    const recruiterId = getId(selectedRecruiter)

    setLoading(true)
    setError('')
    try {
      const { res, json } = await apiJson(`/api/v1/admin/recruiters/${recruiterId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      })
      if (!res.ok) throw new Error(json?.error || json?.message || `Unassign failed (${res.status})`)

      await Promise.all([loadUnassignedCandidates(), loadRecruiterCandidates(recruiterId), loadRecruiters()])
      alert('✅ Candidate unassigned successfully!')
    } catch (e) {
      setError(e?.message || 'Failed to unassign candidate.')
    } finally {
      setLoading(false)
    }
  }

  const resetRecruiterPassword = async (recruiterId) => {
    setLoading(true)
    setError('')
    try {
      const { res, json } = await apiJson(`/api/v1/admin/recruiters/${recruiterId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(json?.error || json?.message || `Reset password failed (${res.status})`)

      // backend should return the new password; if not, show generic success
      const newPass = json?.data?.password || json?.password || json?.newPassword || null
      alert(newPass ? `🔄 Password reset.\n\nNew password: ${newPass}` : '🔄 Password reset successfully.')
      await loadRecruiters()
    } catch (e) {
      setError(e?.message || 'Failed to reset recruiter password.')
    } finally {
      setLoading(false)
    }
  }

  // -------------------------
  // Derived UI data
  // -------------------------
  const filteredRecruiters = useMemo(() => {
    return recruiters.filter((r) => {
      const fullName = r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim()
      const matchesSearch =
        fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.username || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = filterDepartment === 'all' || r.department === filterDepartment
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && r.isActive) ||
        (filterStatus === 'inactive' && !r.isActive)

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [recruiters, searchTerm, filterDepartment, filterStatus])

  const getWorkloadCount = (recruiter) => Number(recruiter?.assignedCandidateCount || 0)
  const getWorkloadPercentage = (recruiter) => {
    const assigned = getWorkloadCount(recruiter)
    const max = Number(recruiter?.maxCandidates || 20)
    return Math.min(100, (assigned / max) * 100)
  }
  const getWorkloadColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage > 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (pageLoading) return <div className="text-white">Loading recruiters from backend…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👔 Recruiter Management</h2>
          <p className="text-gray-800">Manage recruiter accounts, assign candidates, and track performance</p>
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refreshAll()}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
          >
            <span>➕</span> Add New Recruiter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-900">Total Recruiters</p>
          <p className="text-xl font-bold mt-1 text-gray-900">{recruiters.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-900">Active Recruiters</p>
          <p className="text-xl font-bold mt-1 text-gray-900">{recruiters.filter((r) => r.isActive).length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-900">Unassigned Candidates</p>
          <p className="text-xl font-bold mt-1 text-gray-900">{unassignedCandidates.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-900">Avg. Load %</p>
          <p className="text-xl font-bold mt-1 text-gray-900">
            {recruiters.length > 0
              ? Math.round(recruiters.reduce((sum, r) => sum + getWorkloadPercentage(r), 0) / recruiters.length)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search recruiters by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">
                All Departments
              </option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="text-gray-900">
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">
                All Status
              </option>
              <option value="active" className="text-gray-900">
                Active Only
              </option>
              <option value="inactive" className="text-gray-900">
                Inactive Only
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Recruiter Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">➕ Add New Recruiter</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-900 hover:text-gray-700 text-2xl">
                  &times;
                </button>
              </div>
              <p className="text-gray-800 mt-1">Create recruiter account with login credentials and permissions</p>
            </div>

            <form onSubmit={handleAddRecruiter} className="p-6">
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">👤 Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">🔐 Login Credentials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Username (optional)</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Password *</label>
                      <input
                        type="text"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                        className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                      >
                        🔄 Generate Strong Password
                      </button>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 mr-2"
                      />
                      <label className="text-sm text-gray-900">Active Account</label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4">🎯 Department & Workload</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Department *</label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept} className="text-gray-900">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Specialization *</label>
                      <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      >
                        {(specializations[formData.department] || []).map((spec) => (
                          <option key={spec} value={spec} className="text-gray-900">
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Max Candidates</label>
                      <input
                        type="range"
                        name="maxCandidates"
                        value={formData.maxCandidates}
                        onChange={handleInputChange}
                        className="w-full"
                        min="5"
                        max="50"
                        step="5"
                      />
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-800">5</span>
                        <span className="text-lg font-bold text-blue-600">{formData.maxCandidates}</span>
                        <span className="text-sm text-gray-800">50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Creating…' : 'Create Recruiter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recruiters List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Recruiter</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Workload</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredRecruiters.map((r) => {
                const rid = getId(r)
                const fullName = r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim()
                const workloadPercentage = getWorkloadPercentage(r)

                return (
                  <tr key={rid} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{fullName}</p>
                      <p className="text-sm text-gray-800">{r.email}</p>
                      <p className="text-xs text-gray-700">{r.phone || ''}</p>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {r.department || '—'}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {r.specialization || '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 mt-2">
                        Max: {r.maxCandidates || 20}
                      </p>
                    </td>

                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-900">Assigned</span>
                          <span className="text-sm font-medium text-gray-900">
                            {getWorkloadCount(r)}/{r.maxCandidates || 20}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getWorkloadColor(workloadPercentage)}`}
                            style={{ width: `${workloadPercentage}%` }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            setSelectedRecruiter(r)
                            setShowAssignCandidates(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          disabled={workloadPercentage >= 100}
                        >
                          {workloadPercentage >= 100 ? '🚫 Full' : '➕ Assign / View Candidates'}
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleRecruiterStatus(rid)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium w-full ${
                          r.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {r.isActive ? '✅ Active' : '❌ Inactive'}
                      </button>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => resetRecruiterPassword(rid)}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                        >
                          🔄 Reset Password
                        </button>

                        <button
                          onClick={() => handleDeleteRecruiter(rid)}
                          className="px-3 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Candidates Modal */}
      {showAssignCandidates && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    👥 Manage Candidates for {selectedRecruiter.fullName || `${selectedRecruiter.firstName} ${selectedRecruiter.lastName}`}
                  </h3>
                  <p className="text-gray-800 mt-1">
                    {selectedRecruiter.department} • {selectedRecruiter.specialization}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignCandidates(false)
                    setSelectedRecruiter(null)
                    setSelectedRecruiterCandidates([])
                  }}
                  className="text-gray-900 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Assigned candidates */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">✅ Assigned Candidates ({selectedRecruiterCandidates.length})</h4>

                {selectedRecruiterCandidates.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-gray-800">
                    No candidates assigned to this recruiter yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedRecruiterCandidates.map((c) => {
                      const cid = getId(c)
                      const name = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim()
                      return (
                        <div key={cid} className="border border-gray-200 rounded-lg p-4">
                          <p className="font-medium text-gray-900">{name || 'Candidate'}</p>
                          <p className="text-sm text-gray-800">{c.email}</p>
                          <p className="text-xs text-gray-700 mt-1">{c.targetRole || ''}</p>

                          <button
                            onClick={() => handleUnassignCandidate(cid)}
                            className="w-full mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
                          >
                            Unassign
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Unassigned candidates */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">➕ Unassigned Candidates ({unassignedCandidates.length})</h4>

                {unassignedCandidates.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-gray-800">
                    No unassigned candidates available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedCandidates.map((c) => {
                      const cid = getId(c)
                      const name = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim()
                      return (
                        <div key={cid} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                          <p className="font-medium text-gray-900">{name || 'Candidate'}</p>
                          <p className="text-sm text-gray-800">{c.email}</p>
                          <p className="text-xs text-gray-700 mt-1">{c.targetRole || ''}</p>

                          <button
                            onClick={() => handleAssignCandidate(cid)}
                            className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm"
                          >
                            Assign
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAssignCandidates(false)
                    setSelectedRecruiter(null)
                    setSelectedRecruiterCandidates([])
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecruiterManagement
