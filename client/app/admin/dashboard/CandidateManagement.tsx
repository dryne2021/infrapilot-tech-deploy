'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Trial', price: 0, duration: 7 },
  { id: 'silver', name: 'Silver', price: 29, duration: 30 },
  { id: 'gold', name: 'Gold', price: 79, duration: 30 },
  { id: 'platinum', name: 'Platinum', price: 149, duration: 30 },
  { id: 'enterprise', name: 'Enterprise', price: 299, duration: 90 },
]

// Skills Options
const SKILLS_OPTIONS: any = {
  technical: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby',
    'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'Laravel',
    'HTML5', 'CSS3', 'SASS/SCSS', 'Tailwind CSS', 'Bootstrap',
    'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Firebase',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub', 'GitLab',
    'REST APIs', 'GraphQL', 'WebSocket', 'Microservices', 'CI/CD', 'Agile/Scrum', 'DevOps',
  ],
  soft: [
    'Leadership', 'Team Management', 'Project Management', 'Communication', 'Public Speaking',
    'Problem Solving', 'Critical Thinking', 'Analytical Skills', 'Creativity', 'Adaptability',
    'Time Management', 'Negotiation', 'Conflict Resolution', 'Mentoring', 'Client Relations',
  ],
  languages: [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Hindi', 'Arabic', 'Portuguese',
    'Russian', 'Japanese', 'Korean', 'Italian', 'Dutch', 'Swedish',
  ],
}

