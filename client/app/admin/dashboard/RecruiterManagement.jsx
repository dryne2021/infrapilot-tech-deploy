'use client'

import { useState, useEffect } from 'react'

const RecruiterManagement = () => {
  const [recruiters, setRecruiters] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssignCandidates, setShowAssignCandidates] = useState(false)
  const [selectedRecruiter, setSelectedRecruiter] = useState(null)
  const [availableCandidates, setAvailableCandidates] = useState([])
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
    isActive: true
  })

  // Departments and specializations
  const departments = ['Technical', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Operations', 'HR']
  const specializations = {
    'Technical': ['IT/Software', 'Engineering', 'Data Science', 'Cybersecurity', 'Cloud', 'DevOps', 'Mobile Development', 'QA/Testing'],
    'Finance': ['Banking & Finance', 'Accounting', 'Investment', 'Insurance', 'FinTech', 'Audit', 'Taxation'],
    'Healthcare': ['Medical', 'Pharmaceutical', 'Biotech', 'Healthcare IT', 'Nursing', 'Medical Devices', 'Healthcare Admin'],
    'Marketing': ['Digital Marketing', 'Content', 'SEO', 'Social Media', 'Brand Management', 'Market Research', 'Advertising'],
    'Sales': ['B2B Sales', 'B2C Sales', 'Account Management', 'Business Development', 'Sales Operations', 'Retail'],
    'Operations': ['Supply Chain', 'Logistics', 'Manufacturing', 'Quality Control', 'Project Management', 'Facilities'],
    'HR': ['Talent Acquisition', 'HR Operations', 'Compensation', 'Training & Development', 'Employee Relations', 'Recruitment']
  }

  // Load recruiters from localStorage
  useEffect(() => {
    loadRecruiters()
  }, [])

  // Load candidates for assignment
  useEffect(() => {
    if (showAssignCandidates && selectedRecruiter) {
      loadCandidatesForAssignment()
    }
  }, [showAssignCandidates, selectedRecruiter])

  const loadRecruiters = () => {
    const savedRecruiters = localStorage.getItem('infrapilot_recruiters')
    if (savedRecruiters) {
      setRecruiters(JSON.parse(savedRecruiters))
    } else {
      // Load sample recruiters
      const sampleRecruiters = [
        {
          id: 'rec1',
          firstName: 'John',
          lastName: 'Smith',
          fullName: 'John Smith',
          email: 'john@infrapilot.com',
          phone: '+1 (555) 100-1001',
          username: 'john.smith',
          password: 'password123',
          department: 'Technical',
          specialization: 'IT/Software',
          maxCandidates: 20,
          assignedCandidates: ['1', '2'],
          assignedCandidateCount: 2,
          isActive: true,
          joinDate: '2024-01-15',
          performance: 'Excellent',
          lastLogin: '2024-01-25 14:30',
          notes: 'Top performer in technical recruitment'
        },
        {
          id: 'rec2',
          firstName: 'Sarah',
          lastName: 'Johnson',
          fullName: 'Sarah Johnson',
          email: 'sarah@infrapilot.com',
          phone: '+1 (555) 100-1002',
          username: 'sarah.j',
          password: 'password123',
          department: 'Finance',
          specialization: 'Banking & Finance',
          maxCandidates: 15,
          assignedCandidates: ['3'],
          assignedCandidateCount: 1,
          isActive: true,
          joinDate: '2024-02-10',
          performance: 'Good',
          lastLogin: '2024-01-28 10:15',
          notes: 'Specialized in finance roles'
        },
        {
          id: 'rec3',
          firstName: 'Mike',
          lastName: 'Chen',
          fullName: 'Mike Chen',
          email: 'mike@infrapilot.com',
          phone: '+1 (555) 100-1003',
          username: 'mike.chen',
          password: 'password123',
          department: 'Healthcare',
          specialization: 'Medical',
          maxCandidates: 25,
          assignedCandidates: [],
          assignedCandidateCount: 0,
          isActive: true,
          joinDate: '2024-03-05',
          performance: 'Very Good',
          lastLogin: '2024-01-20 09:45',
          notes: 'New recruiter, healthcare specialist'
        },
        {
          id: 'rec4',
          firstName: 'Emma',
          lastName: 'Wilson',
          fullName: 'Emma Wilson',
          email: 'emma@infrapilot.com',
          phone: '+1 (555) 100-1004',
          username: 'emma.wilson',
          password: 'password123',
          department: 'Marketing',
          specialization: 'Digital Marketing',
          maxCandidates: 18,
          assignedCandidates: ['4', '5', '6'],
          assignedCandidateCount: 3,
          isActive: false,
          joinDate: '2024-01-20',
          performance: 'Good',
          lastLogin: '2024-01-15 16:20',
          notes: 'Currently on leave'
        }
      ]
      setRecruiters(sampleRecruiters)
      localStorage.setItem('infrapilot_recruiters', JSON.stringify(sampleRecruiters))
    }
  }

  const loadCandidatesForAssignment = () => {
    const savedCandidates = localStorage.getItem('infrapilot_candidates')
    if (savedCandidates) {
      const candidates = JSON.parse(savedCandidates)
      // Filter out candidates already assigned to this recruiter
      const unassigned = candidates.filter(candidate => 
        !candidate.assignedRecruiter || candidate.assignedRecruiter === '' || candidate.assignedRecruiter !== selectedRecruiter.id
      )
      setAvailableCandidates(unassigned)
    }
  }

  const saveRecruiters = (updatedRecruiters) => {
    localStorage.setItem('infrapilot_recruiters', JSON.stringify(updatedRecruiters))
    setRecruiters(updatedRecruiters)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddRecruiter = (e) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.email || !formData.username || !formData.password) {
      alert('Please fill all required fields!')
      return
    }

    setLoading(true)

    setTimeout(() => {
      const newRecruiter = {
        id: `rec${Date.now()}`,
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        assignedCandidates: [],
        assignedCandidateCount: 0,
        joinDate: new Date().toISOString().split('T')[0],
        performance: 'New',
        lastLogin: 'Never',
        notes: 'New recruiter account'
      }

      const updatedRecruiters = [...recruiters, newRecruiter]
      saveRecruiters(updatedRecruiters)
      
      // Reset form
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
        isActive: true
      })
      
      setShowAddForm(false)
      setLoading(false)
      alert('✅ Recruiter added successfully!\n\nLogin credentials:\nUsername: ' + newRecruiter.username + '\nPassword: ' + newRecruiter.password)
    }, 500)
  }

  const handleDeleteRecruiter = (id) => {
    if (window.confirm('⚠️ Are you sure you want to delete this recruiter?\n\nAll assigned candidates will be unassigned.')) {
      // First, unassign candidates from this recruiter
      const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
      const updatedCandidates = candidates.map(candidate => {
        if (candidate.assignedRecruiter === id) {
          return { ...candidate, assignedRecruiter: '', assignedRecruiterName: 'Unassigned' }
        }
        return candidate
      })
      localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
      
      // Then delete recruiter
      const updatedRecruiters = recruiters.filter(recruiter => recruiter.id !== id)
      saveRecruiters(updatedRecruiters)
      alert('✅ Recruiter deleted successfully!')
    }
  }

  const toggleRecruiterStatus = (id) => {
    const recruiter = recruiters.find(r => r.id === id)
    const newStatus = !recruiter.isActive
    const updatedRecruiters = recruiters.map(recruiter => 
      recruiter.id === id 
        ? { ...recruiter, isActive: newStatus }
        : recruiter
    )
    saveRecruiters(updatedRecruiters)
    alert(`✅ Recruiter status changed to ${newStatus ? 'Active' : 'Inactive'}`)
  }

  const handleAssignCandidate = (candidateId) => {
    const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
    const recruiter = recruiters.find(r => r.id === selectedRecruiter.id)
    const candidate = candidates.find(c => c.id === candidateId)
    
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === candidateId) {
        return { 
          ...candidate, 
          assignedRecruiter: selectedRecruiter.id,
          assignedRecruiterName: recruiter.fullName
        }
      }
      return candidate
    })
    
    localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
    
    // Update recruiter's assigned candidates count
    const updatedRecruiters = recruiters.map(r => {
      if (r.id === selectedRecruiter.id) {
        const newAssigned = [...(r.assignedCandidates || []), candidateId]
        return {
          ...r,
          assignedCandidates: newAssigned,
          assignedCandidateCount: newAssigned.length
        }
      }
      return r
    })
    
    saveRecruiters(updatedRecruiters)
    loadCandidatesForAssignment() // Refresh available candidates
    alert(`✅ ${candidate.fullName || candidate.firstName} assigned to ${recruiter.fullName}`)
  }

  const handleUnassignCandidate = (recruiterId, candidateId) => {
    const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
    const candidate = candidates.find(c => c.id === candidateId)
    
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === candidateId) {
        return { 
          ...candidate, 
          assignedRecruiter: '',
          assignedRecruiterName: 'Unassigned'
        }
      }
      return candidate
    })
    
    localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
    
    // Update recruiter's assigned candidates
    const updatedRecruiters = recruiters.map(r => {
      if (r.id === recruiterId) {
        const newAssigned = (r.assignedCandidates || []).filter(id => id !== candidateId)
        return {
          ...r,
          assignedCandidates: newAssigned,
          assignedCandidateCount: newAssigned.length
        }
      }
      return r
    })
    
    saveRecruiters(updatedRecruiters)
    alert(`✅ ${candidate.fullName || candidate.firstName} unassigned successfully!`)
  }

  const resetRecruiterPassword = (id) => {
    const recruiter = recruiters.find(r => r.id === id)
    const newPassword = generateStrongPassword()
    const updatedRecruiters = recruiters.map(recruiter => 
      recruiter.id === id 
        ? { ...recruiter, password: newPassword }
        : recruiter
    )
    saveRecruiters(updatedRecruiters)
    alert(`🔄 Password reset for ${recruiter.fullName}\n\nNew password: ${newPassword}\n\nSend this to the recruiter securely!`)
  }

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const updateRecruiterField = (id, field, value) => {
    const updatedRecruiters = recruiters.map(recruiter => {
      if (recruiter.id === id) {
        const updated = { ...recruiter, [field]: value }
        return updated
      }
      return recruiter
    })
    
    saveRecruiters(updatedRecruiters)
  }

  // Filter recruiters
  const filteredRecruiters = recruiters.filter(recruiter => {
    const matchesSearch = 
      recruiter.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recruiter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recruiter.username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = filterDepartment === 'all' || recruiter.department === filterDepartment
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && recruiter.isActive) ||
      (filterStatus === 'inactive' && !recruiter.isActive)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  // Get performance color
  const getPerformanceColor = (performance) => {
    const colors = {
      'Excellent': 'bg-green-100 text-green-800',
      'Very Good': 'bg-blue-100 text-blue-800',
      'Good': 'bg-yellow-100 text-yellow-800',
      'Average': 'bg-orange-100 text-orange-800',
      'New': 'bg-gray-100 text-gray-800'
    }
    return colors[performance] || 'bg-gray-100 text-gray-800'
  }

  // Get recruiter workload percentage
  const getWorkloadPercentage = (recruiter) => {
    return Math.min(100, ((recruiter.assignedCandidateCount || 0) / recruiter.maxCandidates) * 100)
  }

  // Get workload color
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
          <p className="text-gray-800">Manage recruiter accounts, assign candidates, and track performance</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
        >
          <span>➕</span> Add New Recruiter
        </button>
      </div>

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
              <p className="text-xl font-bold mt-1 text-gray-900">
                {recruiters.filter(r => r.isActive).length}
              </p>
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
                  : '0'
                }%
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
              <option value="all" className="text-gray-900">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept} className="text-gray-900">{dept}</option>
              ))}
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="active" className="text-gray-900">Active Only</option>
              <option value="inactive" className="text-gray-900">Inactive Only</option>
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
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-900 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
              <p className="text-gray-800 mt-1">Create recruiter account with login credentials and permissions</p>
            </div>

            <form onSubmit={handleAddRecruiter} className="p-6">
              <div className="space-y-8">
                {/* Section 1: Personal Information */}
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

                {/* Section 2: Login Credentials */}
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
                          onClick={() => setFormData({...formData, password: generateStrongPassword()})}
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

                {/* Section 3: Department & Workload */}
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
                        {departments.map(dept => (
                          <option key={dept} value={dept} className="text-gray-900">{dept}</option>
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
                        {specializations[formData.department]?.map(spec => (
                          <option key={spec} value={spec} className="text-gray-900">{spec}</option>
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
                        💡 <strong>Login Instructions:</strong> Recruiter will login at <code className="bg-white px-2 py-1 rounded">/recruiter/login</code> using provided credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Permissions & Notes */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">📋</span>
                    Additional Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Performance Notes</label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        rows="3"
                        placeholder="Add any notes about recruiter's expertise or past performance..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Initial Assignment Strategy</label>
                      <select className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white">
                        <option value="gradual" className="text-gray-900">Gradual (start with 5 candidates)</option>
                        <option value="moderate" className="text-gray-900">Moderate (start with 10 candidates)</option>
                        <option value="full" className="text-gray-900">Full (assign up to max capacity)</option>
                      </select>
                      <p className="text-sm text-gray-800 mt-1">How to initially assign candidates</p>
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
                  <h3 className="text-xl font-bold text-gray-900">👥 Assign Candidates to {selectedRecruiter.fullName}</h3>
                  <p className="text-gray-800 mt-1">
                    {selectedRecruiter.department} • {selectedRecruiter.specialization} • 
                    Currently assigned: {selectedRecruiter.assignedCandidateCount || 0}/{selectedRecruiter.maxCandidates}
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
                  <p className="text-gray-800 mb-6">All candidates are already assigned to recruiters or no candidates exist in the system.</p>
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
                  {/* Filter options for candidates */}
                  <div className="flex flex-wrap gap-4">
                    <input
                      type="text"
                      placeholder="🔍 Filter candidates by name or skills..."
                      className="p-3 border border-gray-300 rounded-lg text-gray-900 flex-1 min-w-[300px]"
                    />
                    <select className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white">
                      <option value="" className="text-gray-900">All Subscription Plans</option>
                      <option value="gold" className="text-gray-900">Gold Plan</option>
                      <option value="platinum" className="text-gray-900">Platinum Plan</option>
                      <option value="silver" className="text-gray-900">Silver Plan</option>
                    </select>
                  </div>
                  
                  {/* Candidates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCandidates.map(candidate => (
                      <div key={candidate.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}</p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700 mt-1">
                              {candidate.currentPosition || 'No position specified'} • 
                              {candidate.experienceYears || '0'} years experience
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${candidate.subscriptionPlan === 'gold' ? 'bg-yellow-100 text-yellow-800' : candidate.subscriptionPlan === 'platinum' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                            {candidate.subscriptionPlan || 'Free'}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.skills && (
                            <p className="text-xs text-gray-800">
                              <span className="font-medium">Skills:</span> {Array.isArray(candidate.skills) ? candidate.skills.slice(0, 3).join(', ') : candidate.skills}
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
                          onClick={() => handleAssignCandidate(candidate.id)}
                          className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm flex items-center justify-center gap-2"
                        >
                          <span>➕</span> Assign to {selectedRecruiter.firstName}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-blue-800">
                          Showing {availableCandidates.length} available candidates for assignment
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Recruiter capacity: {selectedRecruiter.assignedCandidateCount || 0}/{selectedRecruiter.maxCandidates} ({Math.round((selectedRecruiter.assignedCandidateCount || 0) / selectedRecruiter.maxCandidates * 100)}%)
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowAssignCandidates(false)
                          setSelectedRecruiter(null)
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                      >
                        Done Assigning
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
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Login Credentials</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Department & Specialization</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Workload & Performance</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecruiters.map((recruiter) => {
                const workloadPercentage = getWorkloadPercentage(recruiter)
                
                return (
                  <tr key={recruiter.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {recruiter.firstName?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{recruiter.fullName}</p>
                          <p className="text-sm text-gray-800">{recruiter.email}</p>
                          <p className="text-xs text-gray-700">{recruiter.phone}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Joined: {recruiter.joinDate} • Last login: {recruiter.lastLogin || 'Never'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Username:</span> {recruiter.username}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-900 font-medium">Password:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-900">
                              {recruiter.password.replace(/./g, '•')}
                            </code>
                          </div>
                        </div>
                        <button
                          onClick={() => resetRecruiterPassword(recruiter.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          🔄 Reset Password
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {recruiter.department}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {recruiter.specialization}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-800 mt-2">
                            <span className="font-medium">Max Capacity:</span> {recruiter.maxCandidates} candidates
                          </p>
                          {recruiter.notes && (
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">Notes:</span> {recruiter.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-3">
                        {/* Workload Bar */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-900">Workload</span>
                            <span className="text-sm font-medium text-gray-900">
                              {recruiter.assignedCandidateCount || 0}/{recruiter.maxCandidates}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getWorkloadColor(workloadPercentage)}`}
                              style={{ width: `${workloadPercentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-800 mt-1">
                            {workloadPercentage >= 100 ? '🚨 Full capacity' : 
                             workloadPercentage > 70 ? '⚠️ Near capacity' : 
                             '✅ Good capacity'}
                          </p>
                        </div>
                        
                        {/* Performance */}
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceColor(recruiter.performance)}`}>
                            {recruiter.performance}
                          </span>
                        </div>
                        
                        {/* Assign Button */}
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
                      <div className="space-y-3">
                        <button
                          onClick={() => toggleRecruiterStatus(recruiter.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium w-full ${recruiter.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                        >
                          {recruiter.isActive ? '✅ Active' : '❌ Inactive'}
                        </button>
                        
                        <div className="text-center">
                          <p className="text-xs text-gray-800">
                            {recruiter.isActive ? 'Can login and manage candidates' : 'Account disabled, cannot login'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            setSelectedRecruiter(recruiter)
                            setShowAssignCandidates(true)
                          }}
                          className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-1"
                        >
                          👁️ View Candidates
                        </button>
                        <button 
                          onClick={() => {
                            // View recruiter details
                            alert(`Recruiter Details:\n\nName: ${recruiter.fullName}\nEmail: ${recruiter.email}\nDepartment: ${recruiter.department}\nSpecialization: ${recruiter.specialization}\nAssigned: ${recruiter.assignedCandidateCount}/${recruiter.maxCandidates}\nStatus: ${recruiter.isActive ? 'Active' : 'Inactive'}\nPerformance: ${recruiter.performance}`)
                          }}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1"
                        >
                          📋 View Details
                        </button>
                        <button 
                          onClick={() => handleDeleteRecruiter(recruiter.id)}
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

      {/* Detailed Candidate Assignments */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-900 text-lg">👥 Detailed Candidate Assignments by Recruiter</h3>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 text-sm">
            Export Assignments
          </button>
        </div>
        
        <div className="space-y-6">
          {recruiters.map(recruiter => {
            const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
            const assignedCandidates = candidates.filter(c => c.assignedRecruiter === recruiter.id)
            const workloadPercentage = getWorkloadPercentage(recruiter)
            
            return (
              <div key={recruiter.id} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {recruiter.firstName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{recruiter.fullName}</h4>
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
                    <p className="text-2xl font-bold text-gray-900">{assignedCandidates.length}<span className="text-sm text-gray-700">/{recruiter.maxCandidates}</span></p>
                    <p className="text-sm text-gray-800">Assigned Candidates</p>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${getWorkloadColor(workloadPercentage)}`}
                        style={{ width: `${workloadPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {assignedCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedCandidates.map(candidate => (
                      <div key={candidate.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}</p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700 mt-1">
                              {candidate.currentPosition || 'No position'} • {candidate.experienceYears || '0'} yrs
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnassignCandidate(recruiter.id, candidate.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Unassign
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-2 py-1 text-xs rounded ${candidate.subscriptionPlan === 'gold' ? 'bg-yellow-100 text-yellow-800' : candidate.subscriptionPlan === 'platinum' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                            {candidate.subscriptionPlan || 'Free'} Plan
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${candidate.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {candidate.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                          {candidate.targetRole && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {candidate.targetRole}
                            </span>
                          )}
                        </div>
                        
                        {candidate.skills && (
                          <p className="text-xs text-gray-800 mt-2">
                            <span className="font-medium">Skills:</span> {Array.isArray(candidate.skills) ? candidate.skills.slice(0, 3).join(', ') : candidate.skills}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-3xl mb-3">📭</div>
                    <p className="text-gray-800">No candidates assigned to this recruiter yet</p>
                    <button
                      onClick={() => {
                        setSelectedRecruiter(recruiter)
                        setShowAssignCandidates(true)
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Assign Candidates Now
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Login Instructions & Best Practices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h4 className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-600 p-2 rounded-lg">🔐</span>
            Recruiter Login Instructions
          </h4>
          <ul className="text-green-700 space-y-3">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <div>
                <span className="font-medium">Login URL:</span> 
                <code className="bg-green-100 px-2 py-1 rounded text-sm ml-2">/recruiter/login</code>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <div>
                <span className="font-medium">Username:</span> 
                <span className="ml-2 font-mono">{'<username_set_above>'}</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <div>
                <span className="font-medium">Initial Password:</span> 
                <span className="ml-2 font-mono">{'<initial_password>'}</span>
                <p className="text-sm text-green-600 mt-1">Must be changed on first login</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <div>
                <span className="font-medium">Permissions:</span> 
                <p className="text-sm text-green-600 mt-1">Can view/edit assigned candidates only</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-800 text-lg mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">💡</span>
            Best Practices & Tips
          </h4>
          <ul className="text-blue-700 space-y-3">
            <li>• <strong>Assign by specialization</strong> - Match candidates to recruiter expertise</li>
            <li>• <strong>Monitor workload</strong> - Keep below 80% capacity for best performance</li>
            <li>• <strong>Regular password resets</strong> - Schedule every 90 days for security</li>
            <li>• <strong>Performance reviews</strong> - Review recruiter performance monthly</li>
            <li>• <strong>Balance assignments</strong> - Distribute candidates evenly across recruiters</li>
            <li>• <strong>Training</strong> - Provide ongoing training for specialized roles</li>
            <li>• <strong>Backup</strong> - Always have backup recruiters for critical roles</li>
          </ul>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-xl shadow p-6">
        <h4 className="font-bold text-gray-900 mb-4">📊 Recruiter Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(recruiters.reduce((sum, r) => sum + getWorkloadPercentage(r), 0) / recruiters.length)}%
            </p>
            <p className="text-sm text-gray-800">Average Workload</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {recruiters.filter(r => r.performance === 'Excellent' || r.performance === 'Very Good').length}
            </p>
            <p className="text-sm text-gray-800">Top Performers</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">
              {recruiters.reduce((sum, r) => r.assignedCandidateCount || 0, 0)}
            </p>
            <p className="text-sm text-gray-800">Total Assigned Candidates</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecruiterManagement