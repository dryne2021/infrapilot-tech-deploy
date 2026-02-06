'use client'

import API_BASE_URL from "@/utils/apiBase";
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CandidateDashboard() {
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [recruiter, setRecruiter] = useState(null)
  const [activeTab, setActiveTab] = useState('jobs')
  const [stats, setStats] = useState({
    totalJobs: 0,
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0
  })
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [profileForm, setProfileForm] = useState({
    phone: '',
    location: '',
    summary: '',
    skills: '',
    linkedin: '',
    portfolio: ''
  })
  const [applications, setApplications] = useState([])
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Your recruiter updated your resume", time: "2 hours ago", read: false },
    { id: 2, text: "New job match: Senior React Developer", time: "1 day ago", read: false },
    { id: 3, text: "Interview scheduled for Friday", time: "3 days ago", read: true }
  ])
  
  // NEW STATE: Job Details Modal
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    const checkCandidateAuth = () => {
      const userStr = localStorage.getItem('infrapilot_user')
      const candidateAuth = localStorage.getItem('candidate_authenticated')
      const candidateId = localStorage.getItem('candidate_id')
      
      if (!userStr || !candidateAuth || candidateAuth !== 'true') {
        router.push('/candidate/login')
        return
      }
      
      try {
        const userData = JSON.parse(userStr)
        
        if (userData.role !== 'candidate') {
          router.push('/candidate/login')
          return
        }
        
        // Load candidate details
        const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
        const candidateData = candidates.find(c => c.id === candidateId)
        
        if (!candidateData) {
          throw new Error('Candidate not found')
        }
        
        setCandidate(candidateData)
        
        // Load recruiter details
        if (candidateData.assignedRecruiter) {
          const recruiters = JSON.parse(localStorage.getItem('infrapilot_recruiters') || '[]')
          const recruiterData = recruiters.find(r => r.id === candidateData.assignedRecruiter)
          setRecruiter(recruiterData)
          
          // Load jobs for this candidate
          const candidateJobs = loadCandidateJobs(candidateId, recruiterData)
          setJobs(candidateJobs)
          
          // Calculate stats
          calculateStats(candidateJobs)
          
          // Load messages
          const savedMessages = localStorage.getItem(`messages_${candidateId}`)
          if (savedMessages) {
            setMessages(JSON.parse(savedMessages))
          } else {
            const initialMessages = [
              {
                id: '1',
                sender: 'recruiter',
                senderName: recruiterData?.name || 'Career Advisor',
                text: `Welcome aboard, ${candidateData.firstName}! I'm here to help you land your dream role. Let's start by discussing your career goals.`,
                time: new Date().toISOString()
              }
            ]
            setMessages(initialMessages)
            localStorage.setItem(`messages_${candidateId}`, JSON.stringify(initialMessages))
          }

          // Load applications
          const candidateApplications = loadCandidateApplications(candidateId, candidateData, recruiterData, candidateJobs)
          setApplications(candidateApplications)
        }
        
        // Set profile form
        setProfileForm({
          phone: candidateData.phone || '',
          location: candidateData.location || '',
          summary: candidateData.summary || candidateData.about || '',
          skills: Array.isArray(candidateData.skills) ? candidateData.skills.join(', ') : candidateData.skills || '',
          linkedin: candidateData.linkedin || '',
          portfolio: candidateData.portfolio || ''
        })
        
      } catch (error) {
        console.error('Auth error:', error)
        localStorage.clear()
        router.push('/candidate/login')
      } finally {
        setLoading(false)
      }
    }

    checkCandidateAuth()
  }, [router])

  // NEW FUNCTION: Open Job Details Modal
  const openJobDetails = (job) => {
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  // NEW FUNCTION: Close Job Details Modal
  const closeJobDetails = () => {
    setSelectedJob(null)
    setShowJobDetails(false)
  }

  const loadCandidateJobs = (candidateId, recruiter) => {
    try {
      const recruiterJobs = JSON.parse(localStorage.getItem(`recruiter_jobs_${recruiter?.id}`))
      if (recruiterJobs && recruiterJobs[candidateId]) {
        return recruiterJobs[candidateId]
      }
    } catch (e) {
      console.log('No saved jobs found, generating mock data')
    }
    
    return generateMockJobs(candidateId)
  }

  const generateMockJobs = (candidateId) => {
    const jobTitles = [
      'Senior Frontend Engineer',
      'Full Stack Developer',
      'React Native Engineer',
      'Backend Developer (Node.js)',
      'DevOps Specialist',
      'Data Scientist',
      'Product Manager',
      'UX/UI Designer'
    ]
    
    const companies = [
      { name: 'Google', logo: '🔍', description: 'A global technology leader specializing in internet-related services and products.' },
      { name: 'Microsoft', logo: '💼', description: 'Worldwide leader in software, services, devices and solutions.' },
      { name: 'Amazon', logo: '📦', description: 'Multinational technology company focusing on e-commerce, cloud computing, and AI.' },
      { name: 'Apple', logo: '🍎', description: 'Innovative technology company known for consumer electronics, software, and online services.' },
      { name: 'Meta', logo: '👍', description: 'Social media and technology company connecting people through various platforms.' },
      { name: 'Netflix', logo: '🎬', description: 'Leading streaming entertainment service with global reach.' },
      { name: 'Stripe', logo: '💳', description: 'Technology company building economic infrastructure for the internet.' },
      { name: 'Salesforce', logo: '☁️', description: 'Cloud-based software company focused on customer relationship management.' }
    ]
    
    const statuses = ['Applied', 'Under Review', 'Interview', 'Offer', 'Rejected']
    
    const jobDescriptions = [
      'We are looking for a talented developer to join our team and build cutting-edge applications. You will work with modern technologies and collaborate with cross-functional teams to deliver high-quality software solutions.',
      'Join our engineering team to develop scalable web applications. Responsibilities include designing and implementing new features, optimizing performance, and ensuring code quality through testing and reviews.',
      'As part of our development team, you will build and maintain customer-facing applications. You should have strong problem-solving skills and experience with modern web technologies.',
      'This role involves working on our core platform, implementing new features, and improving system architecture. You will collaborate with product managers and designers to create amazing user experiences.',
      'We need a skilled engineer to help us scale our infrastructure and improve our development processes. Experience with cloud platforms and containerization is required.',
      'Join our data team to build machine learning models and analytics pipelines. You will work with large datasets to extract insights and build predictive models.',
      'Lead product development from conception to launch. Work closely with engineering, design, and business teams to define product vision and execute on strategy.',
      'Design beautiful and intuitive user interfaces for our products. You will create wireframes, prototypes, and high-fidelity designs.'
    ]
    
    const requirements = [
      'Bachelor\'s degree in Computer Science or related field',
      '3+ years of experience in software development',
      'Strong knowledge of JavaScript/TypeScript',
      'Experience with React, Angular, or Vue.js',
      'Familiarity with REST APIs and modern development tools',
      'Excellent problem-solving and communication skills',
      'Ability to work in a fast-paced environment'
    ]
    
    const benefits = [
      'Competitive salary and equity package',
      'Health, dental, and vision insurance',
      '401(k) matching',
      'Flexible work hours and remote options',
      'Professional development budget',
      'Generous vacation policy',
      'Stock options',
      'Team building events and company retreats'
    ]
    
    const jobs = []
    const numJobs = Math.floor(Math.random() * 5) + 3
    
    for (let i = 0; i < numJobs; i++) {
      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)]
      const company = companies[Math.floor(Math.random() * companies.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const daysAgo = Math.floor(Math.random() * 30)
      const appliedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      
      jobs.push({
        id: `job_${candidateId}_${i}`,
        jobTitle,
        company: company.name,
        companyLogo: company.logo,
        companyDescription: company.description,
        description: jobDescriptions[Math.floor(Math.random() * jobDescriptions.length)],
        status,
        appliedDate: appliedDate.toISOString(),
        lastUpdated: new Date().toISOString(),
        matchScore: Math.floor(Math.random() * 30) + 70,
        salaryRange: `$${Math.floor(Math.random() * 50) + 100}k - $${Math.floor(Math.random() * 50) + 150}k`,
        location: ['Remote', 'San Francisco, CA', 'New York, NY', 'Austin, TX'][Math.floor(Math.random() * 4)],
        jobType: ['Full-time', 'Contract', 'Remote'][Math.floor(Math.random() * 3)],
        experienceLevel: ['Mid Level', 'Senior', 'Lead'][Math.floor(Math.random() * 3)],
        requirements: requirements.slice(0, Math.floor(Math.random() * 5) + 3),
        benefits: benefits.slice(0, Math.floor(Math.random() * 5) + 3),
        recruiterNotes: [
          'Resume submitted and confirmed',
          'HR screening completed successfully',
          'Technical interview scheduled for next week',
          'Awaiting feedback from hiring manager',
          'Strong candidate fit based on experience',
          'Preparing for final interview round',
          'Position requires relocation assistance',
          'Bonus structure available upon offer'
        ][Math.floor(Math.random() * 8)],
        applicationDeadline: new Date(Date.now() + (Math.floor(Math.random() * 30) + 7) * 24 * 60 * 60 * 1000).toISOString(),
        interviewProcess: ['Phone Screen → Technical Interview → On-site → Offer', 
                         'HR Call → Take-home Assignment → Team Interview → Decision',
                         'Initial Screening → Coding Challenge → System Design → Final Round'][Math.floor(Math.random() * 3)]
      })
    }
    
    return jobs.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
  }

  const loadCandidateResumes = (candidateId) => {
    try {
      const sharedResumes = JSON.parse(localStorage.getItem('candidate_resumes') || '{}')
      const candidateResume = sharedResumes[candidateId]
      
      if (candidateResume) {
        return candidateResume
      }
      
      if (candidate?.assignedRecruiter) {
        const recruiterResumes = JSON.parse(localStorage.getItem(`recruiter_resumes_${candidate.assignedRecruiter}`) || '{}')
        return recruiterResumes[candidateId] || null
      }
      
      return null
    } catch (error) {
      console.error('Error loading candidate resume:', error)
      return null
    }
  }

  const loadCandidateApplications = (candidateId, candidateData, recruiterData, jobs) => {
    try {
      const savedApps = localStorage.getItem(`applications_${candidateId}`)
      if (savedApps) return JSON.parse(savedApps)
      
      const candidateResume = loadCandidateResumes(candidateId)
      
      const applications = jobs.map((job, index) => ({
        id: `app_${candidateId}_${index}`,
        application_id: `APP-${Date.now().toString().slice(-6)}-${index.toString().padStart(3, '0')}`,
        job_id: job.id,
        job_title: job.jobTitle,
        company_name: job.company,
        resume_used: candidateResume ? candidateResume.name || candidateResume.title || `Resume_${candidateData.firstName}_${candidateData.lastName}.pdf` : `Resume_${candidateData.firstName}_${candidateData.lastName}.pdf`,
        resume_data: candidateResume,
        status: getApplicationStatusFromJob(job.status),
        applied_date: job.appliedDate || new Date().toISOString(),
        last_updated: new Date().toISOString(),
        recruiter_id: recruiterData?.id,
        recruiter_name: recruiterData?.name,
        job_description: job.description,
        job_details: job, // Store full job details here
        match_score: job.matchScore,
        salary_range: job.salaryRange,
        location: job.location,
        job_type: job.jobType,
        experience_level: job.experienceLevel,
        requirements: job.requirements,
        benefits: job.benefits,
        notes: job.recruiterNotes,
        application_deadline: job.applicationDeadline,
        interview_process: job.interviewProcess
      }))
      
      localStorage.setItem(`applications_${candidateId}`, JSON.stringify(applications))
      return applications
    } catch (error) {
      console.error('Error loading applications:', error)
      return []
    }
  }

  const viewResume = (resumeData) => {
    if (!resumeData) {
      alert('Your professional resume is being prepared by your career advisor. Check back soon!')
      return
    }

    const resumeWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
    
    const resumeContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Professional Resume - ${candidate?.firstName} ${candidate?.lastName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #1e293b;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }
          .resume-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 50px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
          }
          .resume-header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 30px;
            margin-bottom: 40px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 40px;
            border-radius: 15px;
            margin: -30px -30px 30px -30px;
          }
          h1 {
            font-size: 42px;
            font-weight: 800;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          h2 {
            color: #1e40af;
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
            margin-top: 35px;
            font-size: 22px;
            font-weight: 700;
          }
          .contact-info {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 15px;
          }
          .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            opacity: 0.9;
          }
          .section {
            margin-bottom: 30px;
            padding-bottom: 25px;
            border-bottom: 1px solid #e2e8f0;
          }
          .meta-info {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 20px;
            border-radius: 12px;
            font-size: 15px;
            margin-bottom: 30px;
            border: 1px solid #bae6fd;
          }
          .watermark {
            position: fixed;
            opacity: 0.03;
            font-size: 120px;
            font-weight: 900;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            color: #3b82f6;
            pointer-events: none;
            z-index: -1;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: transform 0.2s;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .print-btn:hover {
            transform: translateY(-2px);
          }
          .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
          }
          .skill-tag {
            background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            border: 1px solid #bfdbfe;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">📄 Print Resume</button>
        
        <div class="watermark">INFRAPILOT</div>
        
        <div class="resume-container">
          <div class="resume-header">
            <h1>${candidate?.fullName || `${candidate?.firstName} ${candidate?.lastName}`}</h1>
            <div class="contact-info">
              ${candidate?.email ? `<div class="contact-item">📧 ${candidate.email}</div>` : ''}
              ${candidate?.phone ? `<div class="contact-item">📱 ${candidate.phone}</div>` : ''}
              ${candidate?.location ? `<div class="contact-item">📍 ${candidate.location}</div>` : ''}
              ${candidate?.linkedin ? `<div class="contact-item">🔗 ${candidate.linkedin}</div>` : ''}
              ${candidate?.portfolio ? `<div class="contact-item">🌐 ${candidate.portfolio}</div>` : ''}
            </div>
          </div>

          <div class="meta-info">
            <strong>📋 Professional Resume</strong><br>
            • Prepared by: ${resumeData.recruiter_name || 'Career Advisor'}<br>
            • Created on: ${new Date(resumeData.created_at || Date.now()).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
            • Status: Active • Updated regularly<br>
            • Optimized for ATS and human review
          </div>

          ${resumeData.sections ? resumeData.sections.map(section => `
            <div class="section">
              <h2>${(section.title || 'Section').toUpperCase()}</h2>
              <div>${section.content || section.text || 'Content not available'}</div>
            </div>
          `).join('') : `
            <div class="section">
              <h2>PROFESSIONAL PROFILE</h2>
              <p style="font-size: 16px; line-height: 1.7;">${candidate?.summary || candidate?.about || 'Results-driven professional with a proven track record of success in dynamic environments. Passionate about innovation and continuous improvement.'}</p>
            </div>
            <div class="section">
              <h2>TECHNICAL SKILLS</h2>
              <div class="skills-list">
                ${(Array.isArray(candidate?.skills) ? candidate.skills : (candidate?.skills || 'JavaScript, React, Node.js, Python, AWS, Docker, Git, Agile').split(','))
                  .map(skill => `<span class="skill-tag">${skill.trim()}</span>`).join('')}
              </div>
            </div>
            <div class="section">
              <h2>CAREER OBJECTIVE</h2>
              <p style="font-size: 16px;">Seeking a challenging role in a forward-thinking organization where I can leverage my technical expertise and problem-solving skills to drive innovation and contribute to meaningful projects.</p>
            </div>
          `}

          <div class="footer">
            <p>Generated by Infrapilot Career Platform • Resume ID: ${resumeData.id || 'PROFESSIONAL'}</p>
            <p style="margin-top: 10px; font-size: 12px;">🔒 Confidential Document • For Professional Use Only</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    resumeWindow.document.write(resumeContent)
    resumeWindow.document.close()
  }

  const getApplicationStatusFromJob = (jobStatus) => {
    const statusMap = {
      'Applied': 'pending',
      'Under Review': 'reviewed',
      'Interview': 'shortlisted',
      'Offer': 'accepted',
      'Rejected': 'rejected'
    }
    return statusMap[jobStatus] || 'pending'
  }

  const getApplicationStatusColor = (status) => {
    const colors = {
      'pending': 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200',
      'reviewed': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200',
      'shortlisted': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200',
      'accepted': 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200',
      'rejected': 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 border border-rose-200'
    }
    return colors[status] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
  }

  const getApplicationStatusText = (status) => {
    const texts = {
      'pending': 'Application Submitted',
      'reviewed': 'Under Review',
      'shortlisted': 'Interview Stage',
      'accepted': 'Offer Received',
      'rejected': 'Not Selected'
    }
    return texts[status] || status
  }

  const getStatusColor = (status) => {
    const colors = {
      'Applied': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200',
      'Under Review': 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200',
      'Interview': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200',
      'Offer': 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200',
      'Rejected': 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 border border-rose-200'
    }
    return colors[status] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
  }

  const calculateStats = (jobs) => {
    setStats({
      totalJobs: jobs.length,
      applied: jobs.filter(j => j.status === 'Applied').length,
      interviews: jobs.filter(j => j.status === 'Interview').length,
      offers: jobs.filter(j => j.status === 'Offer').length,
      rejected: jobs.filter(j => j.status === 'Rejected').length
    })
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    
    const message = {
      id: `msg_${Date.now()}`,
      sender: 'candidate',
      senderName: candidate.firstName,
      text: newMessage,
      time: new Date().toISOString()
    }
    
    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    setNewMessage('')
    
    localStorage.setItem(`messages_${candidate.id}`, JSON.stringify(updatedMessages))
    
    setTimeout(() => {
      const responses = [
        "Thanks for your message! I'll review this and get back to you shortly.",
        "Great question! I'll look into that and provide you with details.",
        "Noted. I'll update your application status accordingly.",
        "Perfect timing! I was just reviewing your profile for new opportunities.",
        "I appreciate you reaching out. Let me check on this for you."
      ]
      
      const response = {
        id: `msg_${Date.now()}_resp`,
        sender: 'recruiter',
        senderName: recruiter?.name || 'Career Advisor',
        text: responses[Math.floor(Math.random() * responses.length)],
        time: new Date().toISOString()
      }
      
      const withResponse = [...updatedMessages, response]
      setMessages(withResponse)
      localStorage.setItem(`messages_${candidate.id}`, JSON.stringify(withResponse))
    }, 1500)
  }

  const updateProfile = () => {
    const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')
    const updatedCandidates = candidates.map(c => {
      if (c.id === candidate.id) {
        return {
          ...c,
          phone: profileForm.phone,
          location: profileForm.location,
          summary: profileForm.summary,
          about: profileForm.summary,
          skills: profileForm.skills.split(',').map(s => s.trim()).filter(s => s),
          linkedin: profileForm.linkedin,
          portfolio: profileForm.portfolio,
          updatedAt: new Date().toISOString()
        }
      }
      return c
    })
    
    localStorage.setItem('infrapilot_candidates', JSON.stringify(updatedCandidates))
    setCandidate(updatedCandidates.find(c => c.id === candidate.id))
    
    // Show success notification
    setNotifications(prev => [
      {
        id: Date.now(),
        text: "Your profile has been updated successfully",
        time: "Just now",
        read: false
      },
      ...prev
    ])
  }

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('candidate_authenticated')
    localStorage.removeItem('candidate_id')
    router.push('/candidate/login')
  }

  const getRecruiterStatus = () => {
    if (!recruiter) return 'Not Assigned'
    return recruiter.status === 'active' ? 'Active' : 'Inactive'
  }

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          {/* Logo Container with your logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl shadow-blue-200/50 mb-4 mx-auto border-4 border-white">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse flex items-center justify-center">
                <span className="text-white text-xs font-bold">IP</span>
              </div>
            </div>
            <div className="ml-4 text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Infrapilot
              </h1>
              <p className="text-sm text-blue-600 font-medium tracking-wider">CAREER PLATFORM</p>
            </div>
          </div>
          <div className="w-20 h-20 border-[5px] border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-lg font-medium text-slate-700">Loading your career dashboard...</p>
          <p className="text-sm text-slate-500 mt-2">Preparing your personalized experience</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo with your image */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-200 border-2 border-white">
                  <Image
                    src="/logo.jpeg"
                    alt="Infrapilot Logo"
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Infrapilot Career
                </h1>
                <p className="text-xs text-blue-600 font-medium tracking-wider">Professional Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {[
                { id: 'jobs', icon: '📋', label: 'Jobs' },
                { id: 'applications', icon: '📄', label: 'Applications' },
                { id: 'messages', icon: '💬', label: 'Messages' },
                { id: 'profile', icon: '👤', label: 'Profile' },
                { id: 'recruiter', icon: '👔', label: 'Advisor' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative group">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
                  <span className="text-xl">🔔</span>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <h4 className="font-bold text-slate-800 mb-3">Notifications</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.slice(0, 3).map((note) => (
                      <div 
                        key={note.id} 
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${note.read ? 'bg-slate-50' : 'bg-blue-50 border border-blue-100'}`}
                        onClick={() => markNotificationAsRead(note.id)}
                      >
                        <p className="text-sm text-slate-700">{note.text}</p>
                        <p className="text-xs text-slate-500 mt-1">{note.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-800">
                  {candidate.firstName} {candidate.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {candidate.subscriptionPlan ? `${candidate.subscriptionPlan} Plan` : 'Career Starter'}
                </p>
              </div>

              {/* User Avatar */}
              <div className="relative group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center border-2 border-blue-200 cursor-pointer">
                  <span className="text-blue-700 font-bold text-lg">
                    {candidate.firstName?.[0]?.toUpperCase()}
                  </span>
                </div>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-800">{candidate.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="text-slate-500">🚪</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Welcome with Logo */}
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600"></div>
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-4 border-white/20">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                      Welcome back, {candidate.firstName}! 👋
                    </h1>
                    <p className="text-blue-100 text-lg max-w-2xl">
                      Your career journey is progressing. {recruiter ? `Your advisor ${recruiter.name} is actively working on new opportunities for you.` : 'We\'re preparing your career path.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-6">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30">
                    <p className="text-white text-sm">📅 Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                  {recruiter && (
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30">
                      <p className="text-white text-sm">👔 Advisor: {recruiter.name}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-4xl">🎯</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Applications</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{stats.totalJobs}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Applications</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{stats.applied}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Interviews</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{stats.interviews}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">🎤</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Offers</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.offers}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                <span className="text-emerald-600 text-xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">
                  {stats.totalJobs > 0 ? Math.round((stats.offers / stats.totalJobs) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 text-xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
          {[
            { id: 'jobs', icon: '📋', label: 'Jobs' },
            { id: 'applications', icon: '📄', label: 'Applications' },
            { id: 'messages', icon: '💬', label: 'Messages' },
            { id: 'profile', icon: '👤', label: 'Profile' },
            { id: 'recruiter', icon: '👔', label: 'Advisor' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">🎯 Active Job Applications</h2>
                    <p className="text-slate-600 mt-1">Track your applications being processed by your career advisor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200">
                    Updated today
                  </span>
                  <button 
                    onClick={() => setActiveTab('messages')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 text-sm font-medium"
                  >
                    Ask Advisor
                  </button>
                </div>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">No active applications yet</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Your career advisor is preparing job opportunities tailored to your skills and preferences.
                  </p>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
                  >
                    Connect with Advisor
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <div key={job.id} className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                            <span className="text-2xl">{job.companyLogo}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{job.jobTitle}</h4>
                            <p className="text-slate-600">{job.company}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                {job.location}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                {job.salaryRange}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{job.description}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-slate-600">Match Score</span>
                            <span className="text-sm font-semibold text-slate-800">{job.matchScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                job.matchScore > 85 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                job.matchScore > 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                'bg-gradient-to-r from-amber-500 to-amber-600'
                              }`}
                              style={{ width: `${job.matchScore}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                          <p className="text-sm text-blue-700">
                            <span className="font-semibold">Advisor Note:</span> {job.recruiterNotes}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-500">
                            <span>Applied: {new Date(job.appliedDate).toLocaleDateString()}</span>
                          </div>
                          <button
                            onClick={() => openJobDetails(job)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">📄 My Applications</h2>
                    <p className="text-slate-600 mt-1">Detailed view of all your submitted applications</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  <button
                    onClick={() => {
                      const candidateResume = loadCandidateResumes(candidate.id)
                      const refreshedApps = loadCandidateApplications(candidate.id, candidate, recruiter, jobs)
                      setApplications(refreshedApps)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 text-sm font-medium border border-emerald-200"
                  >
                    🔄 Refresh
                  </button>
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200">
                    {applications.length} applications
                  </span>
                </div>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">No applications found</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Your career advisor will submit applications on your behalf. Check back soon for updates.
                  </p>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
                  >
                    Contact Advisor
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <tr>
                          <th className="p-4 text-left text-sm font-semibold text-slate-700">Job Details</th>
                          <th className="p-4 text-left text-sm font-semibold text-slate-700">Resume</th>
                          <th className="p-4 text-left text-sm font-semibold text-slate-700">Status</th>
                          <th className="p-4 text-left text-sm font-semibold text-slate-700">Timeline</th>
                          <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {applications.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div>
                                <p className="font-semibold text-slate-800">{app.job_title}</p>
                                <p className="text-sm text-slate-600 mt-1">{app.company_name}</p>
                                <div className="flex gap-2 mt-2">
                                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                    Match: {app.match_score}%
                                  </span>
                                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                    {app.salary_range}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-sm text-slate-800 mb-2">{app.resume_used}</p>
                                <button
                                  onClick={() => viewResume(app.resume_data)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
                                >
                                  <span className="text-lg">📄</span>
                                  View Resume
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-2">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${getApplicationStatusColor(app.status)}`}>
                                  {getApplicationStatusText(app.status)}
                                </span>
                                {app.recruiter_name && (
                                  <p className="text-xs text-slate-500">
                                    By: {app.recruiter_name}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="text-sm text-slate-800">
                                  Applied: {new Date(app.applied_date).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {Math.floor((Date.now() - new Date(app.applied_date).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openJobDetails(app.job_details)}
                                  className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 text-sm font-medium border border-blue-200"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => setActiveTab('messages')}
                                  className="px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 rounded-lg hover:from-slate-100 hover:to-slate-200 transition-all duration-200 text-sm font-medium border border-slate-200"
                                >
                                  Ask
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Section */}
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <h4 className="text-xl font-bold text-slate-800 mb-6">Application Analytics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { status: 'pending', label: 'Submitted', count: applications.filter(a => a.status === 'pending').length, color: 'from-amber-50 to-amber-100', text: 'text-amber-700' },
                        { status: 'reviewed', label: 'Under Review', count: applications.filter(a => a.status === 'reviewed').length, color: 'from-blue-50 to-blue-100', text: 'text-blue-700' },
                        { status: 'shortlisted', label: 'Interviewing', count: applications.filter(a => a.status === 'shortlisted').length, color: 'from-purple-50 to-purple-100', text: 'text-purple-700' },
                        { status: 'accepted', label: 'Offers', count: applications.filter(a => a.status === 'accepted').length, color: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700' },
                        { status: 'rejected', label: 'Not Selected', count: applications.filter(a => a.status === 'rejected').length, color: 'from-rose-50 to-rose-100', text: 'text-rose-700' }
                      ].map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} p-4 rounded-xl border ${stat.text.replace('text-', 'border-')}200`}>
                          <p className="text-2xl font-bold ${stat.text}">{stat.count}</p>
                          <p className={`text-sm ${stat.text} font-medium`}>{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="p-6 md:p-8 h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">💬 Career Advisor Chat</h2>
                    <p className="text-slate-600 mt-1">Real-time communication with your career advisor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-xl text-sm font-medium ${
                    getRecruiterStatus() === 'Active' 
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {recruiter ? `Advisor: ${recruiter.name}` : 'No advisor assigned'}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 p-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white">
                      <Image
                        src="/logo.jpeg"
                        alt="Infrapilot Logo"
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Start a conversation</h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Begin chatting with your career advisor to discuss opportunities, ask questions, or get career advice.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-4 ${msg.sender === 'candidate' 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-sm' 
                            : 'bg-gradient-to-r from-slate-50 to-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">
                              {msg.sender === 'candidate' ? 'You' : msg.senderName}
                            </span>
                            <span className="text-xs opacity-75">
                              {new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">👤 My Profile</h2>
                    <p className="text-slate-600 mt-1">Manage your professional information</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200">
                  Candidate ID: {candidate.id.substring(0, 8)}...
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Form */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={candidate.fullName || `${candidate.firstName} ${candidate.lastName}`}
                          disabled
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={candidate.email}
                          disabled
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="City, State, Country"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Professional Summary
                        </label>
                        <textarea
                          value={profileForm.summary}
                          onChange={(e) => setProfileForm({...profileForm, summary: e.target.value})}
                          rows={4}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="Describe your professional background, skills, and career objectives..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Skills (comma separated)
                        </label>
                        <input
                          type="text"
                          value={profileForm.skills}
                          onChange={(e) => setProfileForm({...profileForm, skills: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="JavaScript, React, Node.js, Python, AWS, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          LinkedIn Profile
                        </label>
                        <input
                          type="url"
                          value={profileForm.linkedin}
                          onChange={(e) => setProfileForm({...profileForm, linkedin: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Portfolio/GitHub
                        </label>
                        <input
                          type="url"
                          value={profileForm.portfolio}
                          onChange={(e) => setProfileForm({...profileForm, portfolio: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                          placeholder="https://github.com/yourusername"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setProfileForm({
                              phone: candidate.phone || '',
                              location: candidate.location || '',
                              summary: candidate.summary || candidate.about || '',
                              skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills || '',
                              linkedin: candidate.linkedin || '',
                              portfolio: candidate.portfolio || ''
                            })
                          }}
                          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                        >
                          Reset
                        </button>
                        <button
                          onClick={updateProfile}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Info Sidebar */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-300">
                        <Image
                          src="/logo.jpeg"
                          alt="Infrapilot Logo"
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-800">Account Overview</h4>
                        <p className="text-xs text-blue-600">Infrapilot Career Platform</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-blue-700">Subscription Plan</p>
                        <p className="text-xl font-bold text-blue-900">{candidate.subscriptionPlan || 'Career Starter'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">Account Status</p>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          candidate.subscriptionStatus === 'active' 
                            ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {candidate.subscriptionStatus === 'active' ? '✅ Active' : '⏸️ Paused'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">Member Since</p>
                        <p className="font-medium text-blue-900">
                          {new Date(candidate.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700">Last Updated</p>
                        <p className="font-medium text-blue-900">
                          {new Date(candidate.updatedAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h4 className="font-bold text-slate-800 mb-4">Quick Stats</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total Applications</span>
                        <span className="font-semibold text-slate-800">{stats.totalJobs}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Success Rate</span>
                        <span className="font-semibold text-emerald-600">
                          {stats.totalJobs > 0 ? Math.round((stats.offers / stats.totalJobs) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Response Rate</span>
                        <span className="font-semibold text-blue-600">
                          {stats.totalJobs > 0 ? Math.round(((stats.interviews + stats.offers) / stats.totalJobs) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Avg. Match Score</span>
                        <span className="font-semibold text-purple-600">
                          {jobs.length > 0 ? Math.round(jobs.reduce((sum, job) => sum + job.matchScore, 0) / jobs.length) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recruiter Tab */}
          {activeTab === 'recruiter' && recruiter && (
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">👔 Your Career Advisor</h2>
                    <p className="text-slate-600 mt-1">Your dedicated professional career guide</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  recruiter.status === 'active' 
                    ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {recruiter.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Advisor Profile */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8">
                      <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/30 overflow-hidden">
                          <Image
                            src="/logo.jpeg"
                            alt="Infrapilot Logo"
                            width={80}
                            height={80}
                            className="object-cover w-full h-full opacity-30"
                          />
                          <span className="absolute text-white text-3xl font-bold">
                            {recruiter.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">{recruiter.name}</h3>
                          <p className="text-blue-100 text-lg">{recruiter.department}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">
                              {recruiter.specialization}
                            </span>
                            <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-sm">
                              {recruiter.experience || '5+ years'} experience
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8">
                      <h4 className="text-lg font-bold text-slate-800 mb-4">About Your Advisor</h4>
                      <p className="text-slate-600 mb-6">
                        {recruiter.bio || `${recruiter.name} is your dedicated career advisor with expertise in ${recruiter.specialization || 'technology recruitment'}. With ${recruiter.experience || '5+ years'} of experience, they specialize in matching top talent with leading companies.`}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 text-lg">📧</span>
                            </div>
                            <div>
                              <p className="text-sm text-blue-700">Email</p>
                              <p className="font-semibold text-blue-900">{recruiter.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-50 rounded-xl p-4 border border-purple-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                              <span className="text-purple-600 text-lg">📞</span>
                            </div>
                            <div>
                              <p className="text-sm text-purple-700">Phone</p>
                              <p className="font-semibold text-purple-900">{recruiter.phone || 'Available on request'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className="text-lg font-bold text-slate-800 mb-4">Advisor Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          '🎯 Career Strategy',
                          '📝 Resume Optimization',
                          '🎤 Interview Coaching',
                          '💼 Job Market Insights',
                          '📊 Career Progression',
                          '🤝 Networking Guidance',
                          '💰 Salary Negotiation',
                          '📈 Performance Review'
                        ].map((specialty, index) => (
                          <span key={index} className="px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 rounded-lg text-sm border border-slate-200">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance & Actions */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-blue-100">
                        <Image
                          src="/logo.jpeg"
                          alt="Infrapilot Logo"
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <h4 className="font-bold text-slate-800">Performance Metrics</h4>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-600">Response Time</span>
                          <span className="text-sm font-semibold text-slate-800">&lt; 4 hours</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-600">Job Match Quality</span>
                          <span className="text-sm font-semibold text-slate-800">92%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-600">Client Satisfaction</span>
                          <span className="text-sm font-semibold text-slate-800">4.9/5</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: '98%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h4 className="font-bold text-slate-800 mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('messages')}
                        className="w-full p-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200 flex items-center justify-center gap-3"
                      >
                        <span className="text-lg">💬</span>
                        Send Message
                      </button>
                      <button
                        onClick={() => window.open(`mailto:${recruiter.email}`, '_blank')}
                        className="w-full p-3 bg-gradient-to-r from-emerald-50 to-emerald-50 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-emerald-100 transition-all duration-200 border border-emerald-200 flex items-center justify-center gap-3"
                      >
                        <span className="text-lg">📧</span>
                        Send Email
                      </button>
                      <button
                        onClick={() => window.open('tel:' + (recruiter.phone || ''), '_blank')}
                        disabled={!recruiter.phone}
                        className={`w-full p-3 rounded-xl border flex items-center justify-center gap-3 transition-all duration-200 ${
                          recruiter.phone
                            ? 'bg-gradient-to-r from-purple-50 to-purple-50 text-purple-700 hover:from-purple-100 hover:to-purple-100 border-purple-200'
                            : 'bg-gradient-to-r from-slate-50 to-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-lg">📞</span>
                        Schedule Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Recruiter State */}
          {activeTab === 'recruiter' && !recruiter && (
            <div className="p-8 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">No Career Advisor Assigned Yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                We're carefully matching you with the perfect career advisor based on your profile and career goals. This usually takes 24-48 hours.
              </p>
              <button
                onClick={() => setActiveTab('messages')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
              >
                Check Messages
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Logo"
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Job Application Details</h3>
                    <p className="text-blue-100">Complete overview of the job and your application</p>
                  </div>
                </div>
                <button
                  onClick={closeJobDetails}
                  className="text-white hover:text-blue-100 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Job Header */}
              <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border-2 border-blue-200">
                  <span className="text-3xl">{selectedJob.companyLogo}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-slate-800 mb-2">{selectedJob.jobTitle}</h4>
                  <p className="text-xl text-slate-600 mb-3">{selectedJob.company}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                      {selectedJob.location}
                    </span>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
                      {selectedJob.jobType}
                    </span>
                    <span className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-200">
                      {selectedJob.experienceLevel}
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor(selectedJob.status)}`}>
                      Status: {selectedJob.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">{selectedJob.salaryRange}</p>
                  <p className="text-sm text-slate-600">Annual Salary</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Job Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Company Overview */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">🏢</span>
                      Company Overview
                    </h5>
                    <p className="text-slate-600">{selectedJob.companyDescription}</p>
                  </div>

                  {/* Job Description */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">📋</span>
                      Job Description
                    </h5>
                    <p className="text-slate-600 mb-4">{selectedJob.description}</p>
                    
                    <h6 className="font-bold text-slate-700 mb-3">Key Responsibilities:</h6>
                    <ul className="space-y-2 mb-6">
                      {[
                        'Develop and maintain high-quality software solutions',
                        'Collaborate with cross-functional teams',
                        'Participate in code reviews and technical discussions',
                        'Write clean, maintainable, and efficient code',
                        'Troubleshoot and debug applications',
                        'Stay updated with emerging technologies'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-emerald-500 mr-2 mt-1">•</span>
                          <span className="text-slate-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">🎯</span>
                      Requirements & Qualifications
                    </h5>
                    <ul className="space-y-3">
                      {selectedJob.requirements && selectedJob.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-3 mt-1">✓</span>
                          <span className="text-slate-600">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column - Application Info */}
                <div className="space-y-6">
                  {/* Application Status */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">📊</span>
                      Application Status
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-600">Match Score</span>
                          <span className="text-sm font-semibold text-slate-800">{selectedJob.matchScore}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              selectedJob.matchScore > 85 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                              selectedJob.matchScore > 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                              'bg-gradient-to-r from-amber-500 to-amber-600'
                            }`}
                            style={{ width: `${selectedJob.matchScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Applied Date</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {new Date(selectedJob.appliedDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Last Updated</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {new Date(selectedJob.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                        {selectedJob.applicationDeadline && (
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-600">Application Deadline</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {new Date(selectedJob.applicationDeadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">🌟</span>
                      Benefits & Perks
                    </h5>
                    <div className="space-y-2">
                      {selectedJob.benefits && selectedJob.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-emerald-500">✓</span>
                          <span className="text-sm text-slate-600">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interview Process */}
                  <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-6">
                    <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="text-blue-600">🎤</span>
                      Interview Process
                    </h5>
                    <p className="text-slate-600 text-sm">{selectedJob.interviewProcess}</p>
                  </div>

                  {/* Advisor Notes */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-blue-300">
                        <Image
                          src="/logo.jpeg"
                          alt="Infrapilot Logo"
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <h5 className="text-lg font-bold text-blue-800">Advisor Notes</h5>
                    </div>
                    <p className="text-blue-700">{selectedJob.recruiterNotes}</p>
                    {recruiter && (
                      <p className="text-sm text-blue-600 mt-3">
                        — {recruiter.name}, Career Advisor
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        closeJobDetails()
                        setActiveTab('messages')
                      }}
                      className="w-full p-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
                    >
                      💬 Ask Advisor About This Job
                    </button>
                    <button
                      onClick={() => {
                        // Save job details
                        const savedJobs = JSON.parse(localStorage.getItem('saved_jobs') || '[]')
                        if (!savedJobs.find(job => job.id === selectedJob.id)) {
                          savedJobs.push(selectedJob)
                          localStorage.setItem('saved_jobs', JSON.stringify(savedJobs))
                          alert('Job saved to your favorites!')
                        }
                      }}
                      className="w-full p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 border border-emerald-200 font-medium"
                    >
                      💾 Save Job Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Infrapilot Career Platform</p>
                <p className="text-xs text-slate-500">Professional career acceleration</p>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-xs text-slate-500">
                © 2024 Infrapilot Tech. All rights reserved.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Version 2.1 • Secure Career Portal
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="relative w-16 h-8">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={64}
                  height={32}
                  className="object-contain w-full h-full"
                />
              </div>
              <p className="text-xs text-slate-500">
                Need assistance? Contact support@infrapilot.tech • (888) 123-4567
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}