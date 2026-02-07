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

  // ✅ ADD THIS FUNCTION - Save candidate resume to localStorage
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

  // ✅ ADD THIS FUNCTION - Generate resume template from AI content
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

  // ✅ ADD THESE MISSING FUNCTIONS TOO (from your original code)
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

  // ... [ADD THE REST OF YOUR ORIGINAL FUNCTIONS HERE] ...
  
  // This is just a placeholder - you need to copy the rest of your original JSX code here
  return (
    <div>Recruiter Dashboard - Make sure to copy your original JSX here</div>
  )
}