'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RecruiterPage() {
  const [user, setUser] = useState<any>(null)
  const [assignedCandidates, setAssignedCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [showCandidateDetails, setShowCandidateDetails] = useState(false)
  const [candidateJobs, setCandidateJobs] = useState([])
  const [stats, setStats] = useState({
    totalAssigned: 0,
    activeSubscriptions: 0,
    pendingFollowups: 0,
    interviewsThisWeek: 0
  })
  const [editingJob, setEditingJob] = useState(null)
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
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
  const router = useRouter()

  // ✅ HELPER FUNCTION - Ensure candidate data has proper structure
  const ensureCandidateDataStructure = (candidate: any) => {
    if (!candidate) return candidate;
    
    // Create a copy to avoid mutating original
    const structuredCandidate = { ...candidate };
    
    // Ensure skills is an array
    if (!Array.isArray(structuredCandidate.skills)) {
      if (typeof structuredCandidate.skills === 'string') {
        structuredCandidate.skills = structuredCandidate.skills
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      } else {
        structuredCandidate.skills = [];
      }
    }
    
    // Ensure experience is an array with proper structure
    if (!Array.isArray(structuredCandidate.experience)) {
      if (typeof structuredCandidate.experience === 'string') {
        try {
          structuredCandidate.experience = JSON.parse(structuredCandidate.experience);
        } catch {
          structuredCandidate.experience = [];
        }
      } else {
        structuredCandidate.experience = [];
      }
    }
    
    // Ensure education is an array
    if (!Array.isArray(structuredCandidate.education)) {
      if (typeof structuredCandidate.education === 'string') {
        try {
          structuredCandidate.education = JSON.parse(structuredCandidate.education);
        } catch {
          structuredCandidate.education = [];
        }
      } else {
        structuredCandidate.education = [];
      }
    }
    
    // Ensure certifications is an array
    if (!Array.isArray(structuredCandidate.certifications)) {
      if (typeof structuredCandidate.certifications === 'string') {
        structuredCandidate.certifications = structuredCandidate.certifications
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      } else {
        structuredCandidate.certifications = [];
      }
    }
    
    // Ensure projects is an array
    if (!Array.isArray(structuredCandidate.projects)) {
      if (typeof structuredCandidate.projects === 'string') {
        try {
          structuredCandidate.projects = JSON.parse(structuredCandidate.projects);
        } catch {
          structuredCandidate.projects = [];
        }
      } else {
        structuredCandidate.projects = [];
      }
    }
    
    // Add missing fields if they don't exist
    if (!structuredCandidate.experienceYears) {
      structuredCandidate.experienceYears = Math.max(3, Math.floor(structuredCandidate.skills.length / 2));
    }
    
    if (!structuredCandidate.summary && structuredCandidate.about) {
      structuredCandidate.summary = structuredCandidate.about;
    }
    
    if (!structuredCandidate.summary) {
      structuredCandidate.summary = `Experienced ${structuredCandidate.currentPosition || 'professional'} with expertise in ${structuredCandidate.skills.slice(0, 3).join(', ')}.`;
    }
    
    return structuredCandidate;
  };

  // ✅ FUNCTION - Save candidate resume to localStorage
  const saveCandidateResume = (candidateId, resumeData) => {
    try {
      // Load existing resumes
      const sharedResumes = JSON.parse(localStorage.getItem('candidate_resumes') || '{}')
      
      // Create resume object
      const resume = {
        id: `res_${Date.now()}`,
        ...resumeData,
        candidate_id: candidateId,
        recruiter_id: user?.id,
        recruiter_name: user?.name,
        recruiter_email: user?.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      }
      
      // Save to shared storage (accessible by candidate)
      sharedResumes[candidateId] = resume
      localStorage.setItem('candidate_resumes', JSON.stringify(sharedResumes))
      
      // Also save to recruiter-specific storage
      const recruiterResumes = JSON.parse(localStorage.getItem(`recruiter_resumes_${user?.id}`) || '{}')
      recruiterResumes[candidateId] = resume
      localStorage.setItem(`recruiter_resumes_${user?.id}`, JSON.stringify(recruiterResumes))
      
      return resume
    } catch (error) {
      console.error('Error saving candidate resume:', error)
      return null
    }
  }

  // ✅ FUNCTION - Generate resume template from AI content
  const generateCandidateResumeFromAI = (candidate, generatedText, jobId, jobDescription) => {
    const resumeTemplate = {
      name: `${candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}_Resume_${new Date().getFullYear()}.docx`,
      title: `Professional Resume - ${candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}`,
      text: generatedText,
      sections: [
        {
          title: 'Professional Summary',
          content: candidate.summary || candidate.about || `${candidate.firstName} is a skilled professional seeking new opportunities.`
        },
        {
          title: 'Skills',
          content: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills || 'Skills to be added'
        },
        {
          title: 'Experience',
          content: 'Professional experience details to be added by recruiter.'
        },
        {
          title: 'Education',
          content: 'Educational background to be added by recruiter.'
        }
      ],
      job_id: jobId,
      job_description: jobDescription.substring(0, 500) + '...',
      notes: `Resume created by recruiter ${user?.name} for job application`
    }
    
    return saveCandidateResume(candidate.id, resumeTemplate)
  }

  // ✅ UPDATED: Function to generate resume
  const generateResume = async () => {
    if (!jobIdForResume.trim() || !jobDescriptionForResume.trim()) {
      alert('Please enter both Job ID and Job Description');
      return;
    }

    if (!selectedCandidate) {
      alert('Please select a candidate first');
      return;
    }

    setIsGeneratingResume(true);
    setResumeError('');
    setGeneratedResume('');

    try {
      // ✅ USE THE STRUCTURED CANDIDATE DATA
      const candidate: any = ensureCandidateDataStructure(selectedCandidate);

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        
        // ✅ NOW THESE ARE GUARANTEED TO BE PROPER ARRAYS
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        certifications: candidate.certifications,
        projects: candidate.projects,
        
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume,
      };

      console.log('📤 Sending payload to backend:', {
        fullName: payload.fullName,
        skillsCount: payload.skills.length,
        experienceCount: payload.experience.length,
        educationCount: payload.education.length,
        certificationsCount: payload.certifications.length
      });

      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }

      const resumeText = data?.resumeText || '';
      if (!resumeText.trim()) {
        throw new Error('No resume text returned from API');
      }

      setGeneratedResume(resumeText);

      // ✅ SAVE THE RESUME TO LOCALSTORAGE FOR CANDIDATE ACCESS
      const savedResume = generateCandidateResumeFromAI(
        candidate,
        resumeText,
        jobIdForResume,
        jobDescriptionForResume
      );
      
      if (savedResume) {
        console.log('✅ Resume saved for candidate:', savedResume);
      }

      // Save to history
      const newResumeEntry = {
        id: `resume_${Date.now()}`,
        candidateId: candidate?.id,
        candidateName: payload.fullName,
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume.substring(0, 200) + '...',
        generatedDate: new Date().toISOString(),
        matchScore: Math.floor(Math.random() * 20) + 80,
      };

      const updatedHistory = [newResumeEntry, ...resumeGenerationHistory];
      setResumeGenerationHistory(updatedHistory);

      const recruiterId = localStorage.getItem('recruiter_id');
      if (recruiterId) {
        localStorage.setItem(`resume_history_${recruiterId}`, JSON.stringify(updatedHistory));
      }

      alert('✅ Resume generated and saved successfully! The candidate can now view it in their dashboard.');
    } catch (err: any) {
      console.error('❌ Error generating resume:', err);
      setResumeError(err?.message || 'Failed to generate resume');
      alert(`❌ ${err?.message || 'Failed to generate resume'}`);
    } finally {
      setIsGeneratingResume(false);
    }
  };

  // ✅ FUNCTION - Generate and download Word resume
  const generateAndDownloadWordResume = async () => {
    if (!jobIdForResume.trim() || !jobDescriptionForResume.trim()) {
      alert('Please enter both Job ID and Job Description');
      return;
    }

    if (!selectedCandidate) {
      alert('Please select a candidate first');
      return;
    }

    setIsGeneratingResume(true);
    setResumeError('');

    try {
      // ✅ USE THE STRUCTURED CANDIDATE DATA
      const candidate: any = ensureCandidateDataStructure(selectedCandidate);

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        
        // ✅ NOW THESE ARE GUARANTEED TO BE PROPER ARRAYS
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        certifications: candidate.certifications,
        projects: candidate.projects,
        
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      // Check if response is a Word document
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/vnd.openxmlformats')) {
        // It's a Word document - download it
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resume_${candidate.fullName?.replace(/\s+/g, '_') || 'Candidate'}_${jobIdForResume}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // ✅ SAVE THE RESUME DATA TO LOCALSTORAGE
        const resumeText = await blob.text();
        generateCandidateResumeFromAI(
          candidate,
          resumeText || 'Word document generated',
          jobIdForResume,
          jobDescriptionForResume
        );
        
        alert('✅ Word resume generated, downloaded, and saved for candidate!');
      } else {
        // It's JSON response (text format)
        const data = await res.json();
        const resumeText = data?.resumeText || '';
        setGeneratedResume(resumeText);
        
        // ✅ SAVE THE RESUME TO LOCALSTORAGE
        generateCandidateResumeFromAI(
          candidate,
          resumeText,
          jobIdForResume,
          jobDescriptionForResume
        );
        
        // Save to history
        const newResumeEntry = {
          id: `resume_${Date.now()}`,
          candidateId: candidate?.id,
          candidateName: payload.fullName,
          jobId: jobIdForResume,
          jobDescription: jobDescriptionForResume.substring(0, 200) + '...',
          generatedDate: new Date().toISOString(),
          matchScore: Math.floor(Math.random() * 20) + 80,
        };

        const updatedHistory = [newResumeEntry, ...resumeGenerationHistory];
        setResumeGenerationHistory(updatedHistory);

        const recruiterId = localStorage.getItem('recruiter_id');
        if (recruiterId) {
          localStorage.setItem(`resume_history_${recruiterId}`, JSON.stringify(updatedHistory));
        }

        alert('✅ Resume generated and saved! The candidate can view it in their dashboard.');
      }
    } catch (err: any) {
      console.error(err);
      setResumeError(err?.message || 'Failed to generate resume');
      alert(`❌ ${err?.message || 'Failed to generate resume'}`);
    } finally {
      setIsGeneratingResume(false);
    }
  };

  // ✅ HELPER FUNCTIONS
  const extractSkillsFromDescription = (description: string) => {
    const skills = []
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express',
      'mongodb', 'sql', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes',
      'typescript', 'html', 'css', 'sass', 'tailwind', 'git', 'rest', 'api',
      'agile', 'scrum', 'devops', 'ci/cd', 'testing', 'firebase'
    ]
    
    commonSkills.forEach(skill => {
      if (description.includes(skill)) {
        skills.push(skill)
      }
    })
    
    return skills.length > 0 ? skills : ['javascript', 'react', 'node', 'mongodb', 'aws']
  }
  
  const extractKeywords = (description: string) => {
    const words = description.toLowerCase().split(/\W+/)
    const keywords = new Set<string>()
    
    const importantWords = [
      'development', 'engineering', 'software', 'web', 'mobile', 'application',
      'design', 'architecture', 'system', 'cloud', 'database', 'security',
      'performance', 'scalability', 'maintenance', 'deployment', 'integration',
      'automation', 'optimization', 'collaboration', 'leadership', 'management'
    ]
    
    words.forEach(word => {
      if (importantWords.includes(word) && word.length > 3) {
        keywords.add(word)
      }
    })
    
    return Array.from(keywords)
  }
  
  const extractIndustry = (description: string) => {
    const industries = [
      'technology', 'finance', 'healthcare', 'e-commerce', 'education',
      'entertainment', 'saaS', 'startup', 'enterprise', 'consulting'
    ]
    
    const desc = description.toLowerCase()
    for (const industry of industries) {
      if (desc.includes(industry)) {
        return industry.charAt(0).toUpperCase() + industry.slice(1)
      }
    }
    
    return 'Technology'
  }
  
  const copyResumeToClipboard = () => {
    navigator.clipboard.writeText(generatedResume)
      .then(() => alert('✅ Resume copied to clipboard!'))
      .catch(() => alert('❌ Failed to copy resume'))
  }
  
  const downloadResume = () => {
    const blob = new Blob([generatedResume], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume_${selectedCandidate?.fullName?.replace(/\s+/g, '_') || 'candidate'}_${jobIdForResume}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const clearResumeGenerator = () => {
    setJobIdForResume('')
    setJobDescriptionForResume('')
    setGeneratedResume('')
  }
  
  const loadJobDetails = (jobId: string) => {
    const job = candidateJobs.find(j => j.id === jobId)
    if (job) {
      setJobIdForResume(job.id)
      setJobDescriptionForResume(job.description)
      setShowResumeGenerator(true)
    }
  }

  // ✅ FUNCTION - Generate mock jobs for candidates
  const generateMockJobs = (candidate) => {
    const jobTitles = [
      'Senior Software Engineer',
      'Full Stack Developer',
      'Frontend Developer',
      'Backend Developer',
      'DevOps Engineer',
      'Data Scientist',
      'Product Manager',
      'UX Designer'
    ]
    
    const companies = [
      'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
      'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Salesforce'
    ]
    
    const statuses = ['Applied', 'Under Review', 'Interview', 'Offer', 'Rejected']
    
    const jobs = []
    const numJobs = Math.floor(Math.random() * 5) + 1 // 1-5 jobs
    
    for (let i = 0; i < numJobs; i++) {
      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)]
      const company = companies[Math.floor(Math.random() * companies.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const daysAgo = Math.floor(Math.random() * 30)
      const appliedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      
      jobs.push({
        id: `job_${candidate.id}_${i}`,
        jobTitle,
        company,
        description: `${jobTitle} position at ${company}. Looking for candidates with ${candidate.experienceYears || 3}+ years experience in ${candidate.skills || 'relevant technologies'}.`,
        status,
        appliedDate: appliedDate.toISOString(),
        resumeStatus: ['Submitted', 'Reviewed', 'Pending'][Math.floor(Math.random() * 3)],
        matchScore: Math.floor(Math.random() * 30) + 70, // 70-100%
        salaryRange: `$${Math.floor(Math.random() * 50) + 100}k - $${Math.floor(Math.random() * 50) + 150}k`
      })
    }
    
    return jobs
  }

  // ✅ FUNCTION - View candidate details with structured data
  const viewCandidateDetails = (candidate) => {
    // ✅ Ensure candidate data is structured before using it
    const structuredCandidate = ensureCandidateDataStructure(candidate);
    setSelectedCandidate(structuredCandidate);
    
    // Generate mock job applications for this candidate
    const mockJobs = generateMockJobs(structuredCandidate);
    setCandidateJobs(mockJobs);
    setShowCandidateDetails(true);
  };

  useEffect(() => {
    const checkRecruiterAuth = () => {
      const userStr = localStorage.getItem('infrapilot_user')
      const recruiterAuth = localStorage.getItem('recruiter_authenticated')
      const recruiterId = localStorage.getItem('recruiter_id')
      
      if (!userStr || !recruiterAuth || recruiterAuth !== 'true') {
        router.push('/login')  // Changed from '/recruiter/login'
        return
      }
      
      try {
        const userData = JSON.parse(userStr)
        
        if (userData.role !== 'recruiter') {
          router.push('/login')  // Changed from '/recruiter/login'
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
          const todaySessions = sessions.filter((session: any) => 
            new Date(session.clockIn).toDateString() === today
          )
          
          let totalToday = 0
          todaySessions.forEach((session: any) => {
            if (session.clockOut) {
              totalToday += (new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime())
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
        
        // Load assigned candidates
        const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
        const myCandidates = candidates.filter(c => c.assignedRecruiter === recruiterId)
        
        setAssignedCandidates(myCandidates)
        
        // Calculate stats
        const activeSubs = myCandidates.filter(c => c.subscriptionStatus === 'active').length
        const pending = myCandidates.filter(c => c.paymentStatus === 'pending').length
        
        setStats({
          totalAssigned: myCandidates.length,
          activeSubscriptions: activeSubs,
          pendingFollowups: pending,
          interviewsThisWeek: Math.floor(Math.random() * 5) // Mock data
        })
        
      } catch {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        localStorage.removeItem('recruiter_authenticated')
        localStorage.removeItem('recruiter_id')
        router.push('/login')  // Changed from '/recruiter/login'
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
      // Calculate initial duration
      setCurrentSessionDuration(Date.now() - clockInTime.getTime())
      
      // Update every second
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
    
    alert(`✅ Clocked in at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`)
  }

  const handleClockOut = () => {
    if (!isClockedIn || !clockInTime) return
    
    const now = new Date()
    const recruiterId = localStorage.getItem('recruiter_id')
    
    // Update the current session
    const updatedSessions = [...workSessions]
    const currentSessionIndex = updatedSessions.findIndex(session => !session.clockOut)
    
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
    
    // Update total worked today
    const sessionDuration = now.getTime() - clockInTime.getTime()
    setTotalWorkedToday(prev => prev + sessionDuration)
    
    // Reset clock state
    setIsClockedIn(false)
    setClockInTime(null)
    setCurrentSessionDuration(0)
    
    alert(`🕒 Clocked out at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nSession duration: ${formatDuration(sessionDuration)}`)
  }

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const getTodayWorkStats = () => {
    const today = new Date().toDateString()
    const todaySessions = workSessions.filter(session => 
      new Date(session.clockIn).toDateString() === today && session.clockOut
    )
    
    return {
      sessions: todaySessions.length,
      totalDuration: todaySessions.reduce((total, session) => total + session.duration, 0) + totalWorkedToday
    }
  }

  const handleLogout = () => {
    // If clocked in, ask to clock out first
    if (isClockedIn) {
      if (window.confirm('You are currently clocked in. Would you like to clock out before logging out?')) {
        handleClockOut()
      }
    }
    
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('recruiter_authenticated')
    localStorage.removeItem('recruiter_id')
    router.push('/login')  // Changed from '/recruiter/login'
  }

  const updateCandidateStatus = (candidateId, newStatus) => {
    const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === candidateId) {
        return { ...candidate, recruiterStatus: newStatus }
      }
      return candidate
    })
    localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
    
    // Update local state
    setAssignedCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, recruiterStatus: newStatus }
          : candidate
      )
    )
    
    alert('Status updated successfully!')
  }

  const handleEditJob = (jobId) => {
    const jobToEdit = candidateJobs.find(job => job.id === jobId)
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

  const handleSaveJob = () => {
    if (!editingJob) return
    
    const updatedJobs = candidateJobs.map(job => 
      job.id === editingJob.id 
        ? { 
            ...job, 
            ...jobFormData,
            appliedDate: job.appliedDate || new Date().toISOString()
          }
        : job
    )
    
    setCandidateJobs(updatedJobs)
    setShowEditForm(false)
    setEditingJob(null)
    alert('Job updated successfully!')
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

  const handleDeleteJob = (jobId) => {
    if (window.confirm('Are you sure you want to delete this job application?')) {
      setCandidateJobs(prev => prev.filter(job => job.id !== jobId))
      alert('Job application deleted!')
    }
  }

  const addNewJob = () => {
    const newJob = {
      id: `job_${selectedCandidate.id}_${Date.now()}`,
      jobTitle: 'New Position',
      company: 'New Company',
      description: 'Add job description here...',
      status: 'Applied',
      appliedDate: new Date().toISOString(),
      resumeStatus: 'Pending',
      matchScore: 0,
      salaryRange: 'To be determined'
    }
    setCandidateJobs([...candidateJobs, newJob])
    
    // Auto-open edit form for the new job
    setEditingJob(newJob)
    setJobFormData({
      jobTitle: newJob.jobTitle,
      company: newJob.company,
      description: newJob.description,
      status: newJob.status,
      resumeStatus: newJob.resumeStatus,
      matchScore: newJob.matchScore,
      salaryRange: newJob.salaryRange
    })
    setShowEditForm(true)
  }

  const getPlanColor = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-900',
      silver: 'bg-gray-300 text-gray-900',
      gold: 'bg-yellow-100 text-gray-900',
      platinum: 'bg-gray-200 text-gray-900',
      enterprise: 'bg-purple-100 text-gray-900'
    }
    return colors[plan] || 'bg-blue-100 text-gray-900'
  }

  const getStatusColor = (status) => {
    const colors = {
      'Applied': 'bg-blue-100 text-gray-900',
      'Under Review': 'bg-yellow-100 text-gray-900',
      'Interview': 'bg-purple-100 text-gray-900',
      'Offer': 'bg-green-100 text-gray-900',
      'Rejected': 'bg-red-100 text-gray-900'
    }
    return colors[status] || 'bg-gray-100 text-gray-900'
  }

  const getResumeColor = (status) => {
    const colors = {
      'Submitted': 'bg-green-100 text-gray-900',
      'Reviewed': 'bg-blue-100 text-gray-900',
      'Pending': 'bg-yellow-100 text-gray-900'
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

  if (!user) {
    return null
  }

  const todayStats = getTodayWorkStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
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
                <span className="text-gray-900 font-semibold text-sm">
                  {user.name?.[0]?.toUpperCase() || 'R'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Recruiter ID: {localStorage.getItem('recruiter_id')?.substring(0, 8)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/login')}  // Changed from '/recruiter/login'
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

      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">👔 Recruiter Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome back, <span className="font-semibold text-blue-700">{user.name}</span></p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-gray-900 rounded-full text-xs font-medium">
                {user.department}
              </span>
              <span className="px-3 py-1 bg-green-100 text-gray-900 rounded-full text-xs font-medium">
                {user.specialization}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-gray-900 rounded-full text-xs font-medium">
                Recruiter
              </span>
            </div>
          </div>
          
          {/* Clock In/Out and Work Time */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Today's Work Summary */}
            <div className="px-3 py-2 bg-white rounded-lg border border-gray-300 shadow-sm">
              <div className="text-xs text-gray-700 font-medium">Today's Work</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {formatDuration(todayStats.totalDuration + (isClockedIn ? currentSessionDuration : 0))}
                </span>
                <span className="text-xs text-gray-600">
                  ({todayStats.sessions} session{todayStats.sessions !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Clock In/Out Button */}
            <div className="relative">
              {isClockedIn ? (
                <button
                  onClick={handleClockOut}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md"
                >
                  <span className="animate-pulse">⏰</span> Clock Out
                </button>
              ) : (
                <button
                  onClick={handleClockIn}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md"
                >
                  <span>🕒</span> Clock In
                </button>
              )}
              
              {/* Work Timer Display */}
              {isClockedIn && clockInTime && (
                <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white p-3 rounded-lg shadow-xl min-w-[200px] z-10">
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Currently Working</div>
                    <div className="text-2xl font-mono font-bold">
                      {formatDuration(currentSessionDuration)}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Clocked in at {formatTime(clockInTime)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Including Work Time Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Work Time Card */}
          <div className={`p-6 rounded-xl shadow ${isClockedIn ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Work Time Today</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">
                  {formatDuration(todayStats.totalDuration + (isClockedIn ? currentSessionDuration : 0))}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {isClockedIn ? 'Currently working' : 'Not clocked in'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isClockedIn ? 'bg-green-100 animate-pulse' : 'bg-gray-100'}`}>
                <span className={isClockedIn ? 'text-green-600' : 'text-gray-900'}>
                  {isClockedIn ? '⏰' : '🕒'}
                </span>
              </div>
            </div>
            {isClockedIn && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-700">Current Session:</span>
                  <span className="text-sm font-mono font-bold text-green-800">
                    {formatDuration(currentSessionDuration)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assigned Candidates</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stats.totalAssigned}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-gray-900">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Subscriptions</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stats.activeSubscriptions}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-gray-900">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Follow-ups</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stats.pendingFollowups}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-gray-900">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Interviews This Week</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stats.interviewsThisWeek}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-gray-900">📅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Generation History */}
        {resumeGenerationHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">📄 Recent Resume Generations</h2>
                <p className="text-gray-600">AI-powered resume generation history</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-gray-900 rounded-full text-xs font-medium">
                {resumeGenerationHistory.length} generated
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-900">Candidate</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-900">Job ID</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-900">Match Score</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resumeGenerationHistory.slice(0, 3).map((resume, index) => (
                    <tr key={resume.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <p className="text-sm text-gray-900">
                          {new Date(resume.generatedDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(resume.generatedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-gray-900">{resume.candidateName}</p>
                      </td>
                      <td className="p-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">{resume.jobId}</code>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${resume.matchScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{resume.matchScore}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setJobIdForResume(resume.jobId)
                            setJobDescriptionForResume(resume.jobDescription)
                            setShowResumeGenerator(true)
                            if (showCandidateDetails) {
                              document.getElementById('resume-generator')?.scrollIntoView({ behavior: 'smooth' })
                            }
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-gray-900 rounded hover:bg-blue-200"
                        >
                          Regenerate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Work Sessions History */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📊 Work Sessions History</h2>
              <p className="text-gray-600">Track your working hours</p>
            </div>
            <button
              onClick={() => {
                // Show all sessions in a modal
                alert(`Total work sessions: ${workSessions.length}\nToday's total: ${formatDuration(todayStats.totalDuration)}`)
              }}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              View Details
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-900">Clock In</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-900">Clock Out</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th className="p-3 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workSessions.slice(-5).reverse().map((session, index) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <p className="text-sm text-gray-900">
                        {new Date(session.clockIn).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-gray-900">
                        {new Date(session.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-gray-900">
                        {session.clockOut 
                          ? new Date(session.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : <span className="text-yellow-600 font-medium">In Progress</span>
                        }
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {session.duration 
                          ? formatDuration(session.duration)
                          : session.clockOut
                            ? formatDuration(new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime())
                            : formatDuration(Date.now() - new Date(session.clockIn).getTime())
                        }
                      </p>
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        !session.clockOut 
                          ? 'bg-green-100 text-gray-900 animate-pulse' 
                          : 'bg-blue-100 text-gray-900'
                      }`}>
                        {!session.clockOut ? 'Active Now' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {workSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No work sessions yet</h3>
                      <p className="text-gray-600">Click "Clock In" to start tracking your work time</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Candidates Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">🎯 Your Assigned Candidates</h2>
                <p className="text-gray-600">Click the eye icon to view job applications</p>
              </div>
              <div className="text-sm text-gray-500">
                Total: {assignedCandidates.length} candidates
              </div>
            </div>
          </div>
          
          {assignedCandidates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates assigned yet</h3>
              <p className="text-gray-500">The admin will assign candidates to you soon.</p>
              <button
                onClick={() => router.push('/login')}  // Changed from '/recruiter/login'
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900">Candidate</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900">Contact</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900">Subscription Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900">Recruiter Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignedCandidates.map((candidate) => {
                    const daysRemaining = candidate.daysRemaining || 0
                    
                    return (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-gray-900 font-semibold">
                                {candidate.firstName?.[0]?.toUpperCase() || 'C'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}</p>
                              <p className="text-sm text-gray-500">ID: {candidate.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">📧</span> {candidate.email}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">📞</span> {candidate.phone || 'Not provided'}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">💼</span> {candidate.currentPosition || 'No position'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(candidate.subscriptionPlan)}`}>
                              {candidate.subscriptionPlan || 'Free'} Plan
                            </span>
                            <div className="text-xs">
                              <span className={`px-2 py-1 rounded ${candidate.paymentStatus === 'paid' ? 'bg-green-100 text-gray-900' : 'bg-yellow-100 text-gray-900'}`}>
                                {candidate.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                              </span>
                              <p className="text-gray-600 mt-1">{daysRemaining} days remaining</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={candidate.recruiterStatus || 'new'}
                            onChange={(e) => updateCandidateStatus(candidate.id, e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm w-full bg-white text-gray-900"
                          >
                            <option value="new" className="text-gray-900">New 🆕</option>
                            <option value="contacted" className="text-gray-900">Contacted 📞</option>
                            <option value="screening" className="text-gray-900">Screening 📋</option>
                            <option value="interview" className="text-gray-900">Interview 🎯</option>
                            <option value="shortlisted" className="text-gray-900">Shortlisted ✅</option>
                            <option value="rejected" className="text-gray-900">Rejected ❌</option>
                            <option value="hired" className="text-gray-900">Hired 🎉</option>
                          </select>
                          <p className="text-xs text-gray-600 mt-1">
                            Last updated: {new Date(candidate.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => viewCandidateDetails(candidate)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                              <span>👁️</span> View Jobs
                            </button>
                            <a 
                              href={`mailto:${candidate.email}`}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center"
                            >
                              Email Candidate
                            </a>
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

        {/* Candidate Details Modal */}
        {showCandidateDetails && selectedCandidate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">👁️ Job Applications</h3>
                    <p className="text-gray-600">For: {selectedCandidate.fullName || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCandidateDetails(false)
                      setSelectedCandidate(null)
                    }}
                    className="text-gray-700 hover:text-gray-900 text-2xl"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Candidate Info Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedCandidate.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{selectedCandidate.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subscription</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(selectedCandidate.subscriptionPlan)}`}>
                        {selectedCandidate.subscriptionPlan || 'Free'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedCandidate.paymentStatus === 'paid' ? 'bg-green-100 text-gray-900' : 'bg-yellow-100 text-gray-900'
                      }`}>
                        {selectedCandidate.paymentStatus === 'paid' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resume Generator Section */}
                <div id="resume-generator" className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-gray-800">🤖 AI Resume Generator</h4>
                    <button
                      onClick={() => setShowResumeGenerator(!showResumeGenerator)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <span>{showResumeGenerator ? '👇' : '👆'}</span> {showResumeGenerator ? 'Hide Generator' : 'Show Generator'}
                    </button>
                  </div>
                  
                  {showResumeGenerator && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                      <div className="mb-6">
                        <h5 className="font-bold text-gray-800 mb-3">Generate Tailored Resume</h5>
                        <p className="text-sm text-gray-600 mb-4">
                          Enter job details to generate a customized resume for {selectedCandidate.fullName || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Job ID / Reference
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={jobIdForResume}
                                onChange={(e) => setJobIdForResume(e.target.value)}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="e.g., job_abc123 or Google_SE_2024"
                              />
                              <select
                                onChange={(e) => loadJobDetails(e.target.value)}
                                className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                              >
                                <option value="">Load from jobs</option>
                                {candidateJobs.map(job => (
                                  <option key={job.id} value={job.id}>
                                    {job.jobTitle} - {job.company}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Match Score: <span className="font-bold text-purple-700">92%</span>
                            </label>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Job Description *
                          </label>
                          <textarea
                            value={jobDescriptionForResume}
                            onChange={(e) => setJobDescriptionForResume(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Paste the full job description here. The AI will analyze skills, requirements, and tailor the resume accordingly..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {jobDescriptionForResume.length} characters • Required
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={generateResume}
                            disabled={isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()}
                            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                              isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                            }`}
                          >
                            {isGeneratingResume ? (
                              <>
                                <span className="animate-spin">⏳</span> Generating...
                              </>
                            ) : (
                              <>
                                <span>✨</span> Generate AI Resume
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={generateAndDownloadWordResume}
                            disabled={isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()}
                            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                              isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
                            }`}
                          >
                            <span>📄</span> Download Word Resume
                          </button>
                          
                          <button
                            onClick={clearResumeGenerator}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Clear
                          </button>
                          
                          <button
                            onClick={() => {
                              setJobIdForResume(`job_${selectedCandidate.id}_${Date.now()}`)
                              setJobDescriptionForResume(candidateJobs.length > 0 ? candidateJobs[0].description : '')
                            }}
                            className="px-6 py-3 bg-blue-100 text-gray-900 rounded-lg hover:bg-blue-200"
                          >
                            Auto-Fill
                          </button>
                        </div>

                        {/* ✅ Show error under the generator */}
                        {resumeError && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">❌ {resumeError}</p>
                          </div>
                        )}
                      </div>
                      
                      {generatedResume && (
                        <div className="mt-6 border-t border-gray-200 pt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-bold text-gray-800">📄 Generated Resume</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={copyResumeToClipboard}
                                className="px-4 py-2 bg-green-100 text-gray-900 rounded-lg hover:bg-green-200 text-sm"
                              >
                                📋 Copy
                              </button>
                              <button
                                onClick={downloadResume}
                                className="px-4 py-2 bg-blue-100 text-gray-900 rounded-lg hover:bg-blue-200 text-sm"
                              >
                                ⬇️ Download
                              </button>
                            </div>
                          </div>
                          
                          <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                              {generatedResume}
                            </pre>
                          </div>
                          
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-gray-900">
                              💡 <strong>Tip:</strong> This AI-generated resume is tailored to match the job description. Review and customize it before sending to the candidate.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Applications Table */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-gray-800">📋 Job Applications</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={addNewJob}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <span>➕</span> Add New Job
                      </button>
                      <button
                        onClick={() => {
                          if (candidateJobs.length > 0) {
                            loadJobDetails(candidateJobs[0].id)
                            document.getElementById('resume-generator')?.scrollIntoView({ behavior: 'smooth' })
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <span>🤖</span> Generate Resume
                      </button>
                    </div>
                  </div>
                  
                  {candidateJobs.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <div className="text-4xl mb-4">📭</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No job applications yet</h3>
                      <p className="text-gray-600 mb-4">Add the first job application for this candidate</p>
                      <button
                        onClick={addNewJob}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add First Job
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Job ID</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Job Title & Company</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Description</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Resume Status</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Date Created</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-900">Options</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {candidateJobs.map((job) => (
                            <tr key={job.id} className="hover:bg-gray-50">
                              <td className="p-3">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">{job.id}</code>
                                <button
                                  onClick={() => {
                                    loadJobDetails(job.id)
                                    document.getElementById('resume-generator')?.scrollIntoView({ behavior: 'smooth' })
                                  }}
                                  className="mt-1 text-xs text-purple-600 hover:text-purple-800"
                                >
                                  Use for Resume
                                </button>
                              </td>
                              <td className="p-3">
                                <p className="font-medium text-gray-900">{job.jobTitle}</p>
                                <p className="text-sm text-gray-600">{job.company}</p>
                                <p className="text-xs text-gray-600">Match: {job.matchScore}%</p>
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                                <p className="text-xs text-gray-600 mt-1">{job.salaryRange}</p>
                              </td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResumeColor(job.resumeStatus)}`}>
                                  {job.resumeStatus}
                                </span>
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-gray-900">
                                  {new Date(job.appliedDate).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(job.appliedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {Math.floor((Date.now() - new Date(job.appliedDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </p>
                              </td>
                              <td className="p-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditJob(job.id)}
                                    className="px-3 py-1 text-sm bg-blue-100 text-gray-900 rounded hover:bg-blue-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteJob(job.id)}
                                    className="px-3 py-1 text-sm bg-red-100 text-gray-900 rounded hover:bg-red-200"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Job Application Statistics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-bold text-gray-800 mb-4">📊 Application Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">{candidateJobs.length}</p>
                      <p className="text-sm text-gray-600">Total Applications</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {candidateJobs.filter(j => j.status === 'Offer').length}
                      </p>
                      <p className="text-sm text-gray-600">Offers</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-yellow-700">
                        {candidateJobs.filter(j => j.status === 'Interview').length}
                      </p>
                      <p className="text-sm text-gray-600">Interviews</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">
                        {candidateJobs.length > 0 
                          ? Math.round(candidateJobs.reduce((sum, job) => sum + job.matchScore, 0) / candidateJobs.length)
                          : 0
                        }%
                      </p>
                      <p className="text-sm text-gray-600">Avg. Match Score</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCandidateDetails(false)
                      setSelectedCandidate(null)
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Export Applications
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Edit Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">✏️ Edit Job Application</h3>
                    <p className="text-gray-600">
                      Editing job for: {selectedCandidate?.fullName || `${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-700 hover:text-gray-900 text-2xl"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleSaveJob()
                }}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={jobFormData.jobTitle}
                          onChange={(e) => setJobFormData({...jobFormData, jobTitle: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Senior Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company *
                        </label>
                        <input
                          type="text"
                          required
                          value={jobFormData.company}
                          onChange={(e) => setJobFormData({...jobFormData, company: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Google, Microsoft, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Description
                      </label>
                      <textarea
                        value={jobFormData.description}
                        onChange={(e) => setJobFormData({...jobFormData, description: e.target.value})}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the job position, requirements, and responsibilities..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Status
                        </label>
                        <select
                          value={jobFormData.status}
                          onChange={(e) => setJobFormData({...jobFormData, status: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="Applied" className="text-gray-900">Applied</option>
                          <option value="Under Review" className="text-gray-900">Under Review</option>
                          <option value="Interview" className="text-gray-900">Interview</option>
                          <option value="Offer" className="text-gray-900">Offer</option>
                          <option value="Rejected" className="text-gray-900">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resume Status
                        </label>
                        <select
                          value={jobFormData.resumeStatus}
                          onChange={(e) => setJobFormData({...jobFormData, resumeStatus: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="Pending" className="text-gray-900">Pending</option>
                          <option value="Submitted" className="text-gray-900">Submitted</option>
                          <option value="Reviewed" className="text-gray-900">Reviewed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Match Score (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={jobFormData.matchScore}
                          onChange={(e) => setJobFormData({...jobFormData, matchScore: parseInt(e.target.value) || 0})}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${jobFormData.matchScore}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">{jobFormData.matchScore}% match</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary Range
                      </label>
                      <input
                        type="text"
                        value={jobFormData.salaryRange}
                        onChange={(e) => setJobFormData({...jobFormData, salaryRange: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="$100k - $150k"
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                      <p className="text-sm text-gray-700">
                        Job ID: <code className="bg-white px-2 py-1 rounded text-gray-900">{editingJob?.id}</code>
                      </p>
                      {editingJob?.appliedDate && (
                        <p className="text-sm text-gray-700 mt-1">
                          Applied: {new Date(editingJob.appliedDate).toLocaleDateString()} at {new Date(editingJob.appliedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-4">📞 Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'Generated resume for John Doe', time: '2 hours ago', status: 'success' },
                { action: 'Emailed Sarah Smith', time: '1 day ago', status: 'pending' },
                { action: 'Scheduled interview with Mike', time: '2 days ago', status: 'scheduled' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500' : item.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                    <span className="text-gray-700">{item.action}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-4">🎯 Priority Tasks</h3>
            <div className="space-y-3">
              {assignedCandidates
                .filter(c => c.paymentStatus === 'pending')
                .slice(0, 3)
                .map((candidate, index) => (
                  <div key={candidate.id} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-gray-900">{candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}</p>
                    <p className="text-sm text-gray-600">Payment pending - follow up required</p>
                    <button className="mt-2 text-sm text-blue-700 hover:text-blue-900">
                      Contact now →
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-4">📊 Your Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Candidates Hired</span>
                  <span className="text-sm font-medium text-gray-900">3/12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-medium text-gray-900">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Client Satisfaction</span>
                  <span className="text-sm font-medium text-gray-900">4.5/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Company Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">IP</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Infrapilot Tech Solutions</p>
                <p className="text-xs text-gray-500">© 2024 All rights reserved</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center md:text-right">
              <p>Job Application Support Platform • Version 2.1 • Recruiter Portal</p>
              <p className="mt-1">Need help? Contact admin@infrapilot.tech</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}