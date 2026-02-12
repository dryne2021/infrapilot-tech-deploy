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

  // -----------------------------
  // ✅ Credentials Modal state
  // -----------------------------
  const [showCredModal, setShowCredModal] = useState(false)
  const [credCandidate, setCredCandidate] = useState<any>(null)
  const [credUsername, setCredUsername] = useState('')
  const [credPassword, setCredPassword] = useState('')
  const [credLoading, setCredLoading] = useState(false)
  const [credError, setCredError] = useState('')
  const [credSuccess, setCredSuccess] = useState('')

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

    // Work Experience (array) - At least one required with Company, Title, and Start Date
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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
      // ignore recruiter load errors
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
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleArrayInputChange = (arrayName: string, index: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any, i: number) => (i === index ? { ...item, [field]: value } : item)),
    }))
    // Clear experience errors when user starts typing
    if (arrayName === 'experience' && (field === 'company' || field === 'title' || field === 'startDate')) {
      setFormErrors(prev => ({ ...prev, experience: '' }))
    }
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

  // ✅ Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Required fields
    if (!formData.firstName.trim()) errors.firstName = 'First name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'

    // Validate experience - at least one experience with Company, Title, and Start Date
    const hasValidExperience = formData.experience.some((exp: any) => 
      exp.company.trim() && exp.title.trim() && exp.startDate.trim()
    )

    if (!hasValidExperience) {
      errors.experience = 'At least one experience entry with Company, Title, and Start Date is required'
    }

    // Validate each experience entry
    formData.experience.forEach((exp: any, index: number) => {
      if (!exp.company.trim() && !exp.title.trim() && !exp.startDate.trim()) {
        // Only show error if this is the first experience and it's incomplete
        if (index === 0 && formData.experience.length === 1) {
          // Error already shown by hasValidExperience check
        }
      } else if (!exp.company.trim() || !exp.title.trim() || !exp.startDate.trim()) {
        // If some fields are filled but not all
        if (!exp.company.trim()) errors[`experience_${index}_company`] = 'Company is required'
        if (!exp.title.trim()) errors[`experience_${index}_title`] = 'Title is required'
        if (!exp.startDate.trim()) errors[`experience_${index}_startDate`] = 'Start date is required'
      }
    })

    return errors
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

  // ✅ BACKEND: create candidate
  const handleAddCandidate = async (e: any) => {
    e.preventDefault()
    setError('')

    // Validate form
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      alert('Please fill in all required fields, including at least one complete experience entry.')
      return
    }

    setLoading(true)

    try {
      const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === formData.subscriptionPlan)

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
      setFormErrors({})
      setShowAddForm(false)
      alert('Candidate added successfully (saved in backend)!')
    } catch (err: any) {
      setError(err?.message || 'Network error creating candidate.')
    } finally {
      setLoading(false)
    }
  }

  // ✅ REAL BACKEND DELETE FUNCTION
  const handleDeleteCandidate = async (id: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to permanently delete this candidate?\n\nThis action cannot be undone."
    )

    if (!confirmDelete) return

    setLoading(true)

    try {
      const res = await fetchWithAuth(`/api/v1/admin/candidates/${id}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json?.error || json?.message || `Delete failed (${res.status})`)
        setLoading(false)
        return
      }

      // Remove from UI instantly
      setCandidates(prev =>
        prev.filter((c: any) => (c._id || c.id) !== id)
      )

      alert('✅ Candidate deleted successfully')

    } catch (err: any) {
      alert(err?.message || 'Network error deleting candidate.')
    } finally {
      setLoading(false)
    }
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

  // -----------------------------
  // ✅ Credentials helpers
  // -----------------------------
  const generatePassword = (length = 12) => {
    // simple strong-ish generator: letters + digits + symbols
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-='
    let out = ''
    for (let i = 0; i < length; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return out
  }

  const openCredentialsModal = (candidate: any) => {
    setCredCandidate(candidate)
    setCredUsername(candidate?.email || '')
    setCredPassword(generatePassword(12))
    setCredError('')
    setCredSuccess('')
    setShowCredModal(true)
  }

  const closeCredentialsModal = () => {
    setShowCredModal(false)
    setCredCandidate(null)
    setCredUsername('')
    setCredPassword('')
    setCredLoading(false)
    setCredError('')
    setCredSuccess('')
  }

  const submitCredentials = async (e: any) => {
    e.preventDefault()
    setCredError('')
    setCredSuccess('')

    if (!credCandidate?._id && !credCandidate?.id) {
      setCredError('Missing candidate id.')
      return
    }
    if (!credUsername.trim()) {
      setCredError('Username is required.')
      return
    }
    if (!credPassword.trim() || credPassword.trim().length < 6) {
      setCredError('Password must be at least 6 characters.')
      return
    }

    const candidateId = String(credCandidate._id || credCandidate.id)

    setCredLoading(true)
    try {
      const res = await fetchWithAuth(`/api/v1/admin/candidates/${candidateId}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: credUsername.trim(),
          password: credPassword.trim(),
          email: credCandidate.email || credUsername.trim(),
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setCredError(json?.error || json?.message || `Failed (${res.status})`)
        setCredLoading(false)
        return
      }

      setCredSuccess('✅ Credentials saved successfully! Candidate can now log in using these credentials.')
      
      // Refresh candidate list to update the credentials status
      await loadCandidates()
      
      // Keep modal open for 3 seconds so admin can copy the credentials
      setTimeout(() => {
        if (credSuccess) {
          closeCredentialsModal()
        }
      }, 3000)

    } catch (err: any) {
      setCredError(err?.message || 'Network error creating credentials.')
    } finally {
      setCredLoading(false)
    }
  }

  // ✅ Helper to detect if candidate has credentials
  const hasCredentials = (candidate: any) => {
    return (
      candidate?.credentialsGenerated === true ||
      candidate?.hasCredentials === true ||
      candidate?.username !== undefined ||
      candidate?.passwordHash !== undefined ||
      candidate?.loginEnabled === true ||
      candidate?.canLogin === true
    )
  }

  // ✅ Helper to get candidate login status
  const getLoginStatus = (candidate: any) => {
    if (hasCredentials(candidate)) {
      return {
        hasCreds: true,
        statusText: 'Credentials Set',
        statusClass: 'bg-green-100 text-green-800',
        icon: '✅'
      }
    } else {
      return {
        hasCreds: false,
        statusText: 'No Credentials',
        statusClass: 'bg-yellow-100 text-yellow-800',
        icon: '⏳'
      }
    }
  }

  // ✅ Copy credentials to clipboard
  const copyCredentialsToClipboard = () => {
    const text = `Username: ${credUsername}\nPassword: ${credPassword}`
    navigator.clipboard.writeText(text)
      .then(() => {
        const originalSuccess = credSuccess
        setCredSuccess('✅ Credentials copied to clipboard!')
        setTimeout(() => setCredSuccess(originalSuccess), 2000)
      })
      .catch(() => {
        setCredError('Failed to copy to clipboard')
      })
  }

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
              <p className="text-sm text-gray-900">With Login Access</p>
              <p className="text-xl font-bold mt-1 text-gray-900">
                {candidates.filter((c: any) => hasCredentials(c)).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">🔐</span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Create Credentials Modal */}
      {showCredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">🔐 Create Login Credentials</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    Candidate: <span className="font-semibold text-gray-900">
                      {credCandidate?.fullName || `${credCandidate?.firstName || ''} ${credCandidate?.lastName || ''}`.trim() || credCandidate?.email}
                    </span>
                  </p>
                </div>
                <button onClick={closeCredentialsModal} className="text-gray-900 hover:text-gray-700 text-2xl">
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={submitCredentials} className="p-6 space-y-4">
              {credError && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{credError}</p>
                </div>
              )}
              {credSuccess && (
                <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">{credSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Username</label>
                <input
                  type="text"
                  value={credUsername}
                  onChange={(e) => setCredUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  placeholder="default = candidate email"
                />
                <p className="text-xs text-gray-600 mt-1">Tip: Use email as username (recommended).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={credPassword}
                    onChange={(e) => setCredPassword(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                    placeholder="Enter a password or generate one"
                  />
                  <button
                    type="button"
                    onClick={() => setCredPassword(generatePassword(12))}
                    className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">Minimum 6 characters.</p>
              </div>

              {/* ✅ Login Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Candidate Login Instructions:</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Candidate can log in at: <strong>/candidate/login</strong>
                </p>
                <p className="text-sm text-blue-700">
                  Use the username and password above to access their dashboard, edit profile, and generate resumes.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyCredentialsToClipboard}
                  className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  📋 Copy
                </button>
                <button
                  type="button"
                  onClick={closeCredentialsModal}
                  className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={credLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {credLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Credentials'
                  )}
                </button>
              </div>

              <div className="text-xs text-gray-600 pt-2">
                Note: For security, only the password you enter here is shown. The backend stores a hash.
              </div>
            </form>
          </div>
        </div>
      )}

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
                      {formErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                      )}
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
                      {formErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                      )}
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
                    <span className="bg-green-100 text-green-600 p-2 rounded-lg">🌐</span>
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
                        placeholder="https://linkedin.com/in/username"
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
                        placeholder="https://github.com/username"
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
                        placeholder="https://portfolio.example.com"
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
                        placeholder="https://personalwebsite.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Professional Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">💼</span>
                    Professional Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Current Company</label>
                      <input
                        type="text"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Microsoft, Google, etc."
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
                        placeholder="Senior Software Engineer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="5"
                        min="0"
                        max="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Target Role</label>
                      <input
                        type="text"
                        name="targetRole"
                        value={formData.targetRole}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        placeholder="Full Stack Developer, DevOps Engineer, etc."
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
                        placeholder="120000"
                        min="0"
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
                        <option value="immediate" className="text-gray-900">Immediate</option>
                        <option value="1_week" className="text-gray-900">1 Week</option>
                        <option value="2_weeks" className="text-gray-900">2 Weeks</option>
                        <option value="1_month" className="text-gray-900">1 Month</option>
                        <option value="2_months" className="text-gray-900">2 Months</option>
                        <option value="3_months" className="text-gray-900">3 Months</option>
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
                        <option value="immediate" className="text-gray-900">Immediately Available</option>
                        <option value="1_month" className="text-gray-900">Available in 1 Month</option>
                        <option value="2_months" className="text-gray-900">Available in 2 Months</option>
                        <option value="3_months" className="text-gray-900">Available in 3 Months</option>
                        <option value="actively_looking" className="text-gray-900">Actively Looking</option>
                        <option value="passively_looking" className="text-gray-900">Passively Looking</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Work Experience - REQUIRED */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">💼</span>
                      Work Experience *
                    </h4>
                    {formErrors.experience && (
                      <p className="text-red-500 text-sm">{formErrors.experience}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    At least one experience entry with Company, Title, and Start Date is required.
                  </p>

                  {formData.experience.map((exp: any, index: number) => (
                    <div key={exp.id} className="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
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
                            required
                          />
                          {formErrors[`experience_${index}_title`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`experience_${index}_title`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Company *</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => handleArrayInputChange('experience', index, 'company', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Microsoft"
                            required
                          />
                          {formErrors[`experience_${index}_company`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`experience_${index}_company`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                          <input
                            type="text"
                            value={exp.location}
                            onChange={(e) => handleArrayInputChange('experience', index, 'location', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="San Francisco, CA"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Start Date *</label>
                          <input
                            type="date"
                            value={exp.startDate}
                            onChange={(e) => handleArrayInputChange('experience', index, 'startDate', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            required
                          />
                          {formErrors[`experience_${index}_startDate`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`experience_${index}_startDate`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                          <input
                            type="date"
                            value={exp.endDate}
                            onChange={(e) => handleArrayInputChange('experience', index, 'endDate', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            disabled={exp.currentlyWorking}
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`currentlyWorking-${index}`}
                            checked={exp.currentlyWorking}
                            onChange={(e) => handleArrayInputChange('experience', index, 'currentlyWorking', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`currentlyWorking-${index}`} className="ml-2 text-sm text-gray-900">
                            I currently work here
                          </label>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => handleArrayInputChange('experience', index, 'description', e.target.value)}
                          rows={3}
                          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          placeholder="Describe your responsibilities, projects, and achievements..."
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Key Achievements (up to 3)</label>
                        {exp.achievements.map((achievement: string, achIndex: number) => (
                          <input
                            key={achIndex}
                            type="text"
                            value={achievement}
                            onChange={(e) => {
                              const newAchievements = [...exp.achievements]
                              newAchievements[achIndex] = e.target.value
                              handleArrayInputChange('experience', index, 'achievements', newAchievements)
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white mb-2"
                            placeholder={`Achievement ${achIndex + 1}`}
                          />
                        ))}
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Technologies Used (comma-separated)</label>
                        <input
                          type="text"
                          value={exp.technologies.join(', ')}
                          onChange={(e) => handleArrayInputChange('experience', index, 'technologies', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          placeholder="React, Node.js, AWS, Docker"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExperience}
                    className="mt-4 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    + Add Another Experience
                  </button>
                </div>

                {/* Section 5: Education */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">🎓</span>
                    Education
                  </h4>

                  {formData.education.map((edu: any, index: number) => (
                    <div key={edu.id} className="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
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
                          <label className="block text-sm font-medium text-gray-900 mb-1">Degree *</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => handleArrayInputChange('education', index, 'degree', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Bachelor of Science"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Field of Study *</label>
                          <input
                            type="text"
                            value={edu.field}
                            onChange={(e) => handleArrayInputChange('education', index, 'field', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Computer Science"
                            required
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
                            required
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
                            type="number"
                            value={edu.graduationYear}
                            onChange={(e) => handleArrayInputChange('education', index, 'graduationYear', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="2020"
                            min="1900"
                            max="2030"
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

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Honors/Awards</label>
                          <input
                            type="text"
                            value={edu.honors}
                            onChange={(e) => handleArrayInputChange('education', index, 'honors', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                            placeholder="Summa Cum Laude, Dean's List"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Relevant Courses (comma-separated)</label>
                        <input
                          type="text"
                          value={edu.courses.join(', ')}
                          onChange={(e) => handleArrayInputChange('education', index, 'courses', e.target.value.split(',').map((c: string) => c.trim()).filter(Boolean))}
                          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                          placeholder="Data Structures, Algorithms, Database Systems, Machine Learning"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEducation}
                    className="mt-4 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50"
                  >
                    + Add Another Education
                  </button>
                </div>

                {/* Rest of the form sections remain exactly as they were */}
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

                  const recruiterId =
                    candidate.assignedRecruiter ||
                    candidate.assignedRecruiterId ||
                    candidate.assignedRecruiter?._id ||
                    candidate.assignedRecruiterId?._id ||
                    ''

                  const recruiter = recruiterId ? recruiterById.get(String(recruiterId)) : null
                  const recruiterName = recruiter?.name || candidate.recruiterName || 'Unassigned'
                  const recruiterLoad = recruiter?.assignedCandidatesCount ?? ''

                  // ✅ Get candidate login status
                  const loginStatus = getLoginStatus(candidate)

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
                            <div className="mt-1">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${loginStatus.statusClass}`}>
                                {loginStatus.icon} {loginStatus.statusText}
                              </span>
                            </div>
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

                          {/* ✅ Create/Update Login Credentials */}
                          <button
                            onClick={() => openCredentialsModal(candidate)}
                            className={`px-3 py-1 text-sm rounded ${
                              loginStatus.hasCreds
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={loginStatus.hasCreds ? 'Update / Reset credentials' : 'Create login credentials'}
                          >
                            {loginStatus.hasCreds ? 'Update Credentials' : 'Create Login'}
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
          <li>• <strong>Create login credentials</strong> for candidates so they can access their portal</li>
          <li>• Candidates can log in at <strong>/candidate/login</strong> with their credentials</li>
          <li>• <strong>Complete profiles</strong> generate better resumes - fill all sections</li>
          <li>• Candidates can add <strong>unlimited experiences, education, and projects</strong></li>
          <li>• <strong>Gold Plan ($79)</strong> is recommended for comprehensive resume generation</li>
          <li>• Follow up with <strong>Pending Payments</strong> within 24 hours</li>
        </ul>
      </div>
    </div>
  )
}

export default CandidateManagement