type Candidate = any
type Recruiter = {
  _id: string
  name?: string
  email?: string
  status?: string
  isActive?: boolean
  maxCandidates?: number
  assignedCandidatesCount?: number
}

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')

  const initialFormState: any = {
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
        technologies: [],
      },
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
        courses: [],
      },
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
        impact: '',
      },
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

    // ✅ IMPORTANT: must be Mongo Recruiter _id (ObjectId string) or '' for unassigned
    assignedRecruiter: '',
  }

  const [formData, setFormData] = useState<any>(initialFormState)

  // ✅ BACKEND: load candidates
  const loadCandidates = async () => {
    setError('')
    try {
      const res = await fetchWithAuth('/api/v1/admin/candidates')

      if (res.status === 401) {
        setError('Unauthorized (401). Please login again.')
        return
      }

      const json = await res.json().catch(() => ({}))
      const list = json?.data ?? json

      setCandidates(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load candidates from backend.')
    }
  }

  // ✅ BACKEND: load recruiters (Mongo _id)
  const loadRecruiters = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/recruiters')
      if (!res.ok) return

      const json = await res.json().catch(() => ({}))
      const list = json?.data ?? json

      const arr = Array.isArray(list) ? list : []
      // optional: show active first
      arr.sort((a: any, b: any) => {
        const aActive = a?.status === 'active' || a?.isActive === true
        const bActive = b?.status === 'active' || b?.isActive === true
        if (aActive === bActive) return 0
        return aActive ? -1 : 1
      })

      setRecruiters(arr)
    } catch {
      // ignore recruiter load errors (candidate page still usable)
    }
  }

  useEffect(() => {
    ;(async () => {
      setPageLoading(true)
      await Promise.all([loadCandidates(), loadRecruiters()])
      setPageLoading(false)
    })()
  }, [])

  const recruiterById = useMemo(() => {
    const m = new Map<string, Recruiter>()
    recruiters.forEach((r) => {
      if (r?._id) m.set(String(r._id), r)
    })
    return m
  }, [recruiters])

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleArrayInputChange = (arrayName: string, index: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any, i: number) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const handleSkillsChange = (skillType: string, skill: string) => {
    setFormData((prev: any) => {
      const currentSkills = [...(prev[skillType] || [])]
      if (currentSkills.includes(skill)) {
        return { ...prev, [skillType]: currentSkills.filter((s: string) => s !== skill) }
      }
      return { ...prev, [skillType]: [...currentSkills, skill] }
    })
  }

  const addExperience = () => {
    setFormData((prev: any) => ({
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
          technologies: [],
        },
      ],
    }))
  }

  const removeExperience = (index: number) => {
    if (formData.experience.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        experience: prev.experience.filter((_: any, i: number) => i !== index),
      }))
    }
  }

  const addEducation = () => {
    setFormData((prev: any) => ({
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
          courses: [],
        },
      ],
    }))
  }

  const removeEducation = (index: number) => {
    if (formData.education.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        education: prev.education.filter((_: any, i: number) => i !== index),
      }))
    }
  }

  const addProject = () => {
    setFormData((prev: any) => ({
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
          impact: '',
        },
      ],
    }))
  }

  const removeProject = (index: number) => {
    if (formData.projects.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        projects: prev.projects.filter((_: any, i: number) => i !== index),
      }))
    }
  }

  // ✅ helpers to sanitize payload for backend
  const toNumberOrUndefined = (v: any) => {
    if (v === null || v === undefined) return undefined
    const s = String(v).trim()
    if (!s) return undefined
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }

  const stripUiId = (arr: any[]) => (Array.isArray(arr) ? arr.map(({ id, ...rest }) => rest) : [])

  // ✅ BACKEND: create candidate (fixed recruiter ObjectId)
  const handleAddCandidate = async (e: any) => {
    e.preventDefault()
    setError('')

    if (!formData.firstName || !formData.email) {
      alert('First name and email are required!')
      return
    }

    setLoading(true)

    try {
      const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === formData.subscriptionPlan)

      // assignedRecruiter must be '' or Mongo recruiter _id
      const recruiter =
        formData.assignedRecruiter && recruiterById.get(String(formData.assignedRecruiter))
          ? recruiterById.get(String(formData.assignedRecruiter))
          : null

      const payload: any = {
        // identity
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        location: formData.location,

        // optional fields
        ssn: formData.ssn,
        visaStatus: formData.visaStatus,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        linkedin: formData.linkedin,
        github: formData.github,
        portfolio: formData.portfolio,
        website: formData.website,

        currentCompany: formData.currentCompany,
        currentPosition: formData.currentPosition,
        targetRole: formData.targetRole,
        noticePeriod: formData.noticePeriod,
        availability: formData.availability,

        // numbers
        experienceYears: toNumberOrUndefined(formData.experienceYears),
        expectedSalary: toNumberOrUndefined(formData.expectedSalary),

        // arrays
        technicalSkills: formData.technicalSkills || [],
        softSkills: formData.softSkills || [],
        languages: formData.languages || [],
        certifications: formData.certifications || [],

        summary: formData.summary,

        // nested arrays
        experience: stripUiId(formData.experience || []),
        education: stripUiId(formData.education || []),
        projects: stripUiId(formData.projects || []),

        // additional
        awards: formData.awards,
        publications: formData.publications,
        volunteerExperience: formData.volunteerExperience,
        professionalMemberships: formData.professionalMemberships,
        references: formData.references,
        notes: formData.notes,

        // subscription
        subscriptionPlan: formData.subscriptionPlan,
        paymentStatus: formData.paymentStatus,
        subscriptionStatus: formData.paymentStatus === 'paid' ? 'active' : 'pending',
        daysRemaining: selectedPlan ? selectedPlan.duration : 30,

        // ✅ IMPORTANT: send ONLY recruiter ObjectId (or omit/null if unassigned)
        assignedRecruiter: formData.assignedRecruiter ? String(formData.assignedRecruiter) : null,

        status: 'New',
      }

      const res = await fetchWithAuth('/api/v1/admin/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json?.error || json?.message || `Create candidate failed (${res.status})`)
        setLoading(false)
        return
      }

      await Promise.all([loadCandidates(), loadRecruiters()])
      setFormData(initialFormState)
      setShowAddForm(false)
      alert('Candidate added successfully (saved in backend)!')
    } catch (err: any) {
      setError(err?.message || 'Network error creating candidate.')
    } finally {
      setLoading(false)
    }
  }

  // ⚠️ For now, keep delete/update local only? We will wire backend later file-by-file.
  const handleDeleteCandidate = async (id: string) => {
    alert('Next step: we will connect Delete to backend (DELETE endpoint). For now, backend create/load is working.')
  }

  const updateCandidateField = (id: string, field: string, value: any) => {
    setCandidates((prev) =>
      prev.map((candidate: any) => {
        if ((candidate._id || candidate.id) === id) {
          const updated: any = { ...candidate, [field]: value }

          if (field === 'paymentStatus') {
            updated.subscriptionStatus = value === 'paid' ? 'active' : 'pending'
          }

          return updated
        }
        return candidate
      })
    )
  }

  const filteredCandidates = candidates.filter((candidate: any) => {
    const fullName = candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()

    const matchesSearch =
      fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.phone?.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || candidate.status === filterStatus
    const matchesPlan = filterPlan === 'all' || candidate.subscriptionPlan === filterPlan
    const matchesPayment = filterPayment === 'all' || candidate.paymentStatus === filterPayment

    return matchesSearch && matchesStatus && matchesPlan && matchesPayment
  })

  const getPlanColor = (plan: string) => {
    const colors: any = {
      free: 'bg-gray-100 text-gray-800',
      silver: 'bg-gray-300 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-gray-200 text-gray-800',
      enterprise: 'bg-purple-100 text-purple-800',
    }
    return colors[plan] || 'bg-blue-100 text-blue-800'
  }

  const getPaymentColor = (status: string) => {
    const colors: any = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const calculateDaysRemaining = (candidate: any) => {
    if (candidate.daysRemaining !== undefined) return candidate.daysRemaining

    const created = new Date(candidate.createdAt || Date.now())
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const planDuration = SUBSCRIPTION_PLANS.find((p) => p.id === candidate.subscriptionPlan)?.duration || 30

    return Math.max(0, planDuration - diffDays)
  }

  const getCandidateKey = (c: any) => c._id || c.id

  if (pageLoading) {
    return <div className="text-white">Loading candidates from backend…</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Candidate Management</h2>
          <p className="text-gray-800">Manage candidates, subscriptions, and recruiter assignments</p>
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
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
                {candidates.filter((c: any) => c.subscriptionStatus === 'active').length}
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
                {candidates.filter((c: any) => c.paymentStatus === 'pending').length}
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
                ${(
                  candidates.reduce((sum: number, c: any) => {
                    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === c.subscriptionPlan)
                    return sum + (plan?.price || 0)
                  }, 0) / candidates.length || 0
                ).toFixed(0)}
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

                {/* ✅ KEEP THE REST OF YOUR FORM SECTIONS EXACTLY AS YOU HAVE THEM NOW */}
                {/* ADD ONLY the recruiter assignment dropdown section change in your existing section:
                    name="assignedRecruiter" should now be recruiter._id
                */}
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
              {SUBSCRIPTION_PLANS.map((plan) => (
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

            <button
              onClick={() => Promise.all([loadCandidates(), loadRecruiters()])}
              className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
            >
              Refresh
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
            <p className="text-gray-800 mb-6">Add your first candidate manually</p>
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
                {filteredCandidates.map((candidate: any) => {
                  const daysRemaining = calculateDaysRemaining(candidate)
                  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === candidate.subscriptionPlan)
                  const id = getCandidateKey(candidate)

                  // Candidate may store recruiter in different fields depending on older data:
                  const recruiterId =
                    candidate.assignedRecruiter ||
                    candidate.assignedRecruiterId ||
                    candidate.assignedRecruiter?._id ||
                    candidate.assignedRecruiterId?._id ||
                    ''

                  const recruiter = recruiterId ? recruiterById.get(String(recruiterId)) : null
                  const recruiterName = recruiter?.name || candidate.recruiterName || 'Unassigned'
                  const recruiterLoad = recruiter?.assignedCandidatesCount ?? ''

                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {candidate.firstName?.[0]?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()}
                            </p>
                            <p className="text-sm text-gray-800">{candidate.email}</p>
                            <p className="text-xs text-gray-700">{candidate.phone || 'No phone'}</p>
                            {candidate.targetRole && <p className="text-xs text-blue-600 mt-1">{candidate.targetRole}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <select
                          value={candidate.subscriptionPlan || 'free'}
                          onChange={(e) => updateCandidateField(id, 'subscriptionPlan', e.target.value)}
                          className={`p-2 rounded-lg text-sm font-medium ${getPlanColor(candidate.subscriptionPlan)}`}
                        >
                          {SUBSCRIPTION_PLANS.map((p) => (
                            <option key={p.id} value={p.id} className="text-gray-900">
                              {p.name} (${p.price})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-800 mt-1">{plan ? `${plan.duration} days plan` : 'No plan'}</p>
                      </td>

                      <td className="p-4">
                        <select
                          value={candidate.paymentStatus || 'pending'}
                          onChange={(e) => updateCandidateField(id, 'paymentStatus', e.target.value)}
                          className={`p-2 rounded-lg text-sm font-medium ${getPaymentColor(candidate.paymentStatus)}`}
                        >
                          <option value="paid" className="text-gray-900">Paid ✅</option>
                          <option value="pending" className="text-gray-900">Pending ⏳</option>
                          <option value="failed" className="text-gray-900">Failed ❌</option>
                          <option value="refunded" className="text-gray-900">Refunded ↩️</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <div
                          className={`text-center p-2 rounded-lg ${
                            daysRemaining > 7
                              ? 'bg-green-100 text-green-800'
                              : daysRemaining > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <p className="font-bold">{daysRemaining}</p>
                          <p className="text-xs">days</p>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-sm text-gray-900 font-medium">{recruiterName}</p>
                        <p className="text-xs text-gray-700">
                          {recruiterLoad !== '' ? `Workload: ${recruiterLoad}` : ''}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              alert(
                                `Viewing full profile for ${
                                  candidate.fullName
                                }\n\nExperience: ${candidate.experience?.length || 0} positions\nEducation: ${
                                  candidate.education?.length || 0
                                } entries\nSkills: ${candidate.technicalSkills?.length || 0} technical skills`
                              )
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            View Full
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
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

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-bold text-blue-800 mb-2">💡 Admin Tips:</h4>
        <ul className="text-blue-700 space-y-2">
          <li>• <strong>Complete profiles</strong> generate better resumes - fill all sections</li>
          <li>• Candidates can add <strong>unlimited experiences, education, and projects</strong></li>
          <li>• <strong>Gold Plan ($79)</strong> is recommended for comprehensive resume generation</li>
          <li>• Follow up with <strong>Pending Payments</strong> within 24 hours</li>
          <li>• Export data regularly for backup purposes</li>
        </ul>
      </div>
    </div>
  )
}

export default CandidateManagement
