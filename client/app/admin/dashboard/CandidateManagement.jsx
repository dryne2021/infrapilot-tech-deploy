'use client'

import { useState, useEffect } from 'react'

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Trial', price: 0, duration: 7 },
  { id: 'silver', name: 'Silver', price: 29, duration: 30 },
  { id: 'gold', name: 'Gold', price: 79, duration: 30 },
  { id: 'platinum', name: 'Platinum', price: 149, duration: 30 },
  { id: 'enterprise', name: 'Enterprise', price: 299, duration: 90 }
]

// Sample Recruiters
const RECRUITERS = [
  { id: 'rec1', name: 'John Smith', email: 'john@infrapilot.com', candidates: 12, status: 'Active' },
  { id: 'rec2', name: 'Sarah Johnson', email: 'sarah@infrapilot.com', candidates: 8, status: 'Active' },
  { id: 'rec3', name: 'Mike Chen', email: 'mike@infrapilot.com', candidates: 15, status: 'Active' },
  { id: 'rec4', name: 'Emma Wilson', email: 'emma@infrapilot.com', candidates: 5, status: 'On Leave' },
  { id: 'rec5', name: 'David Brown', email: 'david@infrapilot.com', candidates: 10, status: 'Active' }
]

// Skills Options
const SKILLS_OPTIONS = {
  technical: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby',
    'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'Laravel',
    'HTML5', 'CSS3', 'SASS/SCSS', 'Tailwind CSS', 'Bootstrap',
    'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Firebase',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub', 'GitLab',
    'REST APIs', 'GraphQL', 'WebSocket', 'Microservices', 'CI/CD', 'Agile/Scrum', 'DevOps'
  ],
  soft: [
    'Leadership', 'Team Management', 'Project Management', 'Communication', 'Public Speaking',
    'Problem Solving', 'Critical Thinking', 'Analytical Skills', 'Creativity', 'Adaptability',
    'Time Management', 'Negotiation', 'Conflict Resolution', 'Mentoring', 'Client Relations'
  ],
  languages: [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Hindi', 'Arabic', 'Portuguese',
    'Russian', 'Japanese', 'Korean', 'Italian', 'Dutch', 'Swedish'
  ]
}

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    location: '',
    visaStatus: '',
    dateOfBirth: '',
    nationality: '',
    
    // Contact & Profiles
    linkedin: '',
    github: '',
    portfolio: '',
    website: '',
    
    // Professional Information
    currentCompany: '',
    currentPosition: '',
    experienceYears: '',
    targetRole: '',
    expectedSalary: '',
    noticePeriod: '',
    availability: '',
    
    // Skills
    technicalSkills: [],
    softSkills: [],
    languages: [],
    certifications: [],
    
    // Professional Summary
    summary: '',
    
    // Work Experience (array)
    experience: [
      {
        id: Date.now(),
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        currentlyWorking: false,
        description: '',
        achievements: ['', '', ''],
        technologies: []
      }
    ],
    
    // Education (array)
    education: [
      {
        id: Date.now() + 1,
        degree: '',
        field: '',
        school: '',
        location: '',
        graduationYear: '',
        gpa: '',
        honors: '',
        courses: []
      }
    ],
    
    // Projects (array)
    projects: [
      {
        id: Date.now() + 2,
        name: '',
        description: '',
        role: '',
        technologies: [],
        startDate: '',
        endDate: '',
        url: '',
        impact: ''
      }
    ],
    
    // Additional Information
    awards: '',
    publications: '',
    volunteerExperience: '',
    professionalMemberships: '',
    references: '',
    notes: '',
    
    // Subscription & Assignment
    subscriptionPlan: 'gold',
    paymentStatus: 'paid',
    assignedRecruiter: 'rec1'
  })

  // Load candidates from localStorage on component mount
  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = () => {
    const savedCandidates = localStorage.getItem('infrapilot_candidates')
    if (savedCandidates) {
      setCandidates(JSON.parse(savedCandidates))
    } else {
      // Load sample data
      const sampleCandidates = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1-555-1234',
          subscriptionPlan: 'gold',
          subscriptionStatus: 'active',
          daysRemaining: 15,
          paymentStatus: 'paid',
          assignedRecruiter: 'rec1',
          currentPosition: 'Senior Developer',
          experienceYears: 5,
          status: 'Active',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          skills: ['JavaScript', 'React', 'Node.js'],
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'Tech Solutions Inc.',
              startDate: '2020-01',
              endDate: '2023-12',
              description: 'Led team of 5 developers'
            }
          ],
          education: [
            {
              degree: 'Bachelor of Science',
              field: 'Computer Science',
              school: 'University of Technology',
              graduationYear: '2018'
            }
          ]
        },
        {
          id: '2',
          firstName: 'Sarah',
          lastName: 'Smith',
          email: 'sarah@example.com',
          phone: '+1-555-5678',
          subscriptionPlan: 'platinum',
          subscriptionStatus: 'active',
          daysRemaining: 28,
          paymentStatus: 'paid',
          assignedRecruiter: 'rec2',
          currentPosition: 'Product Manager',
          experienceYears: 8,
          status: 'Active',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          firstName: 'Mike',
          lastName: 'Johnson',
          email: 'mike@example.com',
          phone: '+1-555-9012',
          subscriptionPlan: 'silver',
          subscriptionStatus: 'expired',
          daysRemaining: 0,
          paymentStatus: 'pending',
          assignedRecruiter: 'rec3',
          currentPosition: 'UX Designer',
          experienceYears: 3,
          status: 'Expired',
          createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      setCandidates(sampleCandidates)
      localStorage.setItem('infrapilot_candidates', JSON.stringify(sampleCandidates))
    }
  }

  const saveCandidates = (updatedCandidates) => {
    localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
    setCandidates(updatedCandidates)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleArrayInputChange = (arrayName, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleSkillsChange = (skillType, skill) => {
    setFormData(prev => {
      const currentSkills = [...prev[skillType]]
      if (currentSkills.includes(skill)) {
        return { ...prev, [skillType]: currentSkills.filter(s => s !== skill) }
      } else {
        return { ...prev, [skillType]: [...currentSkills, skill] }
      }
    })
  }

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: Date.now(),
          title: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          currentlyWorking: false,
          description: '',
          achievements: ['', '', ''],
          technologies: []
        }
      ]
    }))
  }

  const removeExperience = (index) => {
    if (formData.experience.length > 1) {
      setFormData(prev => ({
        ...prev,
        experience: prev.experience.filter((_, i) => i !== index)
      }))
    }
  }

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: Date.now(),
          degree: '',
          field: '',
          school: '',
          location: '',
          graduationYear: '',
          gpa: '',
          honors: '',
          courses: []
        }
      ]
    }))
  }

  const removeEducation = (index) => {
    if (formData.education.length > 1) {
      setFormData(prev => ({
        ...prev,
        education: prev.education.filter((_, i) => i !== index)
      }))
    }
  }

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: Date.now(),
          name: '',
          description: '',
          role: '',
          technologies: [],
          startDate: '',
          endDate: '',
          url: '',
          impact: ''
        }
      ]
    }))
  }

  const removeProject = (index) => {
    if (formData.projects.length > 1) {
      setFormData(prev => ({
        ...prev,
        projects: prev.projects.filter((_, i) => i !== index)
      }))
    }
  }

  const handleAddCandidate = (e) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.email) {
      alert('First name and email are required!')
      return
    }

    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === formData.subscriptionPlan)
      const recruiter = RECRUITERS.find(r => r.id === formData.assignedRecruiter)
      
      const newCandidate = {
        id: Date.now().toString(),
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        subscriptionPlan: formData.subscriptionPlan,
        subscriptionStatus: formData.paymentStatus === 'paid' ? 'active' : 'pending',
        daysRemaining: selectedPlan ? selectedPlan.duration : 30,
        paymentStatus: formData.paymentStatus,
        assignedRecruiter: formData.assignedRecruiter,
        assignedRecruiterName: recruiter ? recruiter.name : 'Unassigned',
        createdAt: new Date().toISOString(),
        status: 'New',
        addedBy: 'admin'
      }

      const updatedCandidates = [newCandidate, ...candidates]
      saveCandidates(updatedCandidates)
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ssn: '',
        location: '',
        visaStatus: '',
        dateOfBirth: '',
        nationality: '',
        linkedin: '',
        github: '',
        portfolio: '',
        website: '',
        currentCompany: '',
        currentPosition: '',
        experienceYears: '',
        targetRole: '',
        expectedSalary: '',
        noticePeriod: '',
        availability: '',
        technicalSkills: [],
        softSkills: [],
        languages: [],
        certifications: [],
        summary: '',
        experience: [{
          id: Date.now(),
          title: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          currentlyWorking: false,
          description: '',
          achievements: ['', '', ''],
          technologies: []
        }],
        education: [{
          id: Date.now() + 1,
          degree: '',
          field: '',
          school: '',
          location: '',
          graduationYear: '',
          gpa: '',
          honors: '',
          courses: []
        }],
        projects: [{
          id: Date.now() + 2,
          name: '',
          description: '',
          role: '',
          technologies: [],
          startDate: '',
          endDate: '',
          url: '',
          impact: ''
        }],
        awards: '',
        publications: '',
        volunteerExperience: '',
        professionalMemberships: '',
        references: '',
        notes: '',
        subscriptionPlan: 'gold',
        paymentStatus: 'paid',
        assignedRecruiter: 'rec1'
      })
      
      setShowAddForm(false)
      setLoading(false)
      alert('Candidate added successfully!')
    }, 500)
  }

  const handleDeleteCandidate = (id) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      const updatedCandidates = candidates.filter(candidate => candidate.id !== id)
      saveCandidates(updatedCandidates)
      alert('Candidate deleted successfully!')
    }
  }

  const updateCandidateField = (id, field, value) => {
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === id) {
        const updated = { ...candidate, [field]: value }
        
        if (field === 'paymentStatus') {
          updated.subscriptionStatus = value === 'paid' ? 'active' : 'pending'
        }
        
        if (field === 'assignedRecruiter') {
          const recruiter = RECRUITERS.find(r => r.id === value)
          updated.assignedRecruiterName = recruiter ? recruiter.name : 'Unassigned'
        }
        
        return updated
      }
      return candidate
    })
    
    saveCandidates(updatedCandidates)
  }

  // Filter candidates
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.phone?.includes(searchTerm)
    
    const matchesStatus = filterStatus === 'all' || candidate.status === filterStatus
    const matchesPlan = filterPlan === 'all' || candidate.subscriptionPlan === filterPlan
    const matchesPayment = filterPayment === 'all' || candidate.paymentStatus === filterPayment
    
    return matchesSearch && matchesStatus && matchesPlan && matchesPayment
  })

  const getPlanColor = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      silver: 'bg-gray-300 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-gray-200 text-gray-800',
      enterprise: 'bg-purple-100 text-purple-800'
    }
    return colors[plan] || 'bg-blue-100 text-blue-800'
  }

  const getPaymentColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const calculateDaysRemaining = (candidate) => {
    if (candidate.daysRemaining !== undefined) return candidate.daysRemaining
    
    const created = new Date(candidate.createdAt)
    const now = new Date()
    const diffTime = Math.abs(now - created)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const planDuration = SUBSCRIPTION_PLANS.find(p => p.id === candidate.subscriptionPlan)?.duration || 30
    
    return Math.max(0, planDuration - diffDays)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Candidate Management</h2>
          <p className="text-gray-800">Manage candidates, subscriptions, and recruiter assignments</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
        >
          <span>➕</span> Add New Candidate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Total Candidates</p>
              <p className="text-xl font-bold mt-1 text-gray-900">{candidates.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Active Subscriptions</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {candidates.filter(c => c.subscriptionStatus === 'active').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Pending Payments</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {candidates.filter(c => c.paymentStatus === 'pending').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-sm">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Avg. Plan Value</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                ${(candidates.reduce((sum, c) => {
                  const plan = SUBSCRIPTION_PLANS.find(p => p.id === c.subscriptionPlan)
                  return sum + (plan?.price || 0)
                }, 0) / candidates.length || 0).toFixed(0)}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Candidate Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">➕ Add New Candidate</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-900 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
              <p className="text-gray-800 mt-1">Complete candidate profile for comprehensive resume generation</p>
            </div>

            <form onSubmit={handleAddCandidate} className="p-6">
              <div className="space-y-8">
                {/* Section 1: Personal Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">👤</span>
                    Personal Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                        placeholder="John"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Doe"
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
                        placeholder="john.doe@example.com"
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="San Francisco, CA, USA"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Nationality</label>
                      <input
                        type="text"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="American, Indian, British, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Visa Status</label>
                      <select
                        name="visaStatus"
                        value={formData.visaStatus}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-900">Select Visa Status</option>
                        <option value="citizen" className="text-gray-900">Citizen</option>
                        <option value="permanent_resident" className="text-gray-900">Permanent Resident</option>
                        <option value="work_visa" className="text-gray-900">Work Visa</option>
                        <option value="student_visa" className="text-gray-900">Student Visa</option>
                        <option value="visitor_visa" className="text-gray-900">Visitor Visa</option>
                        <option value="requires_sponsorship" className="text-gray-900">Requires Sponsorship</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">SSN/ID Number</label>
                      <input
                        type="text"
                        name="ssn"
                        value={formData.ssn}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="123-45-6789"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Profiles */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-green-100 text-green-600 p-2 rounded-lg">🔗</span>
                    Contact & Profiles
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">LinkedIn Profile</label>
                      <input
                        type="url"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="https://linkedin.com/in/johndoe"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">GitHub Profile</label>
                      <input
                        type="url"
                        name="github"
                        value={formData.github}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="https://github.com/johndoe"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Portfolio Website</label>
                      <input
                        type="url"
                        name="portfolio"
                        value={formData.portfolio}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="https://johndoe.portfolio.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Personal Website</label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="https://johndoe.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Professional Summary */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">📝</span>
                    Professional Summary
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Professional Summary / Objective *
                    </label>
                    <textarea
                      name="summary"
                      value={formData.summary}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      placeholder="Experienced software engineer with 5+ years in full-stack development. Specialized in React, Node.js, and cloud technologies. Proven track record of delivering scalable applications..."
                      required
                    />
                    <p className="text-sm text-gray-800 mt-1">
                      This will be used as the professional summary in the resume.
                    </p>
                  </div>
                </div>

                {/* Section 4: Professional Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">💼</span>
                    Professional Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Target Role *</label>
                      <input
                        type="text"
                        name="targetRole"
                        value={formData.targetRole}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Senior Software Engineer"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Current Position</label>
                      <input
                        type="text"
                        name="currentPosition"
                        value={formData.currentPosition}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Software Developer"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Current Company</label>
                      <input
                        type="text"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Google Inc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Total Experience (Years)</label>
                      <input
                        type="number"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        min="0"
                        max="50"
                        placeholder="5"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Expected Salary ($)</label>
                      <input
                        type="number"
                        name="expectedSalary"
                        value={formData.expectedSalary}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        min="0"
                        placeholder="120000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Notice Period</label>
                      <select
                        name="noticePeriod"
                        value={formData.noticePeriod}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-900">Select Notice Period</option>
                        <option value="Immediate" className="text-gray-900">Immediate</option>
                        <option value="1 week" className="text-gray-900">1 Week</option>
                        <option value="2 weeks" className="text-gray-900">2 Weeks</option>
                        <option value="1 month" className="text-gray-900">1 Month</option>
                        <option value="2 months" className="text-gray-900">2 Months</option>
                        <option value="3 months" className="text-gray-900">3 Months</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Availability</label>
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-900">Select Availability</option>
                        <option value="immediately" className="text-gray-900">Available Immediately</option>
                        <option value="1_month" className="text-gray-900">Available in 1 Month</option>
                        <option value="2_months" className="text-gray-900">Available in 2 Months</option>
                        <option value="3_months" className="text-gray-900">Available in 3 Months</option>
                        <option value="negotiable" className="text-gray-900">Negotiable</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 5: Skills */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-red-100 text-red-600 p-2 rounded-lg">⚡</span>
                    Skills & Competencies
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Technical Skills */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Technical Skills *</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                        {SKILLS_OPTIONS.technical.map(skill => (
                          <div key={skill} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`tech-${skill}`}
                              checked={formData.technicalSkills.includes(skill)}
                              onChange={() => handleSkillsChange('technicalSkills', skill)}
                              className="mr-2 text-gray-900"
                            />
                            <label htmlFor={`tech-${skill}`} className="text-sm text-gray-900">
                              {skill}
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Add custom skill..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleSkillsChange('technicalSkills', e.target.value.trim())
                              e.target.value = ''
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                    
                    {/* Soft Skills */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Soft Skills</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                        {SKILLS_OPTIONS.soft.map(skill => (
                          <div key={skill} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`soft-${skill}`}
                              checked={formData.softSkills.includes(skill)}
                              onChange={() => handleSkillsChange('softSkills', skill)}
                              className="mr-2 text-gray-900"
                            />
                            <label htmlFor={`soft-${skill}`} className="text-sm text-gray-900">
                              {skill}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Languages */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Languages</label>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                        {SKILLS_OPTIONS.languages.map(language => (
                          <div key={language} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={`lang-${language}`}
                              checked={formData.languages.includes(language)}
                              onChange={() => handleSkillsChange('languages', language)}
                              className="mr-2 text-gray-900"
                            />
                            <label htmlFor={`lang-${language}`} className="text-sm text-gray-900">
                              {language}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Certifications */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Certifications (comma separated)</label>
                    <input
                      type="text"
                      name="certifications"
                      value={formData.certifications}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                      placeholder="AWS Certified Solutions Architect, Google Cloud Professional, PMP, Scrum Master"
                    />
                  </div>
                </div>

                {/* Section 6: Work Experience */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">💼</span>
                      Work Experience
                    </h4>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <span>➕</span> Add Another Experience
                    </button>
                  </div>
                  
                  {formData.experience.map((exp, index) => (
                    <div key={exp.id} className="border border-gray-300 rounded-lg p-6 mb-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium text-gray-900">Experience #{index + 1}</h5>
                        {formData.experience.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExperience(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Job Title *</label>
                          <input
                            type="text"
                            value={exp.title}
                            onChange={(e) => handleArrayInputChange('experience', index, 'title', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Senior Software Engineer"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Company Name *</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => handleArrayInputChange('experience', index, 'company', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Google Inc."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => handleArrayInputChange('experience', index, 'location', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Mountain View, CA"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                            <input
                              type="month"
                              value={exp.startDate}
                              onChange={(e) => handleArrayInputChange('experience', index, 'startDate', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                            <input
                              type="month"
                              value={exp.endDate}
                              onChange={(e) => handleArrayInputChange('experience', index, 'endDate', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                              disabled={exp.currentlyWorking}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`currently-working-${index}`}
                            checked={exp.currentlyWorking}
                            onChange={(e) => handleArrayInputChange('experience', index, 'currentlyWorking', e.target.checked)}
                            className="mr-2 text-gray-900"
                          />
                          <label htmlFor={`currently-working-${index}`} className="text-sm text-gray-900">
                            I currently work here
                          </label>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Job Description</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => handleArrayInputChange('experience', index, 'description', e.target.value)}
                          rows="3"
                          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          placeholder="Describe your responsibilities, team size, projects worked on..."
                        />
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Key Achievements (one per line)</label>
                        {exp.achievements.map((achievement, aIndex) => (
                          <input
                            key={aIndex}
                            type="text"
                            value={achievement}
                            onChange={(e) => {
                              const newAchievements = [...exp.achievements]
                              newAchievements[aIndex] = e.target.value
                              handleArrayInputChange('experience', index, 'achievements', newAchievements)
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg mb-2 text-gray-900 bg-white"
                            placeholder={`Achievement ${aIndex + 1} (e.g., Led team of 5 developers, increased performance by 40%)`}
                          />
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Technologies Used (comma separated)</label>
                        <input
                          type="text"
                          value={exp.technologies.join(', ')}
                          onChange={(e) => handleArrayInputChange('experience', index, 'technologies', e.target.value.split(',').map(t => t.trim()))}
                          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          placeholder="React, Node.js, AWS, MongoDB, Docker, Kubernetes"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 7: Education */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <span className="bg-green-100 text-green-600 p-2 rounded-lg">🎓</span>
                      Education
                    </h4>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                    >
                      <span>➕</span> Add Another Education
                    </button>
                  </div>
                  
                  {formData.education.map((edu, index) => (
                    <div key={edu.id} className="border border-gray-300 rounded-lg p-6 mb-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium text-gray-900">Education #{index + 1}</h5>
                        {formData.education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Degree/Certificate *</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => handleArrayInputChange('education', index, 'degree', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Bachelor of Science"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Field of Study</label>
                          <input
                            type="text"
                            value={edu.field}
                            onChange={(e) => handleArrayInputChange('education', index, 'field', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Computer Science"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">School/University *</label>
                          <input
                            type="text"
                            value={edu.school}
                            onChange={(e) => handleArrayInputChange('education', index, 'school', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Stanford University"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                          <input
                            type="text"
                            value={edu.location}
                            onChange={(e) => handleArrayInputChange('education', index, 'location', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Stanford, CA"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Graduation Year</label>
                          <input
                            type="text"
                            value={edu.graduationYear}
                            onChange={(e) => handleArrayInputChange('education', index, 'graduationYear', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="2020"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">GPA</label>
                          <input
                            type="text"
                            value={edu.gpa}
                            onChange={(e) => handleArrayInputChange('education', index, 'gpa', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="3.8/4.0"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Honors/Awards</label>
                          <input
                            type="text"
                            value={edu.honors}
                            onChange={(e) => handleArrayInputChange('education', index, 'honors', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Summa Cum Laude, Dean's List, Scholarship Recipient"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Relevant Coursework (comma separated)</label>
                          <input
                            type="text"
                            value={edu.courses.join(', ')}
                            onChange={(e) => handleArrayInputChange('education', index, 'courses', e.target.value.split(',').map(c => c.trim()))}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Data Structures, Algorithms, Web Development, Database Systems"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 8: Projects */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">🚀</span>
                      Projects
                    </h4>
                    <button
                      type="button"
                      onClick={addProject}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
                    >
                      <span>➕</span> Add Another Project
                    </button>
                  </div>
                  
                  {formData.projects.map((project, index) => (
                    <div key={project.id} className="border border-gray-300 rounded-lg p-6 mb-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-medium text-gray-900">Project #{index + 1}</h5>
                        {formData.projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProject(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Project Name *</label>
                          <input
                            type="text"
                            value={project.name}
                            onChange={(e) => handleArrayInputChange('projects', index, 'name', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="E-commerce Platform"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Your Role</label>
                          <input
                            type="text"
                            value={project.role}
                            onChange={(e) => handleArrayInputChange('projects', index, 'role', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Lead Developer"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Project Description</label>
                          <textarea
                            value={project.description}
                            onChange={(e) => handleArrayInputChange('projects', index, 'description', e.target.value)}
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Developed a full-stack e-commerce platform with user authentication, payment processing, and inventory management..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Technologies Used</label>
                          <input
                            type="text"
                            value={project.technologies.join(', ')}
                            onChange={(e) => handleArrayInputChange('projects', index, 'technologies', e.target.value.split(',').map(t => t.trim()))}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="React, Node.js, MongoDB, Stripe API"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Project URL</label>
                          <input
                            type="url"
                            value={project.url}
                            onChange={(e) => handleArrayInputChange('projects', index, 'url', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="https://github.com/johndoe/ecommerce-platform"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                          <input
                            type="month"
                            value={project.startDate}
                            onChange={(e) => handleArrayInputChange('projects', index, 'startDate', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                          <input
                            type="month"
                            value={project.endDate}
                            onChange={(e) => handleArrayInputChange('projects', index, 'endDate', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Impact/Results</label>
                          <textarea
                            value={project.impact}
                            onChange={(e) => handleArrayInputChange('projects', index, 'impact', e.target.value)}
                            rows="2"
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Platform served 10,000+ users, processed $500k+ in transactions, reduced page load time by 40%"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 9: Additional Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 p-2 rounded-lg">📄</span>
                    Additional Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Awards & Honors</label>
                      <textarea
                        name="awards"
                        value={formData.awards}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="• Employee of the Year 2023
• Hackathon Winner - Google Cloud Challenge
• Outstanding Performance Award"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Publications</label>
                      <textarea
                        name="publications"
                        value={formData.publications}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="• 'Modern Web Development Patterns' - Tech Journal 2023
• 'Scaling Microservices with Kubernetes' - DevOps Conference Proceedings"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Volunteer Experience</label>
                      <textarea
                        name="volunteerExperience"
                        value={formData.volunteerExperience}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="• Tech Mentor - Local Coding Bootcamp
• Volunteer Developer - Non-profit Website Redesign
• STEM Workshop Instructor for High School Students"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Professional Memberships</label>
                      <textarea
                        name="professionalMemberships"
                        value={formData.professionalMemberships}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="• IEEE - Senior Member
• ACM - Association for Computing Machinery
• PMI - Project Management Institute"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">References</label>
                      <textarea
                        name="references"
                        value={formData.references}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="References available upon request.

Dr. Jane Smith - Professor, Stanford University
Email: jane.smith@stanford.edu

John Davis - Engineering Manager, Google
Email: john.davis@gmail.com"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Additional Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Any additional information, special skills, or notes about the candidate..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 10: Subscription & Assignment */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">💎</span>
                    Subscription & Assignment
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Subscription Plan *</label>
                      <select
                        name="subscriptionPlan"
                        value={formData.subscriptionPlan}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      >
                        {SUBSCRIPTION_PLANS.map(plan => (
                          <option key={plan.id} value={plan.id} className="text-gray-900">
                            {plan.name} - ${plan.price}/{(plan.duration)} days
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Payment Status *</label>
                      <select
                        name="paymentStatus"
                        value={formData.paymentStatus}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      >
                        <option value="paid" className="text-gray-900">Paid ✅</option>
                        <option value="pending" className="text-gray-900">Pending ⏳</option>
                        <option value="failed" className="text-gray-900">Failed ❌</option>
                        <option value="refunded" className="text-gray-900">Refunded ↩️</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Assigned Recruiter *</label>
                      <select
                        name="assignedRecruiter"
                        value={formData.assignedRecruiter}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        required
                      >
                        <option value="" className="text-gray-900">Select Recruiter</option>
                        {RECRUITERS.filter(r => r.status === 'Active').map(recruiter => (
                          <option key={recruiter.id} value={recruiter.id} className="text-gray-900">
                            {recruiter.name} ({recruiter.candidates} candidates)
                          </option>
                        ))}
                      </select>
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
                      Adding Candidate...
                    </>
                  ) : (
                    'Add Complete Candidate Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search candidates by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-gray-900"
              />
              <span className="absolute left-3 top-3 text-gray-900">🔍</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="Active" className="text-gray-900">Active</option>
              <option value="New" className="text-gray-900">New</option>
              <option value="Expired" className="text-gray-900">Expired</option>
            </select>
            <select 
              value={filterPlan} 
              onChange={(e) => setFilterPlan(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Plans</option>
              {SUBSCRIPTION_PLANS.map(plan => (
                <option key={plan.id} value={plan.id} className="text-gray-900">{plan.name}</option>
              ))}
            </select>
            <select 
              value={filterPayment} 
              onChange={(e) => setFilterPayment(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Payments</option>
              <option value="paid" className="text-gray-900">Paid</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="failed" className="text-gray-900">Failed</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
            <p className="text-gray-800 mb-6">Add your first candidate manually or import from CSV</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Candidate
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Candidate</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Subscription Plan</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Payment Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Days Remaining</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Assigned Recruiter</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => {
                  const daysRemaining = calculateDaysRemaining(candidate)
                  const plan = SUBSCRIPTION_PLANS.find(p => p.id === candidate.subscriptionPlan)
                  const recruiter = RECRUITERS.find(r => r.id === candidate.assignedRecruiter)
                  
                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {candidate.firstName?.[0]?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}</p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700">{candidate.phone || 'No phone'}</p>
                            {candidate.targetRole && (
                              <p className="text-xs text-blue-600 mt-1">{candidate.targetRole}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={candidate.subscriptionPlan || 'free'}
                          onChange={(e) => updateCandidateField(candidate.id, 'subscriptionPlan', e.target.value)}
                          className={`p-2 rounded-lg text-sm font-medium ${getPlanColor(candidate.subscriptionPlan)}`}
                        >
                          {SUBSCRIPTION_PLANS.map(plan => (
                            <option key={plan.id} value={plan.id} className="text-gray-900">
                              {plan.name} (${plan.price})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-800 mt-1">
                          {plan ? `${plan.duration} days plan` : 'No plan'}
                        </p>
                      </td>
                      <td className="p-4">
                        <select
                          value={candidate.paymentStatus || 'pending'}
                          onChange={(e) => updateCandidateField(candidate.id, 'paymentStatus', e.target.value)}
                          className={`p-2 rounded-lg text-sm font-medium ${getPaymentColor(candidate.paymentStatus)}`}
                        >
                          <option value="paid" className="text-gray-900">Paid ✅</option>
                          <option value="pending" className="text-gray-900">Pending ⏳</option>
                          <option value="failed" className="text-gray-900">Failed ❌</option>
                          <option value="refunded" className="text-gray-900">Refunded ↩️</option>
                        </select>
                        {candidate.paymentStatus === 'pending' && (
                          <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className={`text-center p-2 rounded-lg ${daysRemaining > 7 ? 'bg-green-100 text-green-800' : daysRemaining > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          <p className="font-bold">{daysRemaining}</p>
                          <p className="text-xs">days</p>
                        </div>
                        {daysRemaining <= 7 && daysRemaining > 0 && (
                          <p className="text-xs text-yellow-600 mt-1">Expiring soon</p>
                        )}
                        {daysRemaining === 0 && (
                          <p className="text-xs text-red-600 mt-1">Expired</p>
                        )}
                      </td>
                      <td className="p-4">
                        <select
                          value={candidate.assignedRecruiter || ''}
                          onChange={(e) => updateCandidateField(candidate.id, 'assignedRecruiter', e.target.value)}
                          className="p-2 border border-gray-300 rounded-lg text-sm w-full text-gray-900 bg-white"
                        >
                          <option value="" className="text-gray-900">Unassigned</option>
                          {RECRUITERS.map(rec => (
                            <option key={rec.id} value={rec.id} className="text-gray-900">
                              {rec.name} ({rec.candidates})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-800 mt-1">
                          Currently: {recruiter?.name || 'Unassigned'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              // View full candidate details
                              alert(`Viewing full profile for ${candidate.fullName}\n\nExperience: ${candidate.experience?.length || 0} positions\nEducation: ${candidate.education?.length || 0} entries\nSkills: ${candidate.technicalSkills?.length || 0} technical skills`)
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            View Full
                          </button>
                          <button 
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                          <button 
                            onClick={() => {
                              updateCandidateField(candidate.id, 'paymentStatus', 'paid')
                              updateCandidateField(candidate.id, 'subscriptionStatus', 'active')
                            }}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Mark as Paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">📊 Plan Distribution</h3>
          <div className="space-y-4">
            {SUBSCRIPTION_PLANS.map(plan => {
              const count = candidates.filter(c => c.subscriptionPlan === plan.id).length
              const percentage = candidates.length > 0 ? (count / candidates.length) * 100 : 0
              
              return (
                <div key={plan.id} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{plan.name}</span>
                    <span className="text-gray-900">{count} candidates ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${plan.id === 'gold' ? 'bg-yellow-500' : plan.id === 'platinum' ? 'bg-gray-600' : plan.id === 'silver' ? 'bg-gray-400' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">💰 Revenue by Plan</h3>
          <div className="space-y-4">
            {SUBSCRIPTION_PLANS.map(plan => {
              const count = candidates.filter(c => c.subscriptionPlan === plan.id && c.paymentStatus === 'paid').length
              const revenue = count * plan.price
              
              return (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(plan.id)}`}>
                      {plan.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-800">{count} paid subscriptions</p>
                  </div>
                </div>
              )
            })}
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900">Total Revenue</span>
                <span className="font-bold text-lg text-green-600">
                  ${SUBSCRIPTION_PLANS.reduce((sum, plan) => {
                    const count = candidates.filter(c => c.subscriptionPlan === plan.id && c.paymentStatus === 'paid').length
                    return sum + (count * plan.price)
                  }, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-bold text-blue-800 mb-2">💡 Admin Tips:</h4>
        <ul className="text-blue-700 space-y-2">
          <li>• <strong>Complete profiles</strong> generate better resumes - fill all sections</li>
          <li>• Candidates can add <strong>unlimited experiences, education, and projects</strong></li>
          <li>• <strong>Gold Plan ($79)</strong> is recommended for comprehensive resume generation</li>
          <li>• Follow up with <strong>Pending Payments</strong> within 24 hours</li>
          <li>• Update candidate profiles regularly for accuracy</li>
          <li>• Export data regularly for backup purposes</li>
        </ul>
      </div>
    </div>
  )
}

export default CandidateManagement