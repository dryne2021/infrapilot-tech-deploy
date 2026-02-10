'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RecruiterPage() {
  const [user, setUser] = useState<any>(null)
  const [assignedCandidates, setAssignedCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [showCandidateDetails, setShowCandidateDetails] = useState(false)
  const [candidateJobs, setCandidateJobs] = useState([])
  const [stats, setStats] = useState({
    totalAssigned: 0,
    activeSubscriptions: 0,
    pendingFollowups: 0,
    interviewsThisWeek: 0
  })
  const [editingJob, setEditingJob] = useState<any>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [jobFormData, setJobFormData] = useState({
    jobTitle: '',
    company: '',
    description: '',
    status: 'Applied',
    resumeStatus: 'Pending',
    matchScore: 70,
    salaryRange: ''
  })
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [currentSessionDuration, setCurrentSessionDuration] = useState(0)
  const [totalWorkedToday, setTotalWorkedToday] = useState(0)
  const [workSessions, setWorkSessions] = useState<any[]>([])

  // Resume Generation State
  const [showResumeGenerator, setShowResumeGenerator] = useState(false)
  const [jobIdForResume, setJobIdForResume] = useState('')
  const [jobDescriptionForResume, setJobDescriptionForResume] = useState('')
  const [generatedResume, setGeneratedResume] = useState('')
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)
  const [resumeGenerationHistory, setResumeGenerationHistory] = useState<any[]>([])
  const [resumeError, setResumeError] = useState('')

  // ✅ FIXED: Use window.location.origin or NEXT_PUBLIC_API_BASE_URL (no localhost fallback)
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const router = useRouter()

  // ✅ FIXED: API HELPER FUNCTION with Bearer Token
  const api = async (
    path: string,
    options: (RequestInit & { headers?: HeadersInit }) = {}
  ) => {
    const token = localStorage.getItem('infrapilot_token')

    const res = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    })

    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '')

    if (!res.ok) {
      const msg =
        typeof data === 'string'
          ? data
          : (data as any)?.message || `Request failed (${res.status})`
      throw new Error(msg)
    }

    return data
  }

  // ✅ FIXED: recruiter loads assigned candidates from DB - CORRECT ENDPOINT
  const fetchAssignedCandidates = () =>
    api(`/api/v1/recruiter/candidates`, { method: 'GET' })

  // ✅ MONGO-BACKED JOB APIS (UPDATED ROUTES)
  const fetchCandidateJobs = (candidateId: string, recruiterId: string) =>
    api(`/api/v1/job-applications/candidate/${candidateId}?recruiterId=${recruiterId}`, {
      method: 'GET'
    })

  const createCandidateJob = (payload: any) =>
    api(`/api/v1/job-applications`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

  const updateCandidateJob = (jobDbId: string, payload: any) =>
    api(`/api/v1/job-applications/${jobDbId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

  const deleteCandidateJob = (jobDbId: string) =>
    api(`/api/v1/job-applications/${jobDbId}`, {
      method: 'DELETE'
    })

  // ✅ Save resume directly into JobApplication
  const saveJobResume = (jobDbId: string, resumeText: string, jobDescriptionFull: string) =>
    updateCandidateJob(jobDbId, {
      resumeText,
      jobDescriptionFull,
      resumeStatus: 'Submitted'
    })

  // ✅ HELPER FUNCTION - Ensure candidate data has proper structure
  const ensureCandidateDataStructure = (candidate: any) => {
    if (!candidate) return candidate

    const structuredCandidate = { ...candidate }

    // ✅ Ensure candidate has a consistent id field
    if (!structuredCandidate.id && structuredCandidate._id) {
      structuredCandidate.id = structuredCandidate._id
    }

    // Ensure skills is an array
    if (!Array.isArray(structuredCandidate.skills)) {
      if (typeof structuredCandidate.skills === 'string') {
        structuredCandidate.skills = structuredCandidate.skills
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      } else {
        structuredCandidate.skills = []
      }
    }

    // ✅ IMPORTANT: keep BOTH "experience" and "workHistory" safe
    // Ensure experience is an array with proper structure
    if (!Array.isArray(structuredCandidate.experience)) {
      if (typeof structuredCandidate.experience === 'string') {
        try {
          structuredCandidate.experience = JSON.parse(structuredCandidate.experience)
        } catch {
          structuredCandidate.experience = []
        }
      } else {
        structuredCandidate.experience = []
      }
    }

    // Ensure workHistory is an array
    if (!Array.isArray(structuredCandidate.workHistory)) {
      if (typeof structuredCandidate.workHistory === 'string') {
        try {
          structuredCandidate.workHistory = JSON.parse(structuredCandidate.workHistory)
        } catch {
          structuredCandidate.workHistory = []
        }
      } else {
        structuredCandidate.workHistory = []
      }
    }

    // Ensure education is an array
    if (!Array.isArray(structuredCandidate.education)) {
      if (typeof structuredCandidate.education === 'string') {
        try {
          structuredCandidate.education = JSON.parse(structuredCandidate.education)
        } catch {
          structuredCandidate.education = []
        }
      } else {
        structuredCandidate.education = []
      }
    }

    // Ensure certifications is an array
    if (!Array.isArray(structuredCandidate.certifications)) {
      if (typeof structuredCandidate.certifications === 'string') {
        structuredCandidate.certifications = structuredCandidate.certifications
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      } else {
        structuredCandidate.certifications = []
      }
    }

    // Ensure projects is an array
    if (!Array.isArray(structuredCandidate.projects)) {
      if (typeof structuredCandidate.projects === 'string') {
        try {
          structuredCandidate.projects = JSON.parse(structuredCandidate.projects)
        } catch {
          structuredCandidate.projects = []
        }
      } else {
        structuredCandidate.projects = []
      }
    }

    // Add missing fields if they don't exist
    if (!structuredCandidate.experienceYears) {
      structuredCandidate.experienceYears = Math.max(3, Math.floor(structuredCandidate.skills.length / 2))
    }

    if (!structuredCandidate.summary && structuredCandidate.about) {
      structuredCandidate.summary = structuredCandidate.about
    }

    if (!structuredCandidate.summary) {
      structuredCandidate.summary = `Experienced ${
        structuredCandidate.currentPosition || 'professional'
      } with expertise in ${structuredCandidate.skills.slice(0, 3).join(', ')}.`
    }

    return structuredCandidate
  }

  // ✅ NEW: Normalize Experience -> fixes backend validation: company/title/dates required
  const buildDates = (exp: any) => {
    if (exp?.dates && String(exp.dates).trim()) return String(exp.dates).trim()

    const start = exp?.startDate ? String(exp.startDate).trim() : ''
    const end =
      exp?.currentlyWorking === true
        ? 'Present'
        : exp?.endDate
          ? String(exp.endDate).trim()
          : ''

    if (start && end) return `${start} - ${end}`
    if (start) return `${start} - Present`
    return ''
  }

  const normalizeExperience = (candidate: any) => {
    const raw =
      Array.isArray(candidate?.experience) && candidate.experience.length
        ? candidate.experience
        : Array.isArray(candidate?.workHistory) && candidate.workHistory.length
          ? candidate.workHistory
          : []

    return raw
      .map((e: any) => {
        const title = e?.title || e?.position || e?.role || ''
        const company = e?.company || e?.employer || ''
        const dates = buildDates(e)

        return {
          title: String(title).trim(),
          company: String(company).trim(),
          dates: String(dates).trim(),
          location: e?.location || '',
          description: e?.description || '',
          achievements: Array.isArray(e?.achievements) ? e.achievements : [],
          technologies: Array.isArray(e?.technologies) ? e.technologies : []
        }
      })
      // ✅ keep only valid ones for strict backend rules
      .filter((e: any) => e.title && e.company && e.dates)
  }

  // ✅ HELPER: download .docx from backend using POST /resume/download
  const downloadDocxFromText = async (candidate: any, resumeText: string) => {
    const token = localStorage.getItem('infrapilot_token')
    const fileSafeName = (candidate?.fullName ||
      `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() ||
      'Candidate'
    ).replace(/\s+/g, '_')

    const payload = {
      name: candidate?.fullName || `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim(),
      email: candidate?.email || '',
      phone: candidate?.phone || '',
      location: candidate?.location || '',
      text: resumeText
    }

    const res = await fetch(`${apiBaseUrl}/api/v1/resume/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    const contentType = res.headers.get('content-type') || ''
    if (!res.ok) {
      if (contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || `Word download failed (${res.status})`)
      }
      throw new Error(`Word download failed (${res.status})`)
    }

    if (!contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      const maybeText = await res.text().catch(() => '')
      throw new Error(`Expected DOCX but got Content-Type: ${contentType}. Response: ${maybeText.slice(0, 200)}`)
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `Resume_${fileSafeName}_${jobIdForResume || Date.now()}.docx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    window.URL.revokeObjectURL(url)
  }

  // ✅ FUNCTION: Generate and download Word resume
  const generateAndDownloadWordResume = async () => {
    if (!jobIdForResume.trim() || !jobDescriptionForResume.trim()) {
      alert('Please enter both Job ID and Job Description')
      return
    }

    if (!selectedCandidate) {
      alert('Please select a candidate first')
      return
    }

    setIsGeneratingResume(true)
    setResumeError('')

    try {
      const candidate: any = ensureCandidateDataStructure(selectedCandidate)
      const token = localStorage.getItem('infrapilot_token')

      // ✅ FIX: normalize experience so backend sees company/title/dates
      const normalizedExp = normalizeExperience(candidate)
      if (!normalizedExp.length) {
        throw new Error(
          'Student experience is required. Please ensure at least one experience has Title, Company, and Dates.'
        )
      }

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        skills: candidate.skills,
        experience: normalizedExp,
        education: candidate.education,
        certifications: candidate.certifications,
        projects: candidate.projects,
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume
      }

      // 1) Generate resume text (JSON)
      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || `Generate failed (${res.status})`)
      }

      const resumeText = data?.resumeText || ''
      if (!resumeText.trim()) {
        throw new Error('No resume text returned from API')
      }

      // ✅ show in UI
      setGeneratedResume(resumeText)

      // ✅ attach resume to THIS job in MongoDB
      if (editingJob?._id) {
        await saveJobResume(editingJob._id, resumeText, jobDescriptionForResume)
      }

      // 2) Download Word (.docx)
      await downloadDocxFromText(candidate, resumeText)

      alert('✅ Word resume downloaded (.docx) and saved to job!')
    } catch (err: any) {
      console.error('❌ Word generation/download error:', err)
      setResumeError(err?.message || 'Failed to generate/download Word resume')
      alert(`❌ ${err?.message || 'Failed to generate/download Word resume'}`)
    } finally {
      setIsGeneratingResume(false)
    }
  }

  // ✅ UPDATED: Function to generate resume
  const generateResume = async () => {
    if (!jobIdForResume.trim() || !jobDescriptionForResume.trim()) {
      alert('Please enter both Job ID and Job Description')
      return
    }

    if (!selectedCandidate) {
      alert('Please select a candidate first')
      return
    }

    setIsGeneratingResume(true)
    setResumeError('')
    setGeneratedResume('')

    try {
      const candidate: any = ensureCandidateDataStructure(selectedCandidate)
      const token = localStorage.getItem('infrapilot_token')

      // ✅ FIX: normalize experience so backend sees company/title/dates
      const normalizedExp = normalizeExperience(candidate)
      if (!normalizedExp.length) {
        throw new Error(
          'Student experience is required. Please ensure at least one experience has Title, Company, and Dates.'
        )
      }

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        skills: candidate.skills,
        experience: normalizedExp,
        education: candidate.education,
        certifications: candidate.certifications,
        projects: candidate.projects,
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`)
      }

      const resumeText = data?.resumeText || ''
      if (!resumeText.trim()) {
        throw new Error('No resume text returned from API')
      }

      setGeneratedResume(resumeText)

      // ✅ attach resume to THIS job in MongoDB
      if (editingJob?._id) {
        await saveJobResume(editingJob._id, resumeText, jobDescriptionForResume)
      }

      // Save to history
      const newResumeEntry = {
        id: `resume_${Date.now()}`,
        candidateId: candidate?.id,
        candidateName: payload.fullName,
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume.substring(0, 200) + '...',
        generatedDate: new Date().toISOString(),
        matchScore: Math.floor(Math.random() * 20) + 80
      }

      const updatedHistory = [newResumeEntry, ...resumeGenerationHistory]
      setResumeGenerationHistory(updatedHistory)

      const recruiterId = localStorage.getItem('recruiter_id')
      if (recruiterId) {
        localStorage.setItem(`resume_history_${recruiterId}`, JSON.stringify(updatedHistory))
      }

      alert('✅ Resume generated and saved successfully! The candidate can now view it in their dashboard.')
    } catch (err: any) {
      console.error('❌ Error generating resume:', err)
      setResumeError(err?.message || 'Failed to generate resume')
      alert(`❌ ${err?.message || 'Failed to generate resume'}`)
    } finally {
      setIsGeneratingResume(false)
    }
  }

  // ✅ UPDATED: Download resume function (now downloads DOCX)
  const downloadResume = async () => {
    try {
      if (!generatedResume?.trim()) {
        alert('No resume generated yet.')
        return
      }
      if (!selectedCandidate) {
        alert('Please select a candidate first')
        return
      }

      const candidate: any = ensureCandidateDataStructure(selectedCandidate)
      await downloadDocxFromText(candidate, generatedResume)
    } catch (err: any) {
      console.error(err)
      alert(`❌ ${err?.message || 'Failed to download .docx'}`)
    }
  }

  const copyResumeToClipboard = () => {
    navigator.clipboard
      .writeText(generatedResume)
      .then(() => alert('✅ Resume copied to clipboard!'))
      .catch(() => alert('❌ Failed to copy resume'))
  }

  const clearResumeGenerator = () => {
    setJobIdForResume('')
    setJobDescriptionForResume('')
    setGeneratedResume('')
  }

  // ✅ FIXED: loadJobDetails function
  const loadJobDetails = (jobDbId: string) => {
    const job = candidateJobs.find((j: any) => j._id === jobDbId)
    if (job) {
      setEditingJob(job)
      setJobIdForResume(job.jobId || job._id)
      setJobDescriptionForResume(job.jobDescriptionFull || job.description || '')
      setShowResumeGenerator(true)
    }
  }

  // ✅ UPDATED: Function to view candidate details
  const viewCandidateDetails = async (candidate: any) => {
    const structuredCandidate = ensureCandidateDataStructure(candidate)
    setSelectedCandidate(structuredCandidate)

    try {
      const recruiterId = localStorage.getItem('recruiter_id') || ''
      const jobsResp: any = await fetchCandidateJobs(structuredCandidate.id, recruiterId)
      setCandidateJobs(jobsResp.jobs || [])
    } catch (e) {
      console.error('Failed to load candidate jobs:', e)
      setCandidateJobs([])
    }

    setShowCandidateDetails(true)
  }

  useEffect(() => {
    const checkRecruiterAuth = async () => {
      const userStr = localStorage.getItem('infrapilot_user')
      const recruiterAuth = localStorage.getItem('recruiter_authenticated')
      const recruiterId = localStorage.getItem('recruiter_id')

      if (!userStr || !recruiterAuth || recruiterAuth !== 'true') {
        router.replace('/recruiter/login')
        return
      }

      try {
        const userData = JSON.parse(userStr)

        if (userData.role !== 'recruiter') {
          router.replace('/recruiter/login')
          return
        }

        setUser(userData)

        // Load work sessions from localStorage
        const savedSessions = localStorage.getItem(`work_sessions_${recruiterId}`)
        if (savedSessions) {
          const sessions = JSON.parse(savedSessions)
          setWorkSessions(sessions)

          // Calculate total worked today
          const today = new Date().toDateString()
          const todaySessions = sessions.filter((session: any) => new Date(session.clockIn).toDateString() === today)

          let totalToday = 0
          todaySessions.forEach((session: any) => {
            if (session.clockOut) {
              totalToday += new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime()
            }
          })
          setTotalWorkedToday(totalToday)

          // Check if there's an active session
          const activeSession = sessions.find((session: any) => !session.clockOut)
          if (activeSession) {
            setIsClockedIn(true)
            setClockInTime(new Date(activeSession.clockIn))
          }
        }

        // Load resume generation history
        const savedResumeHistory = localStorage.getItem(`resume_history_${recruiterId}`)
        if (savedResumeHistory) {
          setResumeGenerationHistory(JSON.parse(savedResumeHistory))
        }

        // ✅ Load assigned candidates from backend
        try {
          const myCandidates = await fetchAssignedCandidates()
          setAssignedCandidates(myCandidates)

          const activeSubs = myCandidates.filter((c: any) => c.subscriptionStatus === 'active').length
          const pending = myCandidates.filter((c: any) => c.paymentStatus === 'pending').length

          setStats({
            totalAssigned: myCandidates.length,
            activeSubscriptions: activeSubs,
            pendingFollowups: pending,
            interviewsThisWeek: Math.floor(Math.random() * 5)
          })
        } catch (e) {
          console.error('Failed to load assigned candidates:', e)
          setAssignedCandidates([])
        }
      } catch {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        localStorage.removeItem('recruiter_authenticated')
        localStorage.removeItem('recruiter_id')
        router.replace('/recruiter/login')
      } finally {
        setLoading(false)
      }
    }

    checkRecruiterAuth()
  }, [router])

  // Update current session duration every second when clocked in
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isClockedIn && clockInTime) {
      setCurrentSessionDuration(Date.now() - clockInTime.getTime())

      interval = setInterval(() => {
        setCurrentSessionDuration(Date.now() - clockInTime.getTime())
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isClockedIn, clockInTime])

  const handleClockIn = () => {
    const now = new Date()
    setIsClockedIn(true)
    setClockInTime(now)

    const recruiterId = localStorage.getItem('recruiter_id')
    const newSession = {
      id: `session_${Date.now()}`,
      clockIn: now.toISOString(),
      clockOut: null,
      date: now.toDateString()
    }

    const updatedSessions = [...workSessions, newSession]
    setWorkSessions(updatedSessions)

    if (recruiterId) {
      localStorage.setItem(`work_sessions_${recruiterId}`, JSON.stringify(updatedSessions))
    }

    alert(`✅ Clocked in at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  const handleClockOut = () => {
    if (!isClockedIn || !clockInTime) return

    const now = new Date()
    const recruiterId = localStorage.getItem('recruiter_id')

    const updatedSessions = [...workSessions]
    const currentSessionIndex = updatedSessions.findIndex((session: any) => !session.clockOut)

    if (currentSessionIndex !== -1) {
      updatedSessions[currentSessionIndex] = {
        ...updatedSessions[currentSessionIndex],
        clockOut: now.toISOString(),
        duration: now.getTime() - new Date(updatedSessions[currentSessionIndex].clockIn).getTime()
      }

      setWorkSessions(updatedSessions)

      if (recruiterId) {
        localStorage.setItem(`work_sessions_${recruiterId}`, JSON.stringify(updatedSessions))
      }
    }

    const sessionDuration = now.getTime() - clockInTime.getTime()
    setTotalWorkedToday((prev) => prev + sessionDuration)

    setIsClockedIn(false)
    setClockInTime(null)
    setCurrentSessionDuration(0)

    alert(
      `🕒 Clocked out at ${now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}\nSession duration: ${formatDuration(sessionDuration)}`
    )
  }

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getTodayWorkStats = () => {
    const today = new Date().toDateString()
    const todaySessions = workSessions.filter(
      (session: any) => new Date(session.clockIn).toDateString() === today && session.clockOut
    )

    return {
      sessions: todaySessions.length,
      totalDuration: todaySessions.reduce((total: number, session: any) => total + session.duration, 0) + totalWorkedToday
    }
  }

  const handleLogout = () => {
    if (isClockedIn) {
      if (window.confirm('You are currently clocked in. Would you like to clock out before logging out?')) {
        handleClockOut()
      }
    }

    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('recruiter_authenticated')
    localStorage.removeItem('recruiter_id')
    router.replace('/recruiter/login')
  }

  // ✅ FIXED: Update candidate status (using correct endpoint)
  const updateCandidateStatus = async (candidateId: string, newStatus: string) => {
    try {
      await api(`/api/v1/recruiter/candidates/${candidateId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })

      setAssignedCandidates((prev) =>
        prev.map((candidate: any) => {
          const candidateWithId = ensureCandidateDataStructure(candidate)
          return candidateWithId.id === candidateId ? { ...candidateWithId, recruiterStatus: newStatus } : candidateWithId
        })
      )

      alert('Status updated successfully!')
    } catch (error: any) {
      console.error('Failed to update candidate status:', error)
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEditJob = (jobDbId: string) => {
    const jobToEdit = candidateJobs.find((job: any) => job._id === jobDbId)
    if (jobToEdit) {
      setEditingJob(jobToEdit)
      setJobFormData({
        jobTitle: jobToEdit.jobTitle,
        company: jobToEdit.company,
        description: jobToEdit.description,
        status: jobToEdit.status,
        resumeStatus: jobToEdit.resumeStatus,
        matchScore: jobToEdit.matchScore,
        salaryRange: jobToEdit.salaryRange
      })
      setShowEditForm(true)
    }
  }

  // ✅ UPDATED: handleSaveJob (update in MongoDB)
  const handleSaveJob = async () => {
    if (!editingJob || !selectedCandidate) return

    try {
      await updateCandidateJob(editingJob._id, jobFormData)

      const recruiterId = localStorage.getItem('recruiter_id') || ''
      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId)
      setCandidateJobs(jobsResp.jobs || [])

      setShowEditForm(false)
      setEditingJob(null)
      alert('✅ Job updated successfully!')
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to update job'}`)
    }
  }

  const handleCancelEdit = () => {
    setShowEditForm(false)
    setEditingJob(null)
    setJobFormData({
      jobTitle: '',
      company: '',
      description: '',
      status: 'Applied',
      resumeStatus: 'Pending',
      matchScore: 70,
      salaryRange: ''
    })
  }

  // ✅ UPDATED: handleDeleteJob (delete in MongoDB)
  const handleDeleteJob = async (jobDbId: string) => {
    if (!selectedCandidate) return
    if (!window.confirm('Are you sure you want to delete this job application?')) return

    try {
      await deleteCandidateJob(jobDbId)

      const recruiterId = localStorage.getItem('recruiter_id') || ''
      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId)
      setCandidateJobs(jobsResp.jobs || [])
      alert('✅ Job deleted!')
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to delete job'}`)
    }
  }

  // ✅ FIXED: addNewJob (Mongo requires recruiterId)
  const addNewJob = async () => {
    if (!selectedCandidate) return

    const recruiterId = localStorage.getItem('recruiter_id') || ''

    const payload = {
      candidateId: selectedCandidate.id,
      recruiterId,
      jobId: `job_${Date.now()}`,
      jobTitle: 'New Position',
      company: 'New Company',
      description: 'Add job description here...',
      status: 'Applied',
      resumeStatus: 'Pending',
      matchScore: 0,
      salaryRange: 'To be determined'
    }

    try {
      await createCandidateJob(payload)

      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId)
      setCandidateJobs(jobsResp.jobs || [])

      setShowEditForm(false)
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to create job'}`)
    }
  }

  const getPlanColor = (plan: string) => {
    const colors: any = {
      free: 'bg-gray-100 text-gray-900',
      silver: 'bg-gray-300 text-gray-900',
      gold: 'bg-yellow-100 text-gray-900',
      platinum: 'bg-gray-200 text-gray-900',
      enterprise: 'bg-purple-100 text-gray-900'
    }
    return colors[plan] || 'bg-blue-100 text-gray-900'
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      Applied: 'bg-blue-100 text-gray-900',
      'Under Review': 'bg-yellow-100 text-gray-900',
      Interview: 'bg-purple-100 text-gray-900',
      Offer: 'bg-green-100 text-gray-900',
      Rejected: 'bg-red-100 text-gray-900'
    }
    return colors[status] || 'bg-gray-100 text-gray-900'
  }

  const getResumeColor = (status: string) => {
    const colors: any = {
      Submitted: 'bg-green-100 text-gray-900',
      Reviewed: 'bg-blue-100 text-gray-900',
      Pending: 'bg-yellow-100 text-gray-900'
    }
    return colors[status] || 'bg-gray-100 text-gray-900'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
              <span className="text-white text-2xl font-bold">IP</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Infrapilot</h1>
              <p className="text-sm text-blue-600 font-medium">Tech Solutions</p>
            </div>
          </div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recruiter dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const todayStats = getTodayWorkStats()

  // ✅ UI BELOW IS UNCHANGED (your full JSX kept as-is)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      {/* --- EVERYTHING BELOW IS YOUR ORIGINAL JSX (unchanged) --- */}
      {/* Company Header Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200">
          {/* Company Logo and Name */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-xl md:text-2xl font-bold">IP</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Infrapilot Tech</h1>
              <p className="text-sm md:text-base text-blue-600 font-medium">Job Application Support Platform</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-blue-100 text-gray-900 px-2 py-1 rounded-full">Recruiter Portal</span>
                <span className="text-xs text-gray-500">v2.1</span>
              </div>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-gray-900 font-semibold text-sm">{user.name?.[0]?.toUpperCase() || 'R'}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">
                  Recruiter ID: {localStorage.getItem('recruiter_id')?.substring(0, 8)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.replace('/recruiter/login')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 border border-gray-300"
              >
                Switch Account
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ Keep the rest of your JSX exactly as you already have it.
          The only functional changes needed were:
          - normalizeExperience/buildDates helpers
          - using normalizedExp in generateResume + generateAndDownloadWordResume
      */}
      {/* ...PASTE THE REST OF YOUR ORIGINAL JSX HERE (unchanged)... */}

      {/* NOTE: I didn't reprint the remaining 600+ lines of JSX here to avoid mistakes.
         You can keep everything below this point exactly the same as your current file. */}
      <div className="max-w-7xl mx-auto">
        {/* ✅ Your existing JSX continues... */}
        {/* (No changes required below; your UI will work the same) */}
      </div>
    </div>
  )
}
