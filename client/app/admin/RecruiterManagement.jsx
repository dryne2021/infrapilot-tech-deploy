'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * ✅ UPDATED RecruiterManagement (NO localStorage for recruiters/candidates)
 * - Recruiters + assignments are loaded/saved ONLY via API (MongoDB)
 * - The only localStorage usage is reading the auth token (that’s OK)
 *
 * REQUIRED BACKEND ENDPOINTS (example):
 *  GET    /api/v1/admin/recruiters
 *  POST   /api/v1/admin/recruiters
 *  PATCH  /api/v1/admin/recruiters/:id
 *  DELETE /api/v1/admin/recruiters/:id
 *  GET    /api/v1/admin/candidates/unassigned
 *  GET    /api/v1/admin/recruiters/:id/candidates
 *  POST   /api/v1/admin/recruiters/:id/assign        body: { candidateId }
 *  POST   /api/v1/admin/recruiters/:id/unassign      body: { candidateId }
 *  POST   /api/v1/admin/recruiters/:id/reset-password
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('infrapilot_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function api(path, options = {}) {
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssignCandidates, setShowAssignCandidates] = useState(false)
  const [selectedRecruiter, setSelectedRecruiter] = useState(null)

  const [availableCandidates, setAvailableCandidates] = useState([])
  const [assignedCandidatesMap, setAssignedCandidatesMap] = useState({}) // recruiterId -> candidates[]
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

  // ---------- API LOADERS ----------
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
      const list = Array.isArray(data) ? data : data.candidates || []
      setAssignedCandidatesMap((prev) => ({ ...prev, [recruiterId]: list }))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecruiters()
  }, [])

  // Load candidates for assignment when modal opens
  useEffect(() => {
    if (showAssignCandidates && selectedRecruiter) {
      loadUnassignedCandidates()
    }
  }, [showAssignCandidates, selectedRecruiter])

  // ---------- HANDLERS ----------
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

  const handleAddRecruiter = async (e) => {
    e.preventDefault()

    if (!formData.firstName || !formData.email || !formData.username || !formData.password) {
      alert('Please fill all required fields!')
      return
    }

    setLoading(true)
    try {
      await api('/api/v1/admin/recruiters', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      setShowAddForm(false)
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
      alert('✅ Recruiter added successfully!')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecruiter = async (id) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this recruiter?\n\nAll assigned candidates will be unassigned.')) return

    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${id}`, { method: 'DELETE' })
      await loadRecruiters()
      // refresh any cached assignment list
      setAssignedCandidatesMap((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      alert('✅ Recruiter deleted successfully!')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleRecruiterStatus = async (id) => {
    const recruiter = recruiters.find((r) => normalizeId(r) === id)
    if (!recruiter) return
    const newStatus = !recruiter.isActive

    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      })
      await loadRecruiters()
      alert(`✅ Recruiter status changed to ${newStatus ? 'Active' : 'Inactive'}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const resetRecruiterPassword = async (id) => {
    if (!window.confirm('Reset recruiter password? A new password will be generated and returned (admin only).')) return

    setLoading(true)
    try {
      const data = await api(`/api/v1/admin/recruiters/${id}/reset-password`, { method: 'POST' })
      // Expect backend to return { newPassword } (admin-only)
      if (data?.newPassword) {
        alert(`🔄 Password reset successful.\n\nNew password: ${data.newPassword}\n\nSend this to the recruiter securely!`)
      } else {
        alert('🔄 Password reset successful.')
      }
      await loadRecruiters()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignCandidate = async (candidateId) => {
    const recruiterId = normalizeId(selectedRecruiter)
    if (!recruiterId) return

    setLoading(true)
    try {
      await api(`/api/v1/admin/recruiters/${recruiterId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
      })

      // Refresh lists
      await loadUnassignedCandidates()
      await loadRecruiters()
      await loadCandidatesForRecruiter(recruiterId)

      alert('✅ Candidate assigned successfully!')
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

      // If assignment modal open, refresh unassigned list too
      if (showAssignCandidates) await loadUnassignedCandidates()

      alert('✅ Candidate unassigned successfully!')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ---------- FILTERING ----------
  const filteredRecruiters = useMemo(() => {
    return recruiters.filter((recruiter) => {
      const fullName = recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim()
      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recruiter.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recruiter.username || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = filterDepartment === 'all' || recruiter.department === filterDepartment
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && recruiter.isActive) ||
        (filterStatus === 'inactive' && !recruiter.isActive)

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [recruiters, searchTerm, filterDepartment, filterStatus])

  // ---------- UI HELPERS ----------
  const getPerformanceColor = (performance) => {
    const colors = {
      Excellent: 'bg-green-100 text-green-800',
      'Very Good': 'bg-blue-100 text-blue-800',
      Good: 'bg-yellow-100 text-yellow-800',
      Average: 'bg-orange-100 text-orange-800',
      New: 'bg-gray-100 text-gray-800',
    }
    return colors[performance] || 'bg-gray-100 text-gray-800'
  }

  const getWorkloadPercentage = (recruiter) => {
    const assigned = recruiter.assignedCandidateCount || 0
    const max = recruiter.maxCandidates || 1
    return Math.min(100, (assigned / max) * 100)
  }

  const getWorkloadColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage > 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👔 Recruiter Management</h2>
          <p className="text-gray-800">Recruiters + assignments are loaded from backend (MongoDB), not localStorage.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadRecruiters()}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
          >
            <span>➕</span> Add New Recruiter
          </button>
        </div>
      </div>

      {/* Loading banner */}
      {loading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg">
          Working… (API requests in progress)
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Total Recruiters</p>
              <p className="text-xl font-bold mt-1 text-gray-900">{recruiters.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">👔</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Active Recruiters</p>
              <p className="text-xl font-bold mt-1 text-gray-900">{recruiters.filter((r) => r.isActive).length}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Total Assigned</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {recruiters.reduce((sum, r) => sum + (r.assignedCandidateCount || 0), 0)}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Avg. Load %</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {recruiters.length > 0
                  ? Math.round(recruiters.reduce((sum, r) => sum + getWorkloadPercentage(r), 0) / recruiters.length)
                  : '0'}
                %
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-sm">⚖️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search recruiters by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
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
            <button className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50">
              Export List
            </button>
          </div>
        </div>
      </div>

      {/* Add Recruiter Form Modal */}
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
              <p className="text-gray-800 mt-1">Creates recruiter account in database (no localStorage).</p>
            </div>

            <form onSubmit={handleAddRecruiter} className="p-6">
              <div className="space-y-8">
                {/* Personal Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">👤</span>
                    Personal Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="John"
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
                        placeholder="Smith"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="john.smith@company.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-green-100 text-green-600 p-2 rounded-lg">🔐</span>
                    Login Credentials
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Username *</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="john.smith"
                        required
                      />
                      <p className="text-sm text-gray-800 mt-1">Used for login, no spaces allowed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Initial Password *</label>
                      <input
                        type="text"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Set secure password"
                        required
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: generateStrongPassword() })}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          🔄 Generate Strong Password
                        </button>
                        <span className="text-xs text-gray-800">| Should be changed on first login</span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 mr-2"
                      />
                      <label className="text-sm text-gray-900">Active Account (can login immediately)</label>
                    </div>
                  </div>
                </div>

                {/* Department & Workload */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">🎯</span>
                    Department & Workload
                  </h4>

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
                        {specializations[formData.department]?.map((spec) => (
                          <option key={spec} value={spec} className="text-gray-900">
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Max Candidates *</label>
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
                      <p className="text-sm text-gray-800 mt-1">Maximum candidates recruiter can handle simultaneously</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Login URL:</strong>{' '}
                        <code className="bg-white px-2 py-1 rounded">/recruiter/login</code>
                      </p>
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
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create Recruiter Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Candidates Modal */}
      {showAssignCandidates && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    👥 Assign Candidates to {selectedRecruiter.fullName || `${selectedRecruiter.firstName} ${selectedRecruiter.lastName}`.trim()}
                  </h3>
                  <p className="text-gray-800 mt-1">
                    {selectedRecruiter.department} • {selectedRecruiter.specialization} • Currently assigned:{' '}
                    {selectedRecruiter.assignedCandidateCount || 0}/{selectedRecruiter.maxCandidates}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignCandidates(false)
                    setSelectedRecruiter(null)
                  }}
                  className="text-gray-900 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6">
              {availableCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates available for assignment</h3>
                  <p className="text-gray-800 mb-6">No unassigned candidates returned from backend.</p>
                  <button
                    onClick={() => {
                      setShowAssignCandidates(false)
                      setSelectedRecruiter(null)
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCandidates.map((candidate) => (
                      <div
                        key={normalizeId(candidate)}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()}
                            </p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700 mt-1">
                              {candidate.currentPosition || 'No position specified'} • {candidate.experienceYears || '0'} years experience
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                            {candidate.subscriptionPlan || 'Free'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {candidate.skills && (
                            <p className="text-xs text-gray-800">
                              <span className="font-medium">Skills:</span>{' '}
                              {Array.isArray(candidate.skills) ? candidate.skills.slice(0, 3).join(', ') : candidate.skills}
                            </p>
                          )}
                          {candidate.targetRole && (
                            <p className="text-xs text-blue-800">
                              <span className="font-medium">Target Role:</span> {candidate.targetRole}
                            </p>
                          )}
                          {candidate.location && (
                            <p className="text-xs text-gray-800">
                              <span className="font-medium">Location:</span> {candidate.location}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleAssignCandidate(normalizeId(candidate))}
                          className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm flex items-center justify-center gap-2"
                        >
                          <span>➕</span> Assign
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-blue-800">Showing {availableCandidates.length} unassigned candidates</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowAssignCandidates(false)
                          setSelectedRecruiter(null)
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Recruiters List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Recruiter Details</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Login</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Workload & Performance</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredRecruiters.map((recruiter) => {
                const rid = normalizeId(recruiter)
                const workloadPercentage = getWorkloadPercentage(recruiter)
                const fullName = recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim()

                return (
                  <tr key={rid} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">{(recruiter.firstName || fullName || '?')[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{fullName}</p>
                          <p className="text-sm text-gray-800">{recruiter.email}</p>
                          <p className="text-xs text-gray-700">{recruiter.phone}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Joined: {recruiter.joinDate ? String(recruiter.joinDate).slice(0, 10) : '—'} • Last login: {recruiter.lastLogin || 'Never'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Username:</span> {recruiter.username}
                      </p>
                      <button
                        onClick={() => resetRecruiterPassword(rid)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                      >
                        🔄 Reset Password
                      </button>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {recruiter.department}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {recruiter.specialization}
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 mt-2">
                        <span className="font-medium">Max Capacity:</span> {recruiter.maxCandidates} candidates
                      </p>
                    </td>

                    <td className="p-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-900">Workload</span>
                            <span className="text-sm font-medium text-gray-900">
                              {recruiter.assignedCandidateCount || 0}/{recruiter.maxCandidates}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${getWorkloadColor(workloadPercentage)}`} style={{ width: `${workloadPercentage}%` }} />
                          </div>
                        </div>

                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceColor(recruiter.performance)}`}>
                            {recruiter.performance || '—'}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedRecruiter(recruiter)
                            setShowAssignCandidates(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          disabled={workloadPercentage >= 100}
                        >
                          {workloadPercentage >= 100 ? '🚫 Full' : '➕ Assign Candidates'}
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleRecruiterStatus(rid)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium w-full ${
                          recruiter.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {recruiter.isActive ? '✅ Active' : '❌ Inactive'}
                      </button>
                      <p className="text-xs text-gray-800 text-center mt-2">
                        {recruiter.isActive ? 'Can login and manage candidates' : 'Account disabled'}
                      </p>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={async () => {
                            await loadCandidatesForRecruiter(rid)
                            alert(`Loaded candidates for ${fullName}. Scroll to "Detailed Candidate Assignments" section.`)
                          }}
                          className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-1"
                        >
                          👁️ View Candidates
                        </button>

                        <button
                          onClick={() => handleDeleteRecruiter(rid)}
                          className="px-3 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1"
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

      {/* Detailed Candidate Assignments (from backend) */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 text-lg">👥 Detailed Candidate Assignments by Recruiter</h3>
          <button
            onClick={async () => {
              // bulk refresh: load candidates for every recruiter (can be heavy if many)
              for (const r of recruiters) {
                const rid = normalizeId(r)
                // eslint-disable-next-line no-await-in-loop
                await loadCandidatesForRecruiter(rid)
              }
              alert('✅ Loaded assignments for all recruiters')
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm"
          >
            Refresh Assignments
          </button>
        </div>

        <div className="space-y-6">
          {recruiters.map((recruiter) => {
            const rid = normalizeId(recruiter)
            const fullName = recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim()
            const workloadPercentage = getWorkloadPercentage(recruiter)
            const assignedCandidates = assignedCandidatesMap[rid] || []

            return (
              <div key={rid} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">{(recruiter.firstName || fullName || '?')[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{fullName}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {recruiter.department}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {recruiter.specialization}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${recruiter.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {recruiter.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {assignedCandidates.length}
                      <span className="text-sm text-gray-700">/{recruiter.maxCandidates}</span>
                    </p>
                    <p className="text-sm text-gray-800">Assigned Candidates</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                      <div className={`h-2 rounded-full ${getWorkloadColor(workloadPercentage)}`} style={{ width: `${workloadPercentage}%` }} />
                    </div>

                    <button
                      onClick={() => loadCandidatesForRecruiter(rid)}
                      className="mt-3 px-3 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      🔄 Load/Refresh Candidates
                    </button>
                  </div>
                </div>

                {assignedCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedCandidates.map((candidate) => (
                      <div
                        key={normalizeId(candidate)}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()}
                            </p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700 mt-1">
                              {candidate.currentPosition || 'No position'} • {candidate.experienceYears || '0'} yrs
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnassignCandidate(rid, normalizeId(candidate))}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Unassign
                          </button>
                        </div>

                        {candidate.skills && (
                          <p className="text-xs text-gray-800 mt-2">
                            <span className="font-medium">Skills:</span>{' '}
                            {Array.isArray(candidate.skills) ? candidate.skills.slice(0, 3).join(', ') : candidate.skills}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-3xl mb-3">📭</div>
                    <p className="text-gray-800">No candidates loaded/assigned yet</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <button
                        onClick={() => loadCandidatesForRecruiter(rid)}
                        className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Load Candidates
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRecruiter(recruiter)
                          setShowAssignCandidates(true)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Assign Candidates Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RecruiterManagement
