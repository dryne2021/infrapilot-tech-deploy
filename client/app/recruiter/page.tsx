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
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : '')
  
  const router = useRouter()

  const normalizeExperience = (exp: any) => {
    return {
      company: exp.company || "",
      title: exp.title || "",
      startDate: exp.startDate || "",
      endDate: exp.currentlyWorking ? "" : exp.endDate || "",
      location: exp.location || "",
      bullets: exp.bullets || [],
    };
  };

  const api = async (
    path: string,
    options: (RequestInit & { headers?: HeadersInit }) = {}
  ) => {
    const token = localStorage.getItem('infrapilot_token');
    
    const res = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '');

    if (!res.ok) {
      const msg = typeof data === 'string' ? data : ((data as any)?.message || `Request failed (${res.status})`);
      throw new Error(msg);
    }

    return data;
  };

  const fetchAssignedCandidates = () =>
    api(`/api/v1/recruiter/candidates`, { method: 'GET' });

  const fetchCandidateJobs = (candidateId: string, recruiterId: string) =>
    api(`/api/v1/job-applications/candidate/${candidateId}?recruiterId=${recruiterId}`, {
      method: 'GET',
    });

  const createCandidateJob = (payload: any) =>
    api(`/api/v1/job-applications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

  const updateCandidateJob = (jobDbId: string, payload: any) =>
    api(`/api/v1/job-applications/${jobDbId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

  const deleteCandidateJob = (jobDbId: string) =>
    api(`/api/v1/job-applications/${jobDbId}`, {
      method: 'DELETE',
    });

  const saveJobResume = (jobDbId: string, resumeText: string, jobDescriptionFull: string) =>
    updateCandidateJob(jobDbId, {
      resumeText,
      jobDescriptionFull,
      resumeStatus: 'Submitted',
    });

  const ensureCandidateDataStructure = (candidate: any) => {
    if (!candidate) return candidate;

    const structuredCandidate = { ...candidate };

    if (!structuredCandidate.id && structuredCandidate._id) {
      structuredCandidate.id = structuredCandidate._id;
    }
    
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

  const downloadDocxFromText = async (candidate: any, resumeText: string) => {
    const token = localStorage.getItem('infrapilot_token');
    const fileSafeName =
      (candidate?.fullName || `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || 'Candidate')
        .replace(/\s+/g, '_');

    const payload = {
      name: candidate?.fullName || `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim(),
      email: candidate?.email || '',
      phone: candidate?.phone || '',
      location: candidate?.location || '',
      text: resumeText,
    };

    const res = await fetch(`${apiBaseUrl}/api/v1/resume/download`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Word download failed (${res.status})`);
      }
      throw new Error(`Word download failed (${res.status})`);
    }

    if (!contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      const maybeText = await res.text().catch(() => '');
      throw new Error(
        `Expected DOCX but got Content-Type: ${contentType}. Response: ${maybeText.slice(0, 200)}`
      );
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Resume_${fileSafeName}_${jobIdForResume || Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  };

  const autoCreateJobIfNeeded = async () => {
    if (!selectedCandidate) return null;

    const recruiterId = localStorage.getItem('recruiter_id') || '';

    if (editingJob?._id) {
      return editingJob._id;
    }

    const payload = {
      candidateId: selectedCandidate.id,
      recruiterId,
      jobId: jobIdForResume || `job_${Date.now()}`,
      jobTitle: 'Position Applied',
      company: 'Company Name',
      description: jobDescriptionForResume,
      status: 'Applied',
      resumeStatus: 'Pending',
      matchScore: 0,
      salaryRange: '',
    };

    const newJob = await createCandidateJob(payload);

    const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId);
    setCandidateJobs(jobsResp.jobs || []);

    return newJob._id || jobsResp.jobs?.[0]?._id;
  };

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
      const candidate: any = ensureCandidateDataStructure(selectedCandidate);
      
      const normalizedExp = (candidate.experience || []).map(normalizeExperience);

      if (normalizedExp.length === 0) {
        const proceed = window.confirm(
          '⚠️ No work experience found. The resume will be generated with education and skills only. Continue?'
        );
        if (!proceed) {
          setIsGeneratingResume(false);
          return;
        }
      }

      const token = localStorage.getItem('infrapilot_token');

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        skills: candidate.skills || [],
        experience: normalizedExp,
        education: candidate.education || [],
        certifications: candidate.certifications || [],
        projects: candidate.projects || [],
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume,
      };

      console.log("Payload experience:", payload.experience);

      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Generate failed (${res.status})`);
      }

      const resumeText = data?.resumeText || '';
      if (!resumeText.trim()) {
        throw new Error('No resume text returned from API');
      }

      setGeneratedResume(resumeText);

      autoCreateJobIfNeeded()
        .then((jobDbId) => {
          if (jobDbId) {
            return saveJobResume(jobDbId, resumeText, jobDescriptionForResume);
          }
        })
        .then(() => {
          console.log("✅ Resume saved to DB");
        })
        .catch((err) => {
          console.error("❌ Background save failed:", err);
        });

      await downloadDocxFromText(candidate, resumeText);

      alert('✅ Word resume downloaded (.docx) and saved to job!');
    } catch (err: any) {
      console.error('❌ Word generation/download error:', err);
      setResumeError(err?.message || 'Failed to generate/download Word resume');
      alert(`❌ ${err?.message || 'Failed to generate/download Word resume'}`);
    } finally {
      setIsGeneratingResume(false);
    }
  };

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
      const candidate: any = ensureCandidateDataStructure(selectedCandidate);
      
      const normalizedExp = (candidate.experience || []).map(normalizeExperience);

      if (normalizedExp.length === 0) {
        const proceed = window.confirm(
          '⚠️ No work experience found. The resume will be generated with education and skills only. Continue?'
        );
        if (!proceed) {
          setIsGeneratingResume(false);
          return;
        }
      }

      const token = localStorage.getItem('infrapilot_token');

      const payload = {
        fullName: candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
        targetRole: candidate.currentPosition || candidate.targetRole || 'Professional',
        location: candidate.location || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        summary: candidate.summary || candidate.about || '',
        skills: candidate.skills || [],
        experience: normalizedExp,
        education: candidate.education || [],
        certifications: candidate.certifications || [],
        projects: candidate.projects || [],
        jobId: jobIdForResume,
        jobDescription: jobDescriptionForResume,
      };

      console.log("Payload experience:", payload.experience);

      const res = await fetch(`${apiBaseUrl}/api/v1/resume/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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

      autoCreateJobIfNeeded()
        .then((jobDbId) => {
          if (jobDbId) {
            return saveJobResume(jobDbId, resumeText, jobDescriptionForResume);
          }
        })
        .then(() => {
          console.log("✅ Resume saved to DB");
        })
        .catch((err) => {
          console.error("❌ Background save failed:", err);
        });

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

  const downloadResume = async () => {
    try {
      if (!generatedResume?.trim()) {
        alert('No resume generated yet.');
        return;
      }
      if (!selectedCandidate) {
        alert('Please select a candidate first');
        return;
      }

      const candidate: any = ensureCandidateDataStructure(selectedCandidate);
      await downloadDocxFromText(candidate, generatedResume);
    } catch (err: any) {
      console.error(err);
      alert(`❌ ${err?.message || 'Failed to download .docx'}`);
    }
  };
  
  const copyResumeToClipboard = () => {
    navigator.clipboard.writeText(generatedResume)
      .then(() => alert('✅ Resume copied to clipboard!'))
      .catch(() => alert('❌ Failed to copy resume'))
  }
  
  const clearResumeGenerator = () => {
    setJobIdForResume('')
    setJobDescriptionForResume('')
    setGeneratedResume('')
  }
  
  const loadJobDetails = (jobDbId: string) => {
    const job = candidateJobs.find((j: any) => j._id === jobDbId);
    if (job) {
      setEditingJob(job);
      setJobIdForResume(job.jobId || job._id);
      setJobDescriptionForResume(job.jobDescriptionFull || job.description || '');
      setShowResumeGenerator(true);
    }
  };

  const viewCandidateDetails = async (candidate: any) => {
    const structuredCandidate = ensureCandidateDataStructure(candidate);
    setSelectedCandidate(structuredCandidate);

    try {
      const recruiterId = localStorage.getItem('recruiter_id') || '';
      const jobsResp: any = await fetchCandidateJobs(structuredCandidate.id, recruiterId);
      setCandidateJobs(jobsResp.jobs || []);
    } catch (e) {
      console.error('Failed to load candidate jobs:', e);
      setCandidateJobs([]);
    }

    setShowCandidateDetails(true);
  };

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
        
        const savedSessions = localStorage.getItem(`work_sessions_${recruiterId}`)
        if (savedSessions) {
          const sessions = JSON.parse(savedSessions)
          setWorkSessions(sessions)
          
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
          
          const activeSession = sessions.find((session: any) => !session.clockOut)
          if (activeSession) {
            setIsClockedIn(true)
            setClockInTime(new Date(activeSession.clockIn))
          }
        }
        
        const savedResumeHistory = localStorage.getItem(`resume_history_${recruiterId}`)
        if (savedResumeHistory) {
          setResumeGenerationHistory(JSON.parse(savedResumeHistory))
        }
        
        try {
          const myCandidates = await fetchAssignedCandidates();
          setAssignedCandidates(myCandidates);

          const activeSubs = myCandidates.filter((c: any) => c.subscriptionStatus === 'active').length;
          const pending = myCandidates.filter((c: any) => c.paymentStatus === 'pending').length;

          setStats({
            totalAssigned: myCandidates.length,
            activeSubscriptions: activeSubs,
            pendingFollowups: pending,
            interviewsThisWeek: Math.floor(Math.random() * 5),
          });
        } catch (e) {
          console.error('Failed to load assigned candidates:', e);
          setAssignedCandidates([]);
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
    
    alert(`✅ Clocked in at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`)
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
    setTotalWorkedToday(prev => prev + sessionDuration)
    
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
    const todaySessions = workSessions.filter((session: any) => 
      new Date(session.clockIn).toDateString() === today && session.clockOut
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

  const updateCandidateStatus = async (candidateId: string, newStatus: string) => {
    try {
      await api(`/api/v1/recruiter/candidates/${candidateId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      setAssignedCandidates(prev => 
        prev.map((candidate: any) => {
          const candidateWithId = ensureCandidateDataStructure(candidate);
          return candidateWithId.id === candidateId 
            ? { ...candidateWithId, recruiterStatus: newStatus }
            : candidateWithId;
        })
      );
      
      alert('Status updated successfully!');
    } catch (error: any) {
      console.error('Failed to update candidate status:', error);
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`);
    }
  };

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

  const handleSaveJob = async () => {
    if (!editingJob || !selectedCandidate) return;

    try {
      await updateCandidateJob(editingJob._id, jobFormData);
      
      const recruiterId = localStorage.getItem('recruiter_id') || '';
      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId);
      setCandidateJobs(jobsResp.jobs || []);

      setShowEditForm(false);
      setEditingJob(null);
      alert('✅ Job updated successfully!');
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to update job'}`);
    }
  };

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

  const handleDeleteJob = async (jobDbId: string) => {
    if (!selectedCandidate) return;

    if (!window.confirm('Are you sure you want to delete this job application?')) return;

    try {
      await deleteCandidateJob(jobDbId);
      
      const recruiterId = localStorage.getItem('recruiter_id') || '';
      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId);
      setCandidateJobs(jobsResp.jobs || []);
      alert('✅ Job deleted!');
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to delete job'}`);
    }
  };

  const addNewJob = async () => {
    if (!selectedCandidate) return;

    const recruiterId = localStorage.getItem('recruiter_id') || '';

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
      salaryRange: 'To be determined',
    };

    try {
      await createCandidateJob(payload);

      const jobsResp: any = await fetchCandidateJobs(selectedCandidate.id, recruiterId);
      setCandidateJobs(jobsResp.jobs || []);

      setShowEditForm(false);
    } catch (e: any) {
      alert(`❌ ${e?.message || 'Failed to create job'}`);
    }
  };

  const getPlanColor = (plan: string) => {
    const colors: any = {
      free: 'bg-gray-100 text-gray-800 border-gray-200',
      silver: 'bg-gray-200 text-gray-800 border-gray-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      platinum: 'bg-purple-100 text-purple-800 border-purple-200',
      enterprise: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
    return colors[plan] || 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Under Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Interview': 'bg-purple-100 text-purple-800 border-purple-200',
      'Offer': 'bg-green-100 text-green-800 border-green-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getResumeColor = (status: string) => {
    const colors: any = {
      'Submitted': 'bg-green-100 text-green-800 border-green-200',
      'Reviewed': 'bg-blue-100 text-blue-800 border-blue-200',
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Generated': 'bg-purple-100 text-purple-800 border-purple-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getRecruiterStatusColor = (status: string) => {
    const colors: any = {
      'new': 'bg-blue-100 text-blue-800 border-blue-200',
      'contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'screening': 'bg-purple-100 text-purple-800 border-purple-200',
      'interview': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'shortlisted': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl font-bold animate-pulse">IP</span>
            </div>
          </div>
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-medium bg-white px-6 py-3 rounded-full shadow-md inline-block">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const todayStats = getTodayWorkStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Company Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-white text-2xl font-bold">IP</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Infrapilot Tech</h1>
              <p className="text-blue-100 text-sm">Job Application Support Platform</p>
              <div className="flex gap-2 mt-1">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">Recruiter Portal v2.1</span>
                <span className="px-3 py-1 bg-green-400/20 backdrop-blur-sm text-white text-xs rounded-full">AI-Powered</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-lg">
                  {user.name?.[0]?.toUpperCase() || 'R'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-blue-100">ID: {localStorage.getItem('recruiter_id')?.substring(0, 8)}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all flex items-center gap-2 border border-white/20"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              👔 Recruiter Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Welcome back, <span className="font-semibold text-indigo-600">{user.name}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-xl text-sm font-medium border border-blue-200 shadow-sm">
                📊 {user.department || 'Recruitment'}
              </span>
              <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-xl text-sm font-medium border border-purple-200 shadow-sm">
                🎯 {user.specialization || 'Technical Recruitment'}
              </span>
            </div>
          </div>
          
          {/* Clock In/Out and Work Time */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="px-4 py-3 bg-white rounded-xl border-2 border-blue-100 shadow-md">
              <div className="text-xs text-gray-600 font-medium mb-1">Today's Work</div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatDuration(todayStats.totalDuration + (isClockedIn ? currentSessionDuration : 0))}
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                  {todayStats.sessions} sessions
                </span>
              </div>
            </div>

            <div className="relative">
              {isClockedIn ? (
                <button
                  onClick={handleClockOut}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all"
                >
                  <span className="text-xl animate-pulse">⏰</span>
                  <div className="text-left">
                    <div className="font-semibold">Clock Out</div>
                    <div className="text-xs opacity-90">Working now</div>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleClockIn}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-lg transform hover:scale-105 transition-all"
                >
                  <span className="text-xl">🕒</span>
                  <div className="text-left">
                    <div className="font-semibold">Clock In</div>
                    <div className="text-xs opacity-90">Start working</div>
                  </div>
                </button>
              )}
              
              {isClockedIn && clockInTime && (
                <div className="absolute top-full mt-3 right-0 bg-white rounded-xl shadow-2xl border-2 border-blue-100 min-w-[240px] z-10 p-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">Current Session</div>
                    <div className="text-3xl font-mono font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatDuration(currentSessionDuration)}
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      Started at {formatTime(clockInTime)}
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse"
                        style={{ width: `${Math.min(100, (currentSessionDuration / (8 * 60 * 60 * 1000)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Work Time Card */}
          <div className={`group p-6 rounded-2xl border-2 transition-all duration-300 ${
            isClockedIn 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300 hover:shadow-xl' 
              : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-xl'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isClockedIn ? 'bg-green-200' : 'bg-gradient-to-br from-blue-100 to-indigo-100'}`}>
                {isClockedIn ? '⏰' : '🕒'}
              </div>
              <span className="text-2xl font-bold text-gray-800">
                {formatDuration(todayStats.totalDuration + (isClockedIn ? currentSessionDuration : 0))}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Work Time Today</h3>
            {isClockedIn && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Current session:</span>
                  <span className="font-mono font-bold text-green-800">
                    {formatDuration(currentSessionDuration)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-xl">
                👥
              </div>
              <span className="text-2xl font-bold text-blue-800">{stats.totalAssigned}</span>
            </div>
            <h3 className="text-sm font-medium text-blue-700">Assigned Candidates</h3>
          </div>

          <div className="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 hover:border-green-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-200 to-emerald-200 rounded-xl">
                💰
              </div>
              <span className="text-2xl font-bold text-green-800">{stats.activeSubscriptions}</span>
            </div>
            <h3 className="text-sm font-medium text-green-700">Active Subscriptions</h3>
          </div>

          <div className="group p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-yellow-200 hover:border-yellow-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-xl">
                ⏳
              </div>
              <span className="text-2xl font-bold text-yellow-800">{stats.pendingFollowups}</span>
            </div>
            <h3 className="text-sm font-medium text-yellow-700">Pending Follow-ups</h3>
          </div>

          <div className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-200 to-pink-200 rounded-xl">
                📅
              </div>
              <span className="text-2xl font-bold text-purple-800">{stats.interviewsThisWeek}</span>
            </div>
            <h3 className="text-sm font-medium text-purple-700">Interviews This Week</h3>
          </div>
        </div>

        {/* Resume Generation History */}
        {resumeGenerationHistory.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-2xl border-2 border-purple-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  Recent Resume Generations
                </h2>
                <p className="text-gray-600 mt-1">AI-powered resume generation history</p>
              </div>
              <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-xl text-sm font-medium border border-purple-200">
                {resumeGenerationHistory.length} generated
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-purple-800">Date</th>
                    <th className="p-4 text-left text-sm font-semibold text-purple-800">Candidate</th>
                    <th className="p-4 text-left text-sm font-semibold text-purple-800">Job ID</th>
                    <th className="p-4 text-left text-sm font-semibold text-purple-800">Match Score</th>
                    <th className="p-4 text-left text-sm font-semibold text-purple-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resumeGenerationHistory.slice(0, 3).map((resume, index) => (
                    <tr key={resume.id} className="hover:bg-purple-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span className="text-sm text-gray-800">
                            {new Date(resume.generatedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-gray-800">{resume.candidateName}</span>
                      </td>
                      <td className="p-4">
                        <code className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                          {resume.jobId}
                        </code>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                              style={{ width: `${resume.matchScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{resume.matchScore}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setJobIdForResume(resume.jobId)
                            setJobDescriptionForResume(resume.jobDescription)
                            setShowResumeGenerator(true)
                            if (showCandidateDetails) {
                              document.getElementById('resume-generator')?.scrollIntoView({ behavior: 'smooth' })
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 text-sm font-medium shadow-md hover:shadow-lg transition-all"
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
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Work Sessions History
              </h2>
              <p className="text-gray-600 mt-1">Track your working hours</p>
            </div>
            <button
              onClick={() => {
                const totalHours = (workSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / (1000 * 60 * 60)).toFixed(1)
                alert(`📊 Work Summary\n\nTotal sessions: ${workSessions.length}\nTotal hours: ${totalHours}h\nToday's total: ${formatDuration(todayStats.totalDuration)}`)
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              View Summary
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-blue-800">Date</th>
                  <th className="p-4 text-left text-sm font-semibold text-blue-800">Clock In</th>
                  <th className="p-4 text-left text-sm font-semibold text-blue-800">Clock Out</th>
                  <th className="p-4 text-left text-sm font-semibold text-blue-800">Duration</th>
                  <th className="p-4 text-left text-sm font-semibold text-blue-800">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workSessions.slice(-5).reverse().map((session, index) => (
                  <tr key={session.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4">
                      <span className="text-sm text-gray-800">
                        {new Date(session.clockIn).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                        {new Date(session.clockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </td>
                    <td className="p-4">
                      {session.clockOut ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          {new Date(session.clockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm animate-pulse">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-medium text-gray-800">
                        {session.duration 
                          ? formatDuration(session.duration)
                          : session.clockOut
                            ? formatDuration(new Date(session.clockOut).getTime() - new Date(session.clockIn).getTime())
                            : formatDuration(Date.now() - new Date(session.clockIn).getTime())
                        }
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-xl text-xs font-medium ${
                        !session.clockOut 
                          ? 'bg-green-100 text-green-800 border border-green-200 animate-pulse' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {!session.clockOut ? 'Active Now' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {workSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="text-5xl mb-4 opacity-50">📊</div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No work sessions yet</h3>
                      <p className="text-gray-600">Click "Clock In" to start tracking your work time</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Candidates Table */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Your Assigned Candidates
                </h2>
                <p className="text-gray-600 mt-1">Click the eye icon to view job applications</p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl text-blue-800 font-medium">
                Total: {assignedCandidates.length}
              </div>
            </div>
          </div>
          
          {assignedCandidates.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-6xl mb-4 opacity-50">📭</div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">No candidates assigned yet</h3>
              <p className="text-gray-600 mb-6">The admin will assign candidates to you soon.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Candidate</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Subscription Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Recruiter Status</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignedCandidates.map((candidate: any, index: number) => {
                    const candidateWithId = ensureCandidateDataStructure(candidate);
                    const daysRemaining = candidateWithId.daysRemaining || 0
                    
                    return (
                      <tr key={candidateWithId.id} className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                              <span className="text-white font-bold text-lg">
                                {candidateWithId.firstName?.[0]?.toUpperCase() || 'C'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                {candidateWithId.fullName || `${candidateWithId.firstName} ${candidateWithId.lastName}`}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">ID: {candidateWithId.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <p className="text-sm flex items-center gap-2">
                              <span className="text-blue-600">📧</span>
                              <span className="text-gray-700">{candidateWithId.email}</span>
                            </p>
                            <p className="text-sm flex items-center gap-2">
                              <span className="text-green-600">📞</span>
                              <span className="text-gray-700">{candidateWithId.phone || 'Not provided'}</span>
                            </p>
                            <p className="text-sm flex items-center gap-2">
                              <span className="text-purple-600">💼</span>
                              <span className="text-gray-700">{candidateWithId.currentPosition || 'No position'}</span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-3">
                            <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-medium border ${getPlanColor(candidateWithId.subscriptionPlan)}`}>
                              {candidateWithId.subscriptionPlan || 'Free'} Plan
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                candidateWithId.paymentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {candidateWithId.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                              </span>
                              <span className={`text-xs font-medium ${
                                daysRemaining > 7 ? 'text-green-600' : daysRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {daysRemaining}d left
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={candidateWithId.recruiterStatus || 'new'}
                            onChange={(e) => updateCandidateStatus(candidateWithId.id, e.target.value)}
                            className={`p-2.5 border-2 rounded-xl text-sm w-full font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getRecruiterStatusColor(candidateWithId.recruiterStatus || 'new')}`}
                          >
                            <option value="new" className="bg-blue-100 text-blue-800">🆕 New</option>
                            <option value="contacted" className="bg-yellow-100 text-yellow-800">📞 Contacted</option>
                            <option value="screening" className="bg-purple-100 text-purple-800">📋 Screening</option>
                            <option value="interview" className="bg-indigo-100 text-indigo-800">🎯 Interview</option>
                            <option value="shortlisted" className="bg-green-100 text-green-800">✅ Shortlisted</option>
                            <option value="rejected" className="bg-red-100 text-red-800">❌ Rejected</option>
                            <option value="hired" className="bg-emerald-100 text-emerald-800">🎉 Hired</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-2">
                            Updated: {new Date(candidateWithId.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => viewCandidateDetails(candidateWithId)}
                              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all group"
                            >
                              <span className="text-lg">👁️</span>
                              <span>View Jobs</span>
                            </button>
                            <a 
                              href={`mailto:${candidateWithId.email}`}
                              className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 text-center text-sm font-medium border border-gray-300"
                            >
                              📧 Email
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border-2 border-gray-200">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="bg-white/20 p-2 rounded-lg">👁️</span>
                      Job Applications
                    </h3>
                    <p className="text-blue-100 mt-1">
                      For: <span className="font-semibold">{selectedCandidate.fullName || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCandidateDetails(false)
                      setSelectedCandidate(null)
                    }}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl transition-all"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Candidate Info Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">📧 Email</p>
                      <p className="font-medium text-gray-800">{selectedCandidate.email}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">📞 Phone</p>
                      <p className="font-medium text-gray-800">{selectedCandidate.phone || 'Not provided'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">💳 Subscription</p>
                      <span className={`px-3 py-1 rounded-xl text-xs font-medium border ${getPlanColor(selectedCandidate.subscriptionPlan)}`}>
                        {selectedCandidate.subscriptionPlan || 'Free'}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">⚡ Status</p>
                      <span className={`px-3 py-1 rounded-xl text-xs font-medium border ${
                        selectedCandidate.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}>
                        {selectedCandidate.paymentStatus === 'paid' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FULL CANDIDATE PROFILE DETAILS */}
                <div className="space-y-6">
                  {/* Summary */}
                  {selectedCandidate.summary && (
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200">
                      <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center gap-2">
                        <span className="text-2xl">📝</span>
                        Professional Summary
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedCandidate.summary}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedCandidate.skills?.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                      <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🛠</span>
                        Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                    <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💼</span>
                      Work Experience
                    </h4>

                    {selectedCandidate.experience?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedCandidate.experience.map((exp: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                            <p className="font-semibold text-gray-800 text-lg">
                              {exp.title}
                            </p>
                            <p className="text-gray-600">
                              {exp.company} {exp.location ? `• ${exp.location}` : ''}
                            </p>
                            <p className="text-sm text-purple-600 mt-2">
                              {exp.startDate} – {exp.endDate || 'Present'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 bg-white p-4 rounded-xl">No work experience provided.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                    <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4 flex items-center gap-2">
                      <span className="text-2xl">🎓</span>
                      Education
                    </h4>

                    {selectedCandidate.education?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedCandidate.education.map((edu: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                            <p className="font-semibold text-gray-800">
                              {edu.school}
                            </p>
                            <p className="text-gray-600">
                              {edu.degree} {edu.field ? `– ${edu.field}` : ''}
                            </p>
                            <p className="text-sm text-green-600 mt-2">
                              {edu.startYear} – {edu.endYear}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 bg-white p-4 rounded-xl">No education provided.</p>
                    )}
                  </div>
                </div>

                {/* Resume Generator Section */}
                <div id="resume-generator" className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
                      <span className="text-2xl">🤖</span>
                      AI Resume Generator
                    </h4>
                    <button
                      onClick={() => setShowResumeGenerator(!showResumeGenerator)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 flex items-center gap-2 shadow-lg transition-all"
                    >
                      <span>{showResumeGenerator ? '👇' : '👆'}</span>
                      {showResumeGenerator ? 'Hide Generator' : 'Show Generator'}
                    </button>
                  </div>
                  
                  {showResumeGenerator && (
                    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-6">
                      <div className="mb-6">
                        <h5 className="font-bold text-gray-800 mb-3 text-lg">Generate Tailored Resume</h5>
                        <p className="text-sm text-gray-600 mb-4">
                          Enter job details to generate a customized resume for <span className="font-semibold text-purple-600">{selectedCandidate.fullName || `${selectedCandidate.firstName} ${selectedCandidate.lastName}`}</span>
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
                                className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                placeholder="e.g., job_abc123"
                              />
                              <select
                                onChange={(e) => loadJobDetails(e.target.value)}
                                className="p-3 border-2 border-gray-300 rounded-xl bg-white text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                              >
                                <option value="">Load from jobs</option>
                                {candidateJobs.map((job: any) => (
                                  <option key={job._id} value={job._id}>
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
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '92%' }}></div>
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
                            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                            placeholder="Paste the full job description here..."
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {jobDescriptionForResume.length} characters • Required
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={generateResume}
                            disabled={isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()}
                            className={`px-8 py-4 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-all ${
                              isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-xl transform hover:-translate-y-0.5'
                            }`}
                          >
                            {isGeneratingResume ? (
                              <>
                                <span className="animate-spin">⏳</span> Generating...
                              </>
                            ) : (
                              <>
                                <span className="text-xl">✨</span>
                                Generate AI Resume
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={generateAndDownloadWordResume}
                            disabled={isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()}
                            className={`px-8 py-4 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-all ${
                              isGeneratingResume || !jobIdForResume.trim() || !jobDescriptionForResume.trim()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-xl transform hover:-translate-y-0.5'
                            }`}
                          >
                            <span className="text-xl">📄</span>
                            Download Word Resume
                          </button>
                          
                          <button
                            onClick={clearResumeGenerator}
                            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                          >
                            Clear
                          </button>
                        </div>

                        {resumeError && (
                          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                            <p className="text-sm text-red-700">❌ {resumeError}</p>
                          </div>
                        )}
                      </div>
                      
                      {generatedResume && (
                        <div className="mt-6 border-t-2 border-gray-200 pt-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                              <span className="text-2xl">📄</span>
                              Generated Resume
                            </h5>
                            <div className="flex gap-2">
                              <button
                                onClick={copyResumeToClipboard}
                                className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-xl hover:from-green-200 hover:to-emerald-200 text-sm font-medium border border-green-300"
                              >
                                📋 Copy
                              </button>
                              <button
                                onClick={downloadResume}
                                className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-xl hover:from-blue-200 hover:to-indigo-200 text-sm font-medium border border-blue-300"
                              >
                                ⬇️ Download
                              </button>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                              {generatedResume}
                            </pre>
                          </div>
                          
                          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl">
                            <p className="text-sm text-gray-800">
                              💡 <strong className="text-yellow-700">Tip:</strong> This AI-generated resume is tailored to match the job description. Review and customize it before sending to the candidate.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Applications Table */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      Job Applications
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={addNewJob}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-md"
                      >
                        <span>➕</span> Add New Job
                      </button>
                    </div>
                  </div>
                  
                  {candidateJobs.length === 0 ? (
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 p-12 text-center">
                      <div className="text-6xl mb-4 opacity-50">📭</div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No job applications yet</h3>
                      <p className="text-gray-600 mb-6">Add the first job application for this candidate</p>
                      <button
                        onClick={addNewJob}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg"
                      >
                        Add First Job
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                          <tr>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Job Details</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Description</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Resume</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {candidateJobs.map((job: any) => (
                            <tr key={job._id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all">
                              <td className="p-4">
                                <div className="space-y-2">
                                  <p className="font-semibold text-gray-800">{job.jobTitle}</p>
                                  <p className="text-sm text-gray-600">{job.company}</p>
                                  <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    {job.jobId || job._id}
                                  </code>
                                </div>
                              </td>
                              <td className="p-4 max-w-xs">
                                <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
                                <p className="text-xs text-gray-500 mt-2">{job.salaryRange}</p>
                                <button
                                  onClick={() => {
                                    loadJobDetails(job._id)
                                    document.getElementById('resume-generator')?.scrollIntoView({ behavior: 'smooth' })
                                  }}
                                  className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                                >
                                  <span>✨</span> Generate Resume
                                </button>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${getStatusColor(job.status)}`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${getResumeColor(job.resumeStatus)}`}>
                                  {job.resumeStatus}
                                </span>
                              </td>
                              <td className="p-4">
                                <p className="text-sm text-gray-800">
                                  {new Date(job.appliedDate || job.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {Math.floor((Date.now() - new Date(job.appliedDate || job.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d ago
                                </p>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditJob(job._id)}
                                    className="px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-xl hover:from-blue-200 hover:to-indigo-200 text-sm font-medium border border-blue-200"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteJob(job._id)}
                                    className="px-3 py-2 bg-gradient-to-r from-red-100 to-rose-100 text-red-800 rounded-xl hover:from-red-200 hover:to-rose-200 text-sm font-medium border border-red-200"
                                  >
                                    🗑️ Delete
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

                {/* Application Statistics */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 p-6">
                  <h4 className="font-bold text-gray-800 mb-4 text-lg">📊 Application Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl text-center border-2 border-blue-200">
                      <p className="text-2xl font-bold text-blue-800">{candidateJobs.length}</p>
                      <p className="text-sm text-gray-600">Total Apps</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl text-center border-2 border-green-200">
                      <p className="text-2xl font-bold text-green-800">
                        {candidateJobs.filter((j: any) => j.status === 'Offer' || j.status === 'Hired').length}
                      </p>
                      <p className="text-sm text-gray-600">Offers</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl text-center border-2 border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-800">
                        {candidateJobs.filter((j: any) => j.status === 'Interview').length}
                      </p>
                      <p className="text-sm text-gray-600">Interviews</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl text-center border-2 border-purple-200">
                      <p className="text-2xl font-bold text-purple-800">
                        {candidateJobs.length > 0 
                          ? Math.round(candidateJobs.reduce((sum: number, job: any) => sum + (job.matchScore || 0), 0) / candidateJobs.length)
                          : 0
                        }%
                      </p>
                      <p className="text-sm text-gray-600">Avg Match</p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowCandidateDetails(false)
                      setSelectedCandidate(null)
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 font-medium shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Edit Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border-2 border-gray-200">
              <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="bg-white/20 p-2 rounded-lg">✏️</span>
                      Edit Job Application
                    </h3>
                    <p className="text-amber-100 mt-1">
                      Editing for: {selectedCandidate?.fullName || `${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-2xl transition-all"
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
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
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
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
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
                        className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
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
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                        >
                          <option value="Applied" className="text-gray-800">Applied</option>
                          <option value="Under Review" className="text-gray-800">Under Review</option>
                          <option value="Interview" className="text-gray-800">Interview</option>
                          <option value="Offer" className="text-gray-800">Offer</option>
                          <option value="Rejected" className="text-gray-800">Rejected</option>
                          <option value="Hired" className="text-gray-800">Hired</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resume Status
                        </label>
                        <select
                          value={jobFormData.resumeStatus}
                          onChange={(e) => setJobFormData({...jobFormData, resumeStatus: e.target.value})}
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                        >
                          <option value="Pending" className="text-gray-800">Pending</option>
                          <option value="Submitted" className="text-gray-800">Submitted</option>
                          <option value="Reviewed" className="text-gray-800">Reviewed</option>
                          <option value="Generated" className="text-gray-800">Generated</option>
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
                          className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                        />
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500" 
                              style={{ width: `${jobFormData.matchScore}%` }}
                            ></div>
                          </div>
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
                        className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                        placeholder="$100k - $150k"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                      <h4 className="font-medium text-gray-800 mb-2">Additional Information</h4>
                      <p className="text-sm text-gray-600">
                        Job DB ID: <code className="bg-white px-2 py-1 rounded text-amber-700">{editingJob?._id}</code>
                      </p>
                      {editingJob?.appliedDate && (
                        <p className="text-sm text-gray-600 mt-2">
                          Applied: {new Date(editingJob.appliedDate).toLocaleDateString()} at {new Date(editingJob.appliedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 font-medium shadow-lg"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-xl transition-all">
            <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 flex items-center gap-2">
              <span className="text-2xl">📞</span>
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { action: 'Generated resume for John Doe', time: '2 hours ago', status: 'success' },
                { action: 'Emailed Sarah Smith', time: '1 day ago', status: 'pending' },
                { action: 'Scheduled interview with Mike', time: '2 days ago', status: 'scheduled' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === 'success' ? 'bg-green-500' : 
                      item.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">{item.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-200 hover:shadow-xl transition-all">
            <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Priority Tasks
            </h3>
            <div className="space-y-3">
              {assignedCandidates
                .filter((c: any) => c.paymentStatus === 'pending')
                .slice(0, 3)
                .map((candidate: any, index: number) => {
                  const candidateWithId = ensureCandidateDataStructure(candidate);
                  return (
                    <div key={candidateWithId.id} className="p-4 bg-white rounded-xl border-2 border-yellow-200">
                      <p className="font-medium text-gray-800">{candidateWithId.fullName || `${candidateWithId.firstName} ${candidateWithId.lastName}`}</p>
                      <p className="text-sm text-amber-600 mt-1">Payment pending - follow up required</p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Contact now →
                      </button>
                    </div>
                  );
                })}
              {assignedCandidates.filter((c: any) => c.paymentStatus === 'pending').length === 0 && (
                <p className="text-gray-600 bg-white p-4 rounded-xl">No pending tasks</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 hover:shadow-xl transition-all">
            <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Your Performance
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Candidates Hired</span>
                  <span className="text-sm font-semibold text-green-600">3/12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-semibold text-blue-600">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: '78%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Client Satisfaction</span>
                  <span className="text-sm font-semibold text-purple-600">4.5/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm font-bold">IP</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Infrapilot Tech Solutions</p>
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