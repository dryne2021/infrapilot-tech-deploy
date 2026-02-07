'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CandidateAssignmentsPage() {
  const [user, setUser] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('infrapilot_user')
      
      if (!userStr) {
        router.push('/candidate/login')
        return
      }
      
      try {
        const userData = JSON.parse(userStr)
        
        if (userData.role !== 'candidate') {
          router.push('/candidate/login')
          return
        }
        
        setUser(userData)
        loadCandidateAssignments(userData.id)
        
      } catch {
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
        router.push('/candidate/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Load assignments for this candidate
  const loadCandidateAssignments = (candidateId: string) => {
    try {
      // First, check for shared resumes (created by recruiter)
      const sharedResumes = JSON.parse(localStorage.getItem('candidate_resumes') || '{}')
      
      // Filter resumes for this candidate
      const candidateResumes = Object.values(sharedResumes)
        .filter((resume: any) => resume.candidate_id === candidateId)
        .map((resume: any) => ({
          id: resume.id,
          jobTitle: resume.job_id || 'Job Application',
          company: 'Applied by Recruiter',
          jobDescription: resume.job_description || 'No description available',
          resumeText: resume.text || 'Resume content not available',
          resumeFileName: resume.name || 'Resume.docx',
          recruiterName: resume.recruiter_name || 'Your Recruiter',
          appliedDate: resume.created_at || new Date().toISOString(),
          status: 'Submitted',
          matchScore: 85
        }))
      
      // If no resumes found, check recruiter assignments
      if (candidateResumes.length === 0) {
        // Get all recruiter assignments
        const allRecruiters = ['recruiter_001', 'recruiter_002'] // Example recruiter IDs
        let allAssignments: any[] = []
        
        allRecruiters.forEach(recruiterId => {
          const recruiterAssignments = localStorage.getItem(`assignments_${recruiterId}`)
          if (recruiterAssignments) {
            const assignments = JSON.parse(recruiterAssignments)
            const myAssignments = assignments.filter((a: any) => a.candidateId === candidateId)
            allAssignments = [...allAssignments, ...myAssignments]
          }
        })
        
        if (allAssignments.length > 0) {
          setAssignments(allAssignments)
        } else {
          // Show demo data
          setAssignments(getDemoAssignments(candidateId))
        }
      } else {
        setAssignments(candidateResumes)
      }
      
    } catch (error) {
      console.error('Error loading assignments:', error)
      // Show demo data
      setAssignments(getDemoAssignments(candidateId))
    }
  }

  // Demo data for testing
  const getDemoAssignments = (candidateId: string) => {
    return [
      {
        id: 'job_1',
        jobTitle: 'Senior Frontend Developer',
        company: 'Tech Innovations Inc.',
        jobDescription: 'We are looking for an experienced Frontend Developer with 5+ years of React experience. Must have strong knowledge of TypeScript, Redux, and modern frontend tooling.',
        resumeText: `JOHN DOE
Senior Frontend Developer
john.doe@email.com | (123) 456-7890 | San Francisco, CA

PROFESSIONAL SUMMARY
Results-driven Frontend Developer with 5+ years of experience building responsive web applications using React, TypeScript, and modern JavaScript frameworks. Passionate about creating intuitive user interfaces and optimizing performance.

EXPERIENCE
Senior Frontend Developer | Tech Corp | 2020-Present
- Developed 10+ React applications used by 50,000+ monthly active users
- Improved application performance by 40% through code optimization
- Mentored 3 junior developers in React best practices

SKILLS
React, TypeScript, JavaScript, Redux, HTML5, CSS3, Git, REST APIs, Agile/Scrum`,
        resumeFileName: 'John_Doe_Frontend_Resume.docx',
        recruiterName: 'Alex Johnson',
        appliedDate: '2024-01-15T10:30:00Z',
        status: 'Under Review',
        matchScore: 92
      },
      {
        id: 'job_2',
        jobTitle: 'Full Stack Engineer',
        company: 'Digital Solutions LLC',
        jobDescription: 'Full Stack Engineer needed to work on both frontend and backend systems. Experience with Node.js, React, and cloud platforms required.',
        resumeText: `JOHN DOE
Full Stack Engineer
john.doe@email.com | (123) 456-7890 | San Francisco, CA

PROFESSIONAL SUMMARY
Full Stack Developer with expertise in both frontend (React) and backend (Node.js) development. Experience building scalable applications from concept to deployment.

EXPERIENCE
Full Stack Engineer | Web Solutions | 2018-2020
- Built and deployed 15+ full stack applications
- Reduced server costs by 30% through optimization
- Implemented CI/CD pipelines for automated deployments

SKILLS
Node.js, React, MongoDB, PostgreSQL, AWS, Docker, Express.js`,
        resumeFileName: 'John_Doe_FullStack_Resume.docx',
        recruiterName: 'Alex Johnson',
        appliedDate: '2024-01-10T14:20:00Z',
        status: 'Interview Scheduled',
        matchScore: 88
      },
      {
        id: 'job_3',
        jobTitle: 'React Developer',
        company: 'StartUp XYZ',
        jobDescription: 'Join our fast-growing startup as a React Developer. Work on innovative products in a collaborative environment.',
        resumeText: `JOHN DOE
React Developer
john.doe@email.com | (123) 456-7890 | San Francisco, CA

PROFESSIONAL SUMMARY
React Developer specializing in building modern web applications with clean, maintainable code. Experience working in agile teams and collaborating with designers.

EXPERIENCE
React Developer | FastGrowth Inc. | 2016-2018
- Developed customer-facing React applications
- Collaborated with UX designers to implement responsive designs
- Participated in code reviews and team sprints

SKILLS
React, JavaScript, CSS, Git, Jira, Agile Development`,
        resumeFileName: 'John_Doe_React_Resume.docx',
        recruiterName: 'Alex Johnson',
        appliedDate: '2024-01-05T09:15:00Z',
        status: 'Applied',
        matchScore: 85
      }
    ]
  }

  const viewAssignmentDetails = (assignment: any) => {
    setSelectedAssignment(assignment)
    setShowDetails(true)
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Applied': return 'bg-blue-100 text-blue-800 border border-blue-300'
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      case 'Interview Scheduled': return 'bg-purple-100 text-purple-800 border border-purple-300'
      case 'Offer Received': return 'bg-green-100 text-green-800 border border-green-300'
      case 'Rejected': return 'bg-red-100 text-red-800 border border-red-300'
      default: return 'bg-gray-100 text-gray-800 border border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const downloadResume = (assignment: any) => {
    const blob = new Blob([assignment.resumeText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = assignment.resumeFileName || 'resume.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLogout = () => {
    localStorage.removeItem('infrapilot_user')
    localStorage.removeItem('infrapilot_token')
    router.push('/candidate/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading your applications...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-300">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Candidate Portal</h1>
              <p className="text-blue-700 font-medium">Job Applications Submitted on Your Behalf</p>
              <p className="text-sm text-gray-600 mt-1">Welcome, {user.name || 'Candidate'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm border border-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">📋 Your Job Applications</h2>
          <p className="text-gray-700 mt-2">
            These are jobs that your recruiter has applied for on your behalf. You can view job details and the resumes used.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-300 shadow-sm">
              <p className="text-sm text-gray-700">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
            </div>
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-300 shadow-sm">
              <p className="text-sm text-gray-700">Managed by</p>
              <p className="font-medium text-blue-800">{assignments[0]?.recruiterName || 'Your Recruiter'}</p>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-300">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-700 mb-6">
              Your recruiter hasn't submitted any job applications on your behalf yet.
              Check back later or contact your recruiter for updates.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-300 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your recruiter will add job applications here once they start submitting on your behalf.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {assignments.map((assignment) => (
              <div 
                key={assignment.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-300 overflow-hidden"
              >
                <div className="p-6">
                  {/* Job Title & Company */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{assignment.jobTitle}</h3>
                    <p className="text-gray-700">{assignment.company}</p>
                  </div>

                  {/* Match Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">Match Score</span>
                      <span className="text-sm font-bold text-gray-900">{assignment.matchScore}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          assignment.matchScore > 90 ? 'bg-green-600' :
                          assignment.matchScore > 80 ? 'bg-blue-600' : 'bg-yellow-600'
                        }`}
                        style={{ width: `${assignment.matchScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Status & Date */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(assignment.appliedDate)}
                    </span>
                  </div>

                  {/* Recruiter Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Applied by:</span> {assignment.recruiterName}
                    </p>
                  </div>

                  {/* Job Description Preview */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {assignment.jobDescription}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewAssignmentDetails(assignment)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium border border-blue-700"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => downloadResume(assignment)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium border border-green-700"
                    >
                      📄
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Application Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-300">
              <p className="text-2xl font-bold text-blue-800">{assignments.length}</p>
              <p className="text-sm text-gray-700">Total Applications</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-300">
              <p className="text-2xl font-bold text-yellow-800">
                {assignments.filter(a => a.status === 'Under Review' || a.status === 'Applied').length}
              </p>
              <p className="text-sm text-gray-700">In Progress</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-300">
              <p className="text-2xl font-bold text-purple-800">
                {assignments.filter(a => a.status === 'Interview Scheduled').length}
              </p>
              <p className="text-sm text-gray-700">Interviews</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-300">
              <p className="text-2xl font-bold text-green-800">
                {assignments.filter(a => a.status === 'Offer Received').length}
              </p>
              <p className="text-sm text-gray-700">Offers</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-300">
          <h3 className="text-lg font-bold text-gray-900 mb-3">ℹ️ How This Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-800">1</span>
              </div>
              <p className="font-medium text-gray-900">Recruiter Applies</p>
              <p className="text-sm text-gray-700">Your recruiter finds suitable jobs and applies on your behalf</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-800">2</span>
              </div>
              <p className="font-medium text-gray-900">Tailored Resume</p>
              <p className="text-sm text-gray-700">They create a customized resume for each job application</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-blue-800">3</span>
              </div>
              <p className="font-medium text-gray-900">You Track Progress</p>
              <p className="text-sm text-gray-700">Monitor all applications and their status here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Details Modal */}
      {showDetails && selectedAssignment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-400">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-300 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">📋 Application Details</h3>
                  <p className="text-gray-700">{selectedAssignment.jobTitle} • {selectedAssignment.company}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-900 hover:text-gray-900 text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Job Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Job Information */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">🎯 Job Details</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Job Title</h5>
                        <p className="text-gray-900">{selectedAssignment.jobTitle}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Company</h5>
                        <p className="text-gray-900">{selectedAssignment.company}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Job Description</h5>
                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-300">
                          <p className="text-gray-900 whitespace-pre-line">{selectedAssignment.jobDescription}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Applied Date</h5>
                          <p className="text-gray-900">{formatDate(selectedAssignment.appliedDate)}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-700 mb-1">Match Score</h5>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-300 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  selectedAssignment.matchScore > 90 ? 'bg-green-600' :
                                  selectedAssignment.matchScore > 80 ? 'bg-blue-600' : 'bg-yellow-600'
                                }`}
                                style={{ width: `${selectedAssignment.matchScore}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-gray-900">{selectedAssignment.matchScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resume Used */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-gray-900">📄 Resume Used for Application</h4>
                      <button
                        onClick={() => downloadResume(selectedAssignment)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium border border-green-700"
                      >
                        Download Resume
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">
                        {selectedAssignment.resumeText}
                      </pre>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-300">
                      <p className="text-sm text-blue-900">
                        <strong>Filename:</strong> {selectedAssignment.resumeFileName}
                      </p>
                      <p className="text-sm text-blue-900 mt-1">
                        This resume was customized by your recruiter specifically for this job application.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                  {/* Application Status */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">📊 Application Status</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Current Status</h5>
                        <span className={`px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedAssignment.status)}`}>
                          {selectedAssignment.status}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Applied By</h5>
                        <p className="text-gray-900">{selectedAssignment.recruiterName}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Applied On</h5>
                        <p className="text-gray-900">{formatDate(selectedAssignment.appliedDate)}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Job ID</h5>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-900 border border-gray-400">
                          {selectedAssignment.id}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Contact Recruiter */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">📞 Contact Your Recruiter</h4>
                    <p className="text-sm text-gray-700 mb-4">
                      Have questions about this application? Contact your recruiter for updates.
                    </p>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium border border-blue-700">
                        📧 Email Recruiter
                      </button>
                      <button className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 font-medium border border-gray-400">
                        📞 Schedule Call
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">⚡ Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedAssignment.resumeText)
                          alert('Resume copied to clipboard!')
                        }}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm border border-gray-400"
                      >
                        📋 Copy Resume Text
                      </button>
                      <button className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm border border-gray-400">
                        🖨️ Print Application
                      </button>
                      <button className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm border border-gray-400">
                        📁 Save to Folder
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-6 border-t border-gray-300 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-6 py-2 border border-gray-400 text-gray-900 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadResume(selectedAssignment)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium border border-green-700"
                >
                  Download Resume (.txt)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-300">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Candidate Portal</p>
              <p className="text-xs text-gray-700">© 2024 Infrapilot Tech Solutions</p>
            </div>
          </div>
          <div className="text-xs text-gray-700 text-center md:text-right">
            <p>Need assistance? Contact your recruiter or support@infrapilot.tech</p>
            <p className="mt-1">Viewing {assignments.length} job applications</p>
          </div>
        </div>
      </div>
    </div>
  )
}