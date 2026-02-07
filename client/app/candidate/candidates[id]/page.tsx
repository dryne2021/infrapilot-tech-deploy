'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Briefcase,
  Calendar,
  Clock,
  Download,
  Link as LinkIcon,
  Copy,
  Edit,
  Trash2,
  Sparkles,
  Shield,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Printer,
  Share2,
  Eye,
  FilePlus,
  Settings
} from 'lucide-react'

interface JobApplication {
  id: string
  jobId: string
  jobDescription: string
  resumeStatus: 'Generated' | 'Pending' | 'Failed'
  createdAt: string
  resumeUrl?: string
  company?: string
  matchScore?: number
}

interface Candidate {
  id: string
  fullName: string
  email: string
  phone: string
  jobRole: string
  subscriptionType: 'Free' | 'Silver' | 'Gold' | 'Platinum' | 'Enterprise'
  subscriptionExpiry: string
  status: 'Active' | 'Inactive' | 'On Hold'
  location?: string
  experience?: string
  skills?: string[]
  notes?: string
  assignedDate: string
}

export default function CandidateDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [newJob, setNewJob] = useState({
    jobId: '',
    jobDescription: ''
  })

  useEffect(() => {
    // Simulate loading candidate data
    setTimeout(() => {
      // Mock candidate data - in real app, fetch from API using params.id
      const mockCandidate: Candidate = {
        id: params.id as string,
        fullName: 'Vikram Reddy Konatham',
        email: 'Vikramreddykonatham1@gmail.com',
        phone: '2177908637',
        jobRole: 'Network Engineer',
        subscriptionType: 'Gold',
        subscriptionExpiry: 'Feb 20, 2026, 12:00:00 AM',
        status: 'Active',
        location: 'Chicago, IL',
        experience: '5+ years',
        skills: ['Cisco Networking', 'AWS', 'Security', 'Linux', 'Python'],
        notes: 'Looking for remote positions only. Strong background in network security.',
        assignedDate: 'Jan 15, 2026'
      }

      // Mock job applications
      const mockApplications: JobApplication[] = [
        {
          id: '1',
          jobId: 'https://www.google.com/search?q=DC+Ops+Engg+Network+Engineer',
          jobDescription: 'Job description DC Ops Engg with Networking Location: Remote, Salary: $120k',
          resumeStatus: 'Generated',
          createdAt: '01/24/2026, 02:58:46 AM',
          company: 'Tech Corp',
          matchScore: 92
        },
        {
          id: '2',
          jobId: 'https://www.linkedin.com/jobs/view/network-engineer-l3harris',
          jobDescription: 'About The Company L3Harris Technologies is a global aerospace and defense company.',
          resumeStatus: 'Generated',
          createdAt: '01/20/2026, 07:16:49 PM',
          company: 'L3Harris Technologies',
          matchScore: 88
        },
        {
          id: '3',
          jobId: 'https://www.linkedin.com/jobs/view/healthcare-network-engineer',
          jobDescription: 'Overview A large healthcare organization is seeking a Network Engineer for their IT team.',
          resumeStatus: 'Generated',
          createdAt: '01/20/2026, 07:00:20 PM',
          company: 'Healthcare Systems Inc',
          matchScore: 85
        }
      ]

      setCandidate(mockCandidate)
      setJobApplications(mockApplications)
      setLoading(false)
    }, 500)
  }, [params.id])

  const handleGenerateResume = () => {
    if (!newJob.jobId || !newJob.jobDescription) {
      alert('Please fill in both Job ID and Job Description')
      return
    }

    const newApplication: JobApplication = {
      id: Date.now().toString(),
      jobId: newJob.jobId,
      jobDescription: newJob.jobDescription,
      resumeStatus: 'Generated',
      createdAt: new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      company: 'New Company',
      matchScore: Math.floor(Math.random() * 20) + 75
    }

    setJobApplications([newApplication, ...jobApplications])
    setNewJob({ jobId: '', jobDescription: '' })
    
    // Show success toast
    alert('✅ Resume generated successfully!')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const deleteApplication = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job application?')) {
      setJobApplications(jobApplications.filter(app => app.id !== id))
      alert('Application deleted successfully!')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Generated': return 'bg-green-100 text-green-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Platinum': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Silver': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'Enterprise': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading candidate details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Candidates</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900"># Infrapilot Tech</h1>
                <p className="text-gray-600 text-sm mt-1">Job Application Support Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Candidate Job Applications</h2>
              <p className="text-gray-600 mt-2">Manage Job Applications and Generate Resumes</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Printer size={18} />
                Print
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Share2 size={18} />
                Share
              </button>
            </div>
          </div>

          {/* Candidate Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Personal Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">FULL NAME</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{candidate?.fullName}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">EMAIL ADDRESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-700">{candidate?.email}</p>
                    <button
                      onClick={() => copyToClipboard(candidate?.email || '')}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy email"
                    >
                      <Copy size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">PHONE NUMBER</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-700">{candidate?.phone}</p>
                    <button
                      onClick={() => copyToClipboard(candidate?.phone || '')}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy phone"
                    >
                      <Copy size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">JOB ROLE</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{candidate?.jobRole}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">SUBSCRIPTION TYPE</span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg border text-sm font-medium ${getSubscriptionColor(candidate?.subscriptionType || '')}`}>
                    {candidate?.subscriptionType}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">SUBSCRIPTION EXPIRY DATE</span>
                  </div>
                  <p className="text-gray-700">{candidate?.subscriptionExpiry}</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">STATUS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${candidate?.status === 'Active' ? 'bg-green-500' : candidate?.status === 'On Hold' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{candidate?.status}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">ASSIGNED DATE</span>
                  </div>
                  <p className="text-gray-700">{candidate?.assignedDate}</p>
                </div>

                {candidate?.location && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={18} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">LOCATION</span>
                    </div>
                    <p className="text-gray-700">{candidate.location}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Section */}
            {candidate?.skills && candidate.skills.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">SKILLS</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {candidate?.notes && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">NOTES</span>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{candidate.notes}</p>
              </div>
            )}
          </div>

          {/* Generate Resume Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FilePlus size={24} className="text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Generate Resume</h3>
            </div>

            <div className="space-y-6 max-w-2xl">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-gray-700">Job ID *</span>
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <input
                  type="text"
                  placeholder="Enter job URL or job ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={newJob.jobId}
                  onChange={(e) => setNewJob({ ...newJob, jobId: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-gray-700">Job Description *</span>
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <textarea
                  placeholder="Paste the job description here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-40 resize-none"
                  value={newJob.jobDescription}
                  onChange={(e) => setNewJob({ ...newJob, jobDescription: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleGenerateResume}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Sparkles size={18} />
                  Generate Resume
                </button>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Download size={18} />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Job Applications Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Briefcase size={24} className="text-blue-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Job Applications</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {jobApplications.length} applications found
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Sorted by: <span className="font-semibold text-gray-700">Most Recent</span>
                </div>
              </div>
            </div>

            {jobApplications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No job applications yet</h3>
                <p className="text-gray-500">Generate the first resume using the form above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Job ID
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Job Description
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Resume Status
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {jobApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-8 py-4">
                          <div className="max-w-xs">
                            <div className="flex items-center gap-2">
                              <LinkIcon size={14} className="text-gray-400" />
                              <a
                                href={application.jobId}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                title={application.jobId}
                              >
                                {application.jobId.substring(0, 40)}...
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="max-w-md">
                            <p className="font-medium text-gray-900 mb-1">
                              {application.company}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {application.jobDescription}
                            </p>
                            {application.matchScore && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="text-xs font-medium">Match:</div>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${application.matchScore > 90 ? 'bg-green-500' : application.matchScore > 80 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                    style={{ width: `${application.matchScore}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold">{application.matchScore}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="text-gray-700">
                            {application.company || 'N/A'}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.resumeStatus)}`}>
                              {application.resumeStatus}
                            </div>
                            {application.resumeStatus === 'Generated' && (
                              <CheckCircle size={16} className="text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="space-y-1">
                            <div className="text-gray-700">{application.createdAt.split(',')[0]}</div>
                            <div className="text-xs text-gray-500">
                              {application.createdAt.split(',')[1]}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <a
                              href={application.jobId}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Job"
                            >
                              <Eye size={18} className="text-blue-600" />
                            </a>
                            <button
                              onClick={() => copyToClipboard(application.jobId)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copy Job Link"
                            >
                              <Copy size={18} className="text-gray-600" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Download size={18} className="text-green-600" />
                            </button>
                            <button
                              onClick={() => deleteApplication(application.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Application"
                            >
                              <Trash2 size={18} className="text-red-600" />
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

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <p className="text-gray-600">© 2026 Infrapilot Tech</p>
                <p className="text-gray-500 text-sm mt-1">
                  Powered by <a href="#" className="text-blue-600 hover:underline">Infrapilot Technologies</a>
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6">
                <a href="#" className="text-gray-600 hover:text-blue-600">About</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Privacy</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Terms</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Help</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Contact</a>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={16} className="text-gray-400" />
                  <span>Support@infrapilot.com</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} className="text-gray-400" />
                  <span>+1 (555) 123-4567 • +1 (555) 987-6543</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-4">
                Need immediate assistance? Contact our support team 24/7
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}