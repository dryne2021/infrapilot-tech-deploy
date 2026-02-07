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
  
  // ✅ MAKE SURE THESE STATE VARIABLES ARE DECLARED:
  // Resume Generation State
  const [showResumeGenerator, setShowResumeGenerator] = useState(false)
  const [jobIdForResume, setJobIdForResume] = useState('')
  const [jobDescriptionForResume, setJobDescriptionForResume] = useState('')
  const [generatedResume, setGeneratedResume] = useState('')
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)
  const [resumeGenerationHistory, setResumeGenerationHistory] = useState<any[]>([])
  const [resumeError, setResumeError] = useState('')
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const router = useRouter()

  // ✅ ADD THIS HELPER FUNCTION - Ensure candidate data has proper structure
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

  // ✅ ALSO UPDATE THE generateAndDownloadWordResume function
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

  // In the viewCandidateDetails function, also ensure structure
  const viewCandidateDetails = (candidate) => {
    // ✅ Ensure candidate data is structured before using it
    const structuredCandidate = ensureCandidateDataStructure(candidate);
    setSelectedCandidate(structuredCandidate);
    
    // Generate mock job applications for this candidate
    const mockJobs = generateMockJobs(structuredCandidate);
    setCandidateJobs(mockJobs);
    setShowCandidateDetails(true);
  };

  // ... [REST OF THE ORIGINAL COMPONENT FUNCTIONS AND JSX REMAIN HERE] ...
}