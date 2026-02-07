'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Panel = 'candidate' | 'recruiter' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>('candidate')

  // ---------------------------
  // ADMIN (UNCHANGED logic)
  // ---------------------------
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)

    try {
      // Hardcoded admin credentials (UNCHANGED)
      const ADMIN_CREDENTIALS = {
        email: 'admin@infrapilot.com',
        password: 'Admin@123',
      }

      // Simulate API call (UNCHANGED)
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (adminEmail === ADMIN_CREDENTIALS.email && adminPassword === ADMIN_CREDENTIALS.password) {
        const adminUser = {
          id: 'admin_001',
          name: 'Administrator',
          email: ADMIN_CREDENTIALS.email,
          role: 'admin',
          isAdmin: true,
          adminAuthenticated: true,
        }

        localStorage.setItem('infrapilot_user', JSON.stringify(adminUser))
        localStorage.setItem('infrapilot_token', 'admin_auth_token')
        localStorage.setItem('admin_authenticated', 'true')

        router.push('/admin')
        router.refresh()
      } else {
        setAdminError('Invalid admin credentials')
      }
    } catch {
      setAdminError('Authentication failed')
    } finally {
      setAdminLoading(false)
    }
  }

  // ---------------------------
  // RECRUITER (UNCHANGED logic)
  // ---------------------------
  const [recruiterUsername, setRecruiterUsername] = useState('')
  const [recruiterPassword, setRecruiterPassword] = useState('')
  const [recruiterError, setRecruiterError] = useState('')
  const [recruiterLoading, setRecruiterLoading] = useState(false)
  const [showRecruiterPassword, setShowRecruiterPassword] = useState(false)

  const handleRecruiterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecruiterError('')
    setRecruiterLoading(true)

    try {
      // Get recruiters from localStorage (UNCHANGED)
      const savedRecruiters = localStorage.getItem('infrapilot_recruiters')
      if (!savedRecruiters) {
        setRecruiterError('No recruiters found in system. Contact admin.')
        setRecruiterLoading(false)
        return
      }

      const recruiters = JSON.parse(savedRecruiters)

      // Find recruiter with matching credentials (UNCHANGED)
      const recruiter = recruiters.find(
        (r: any) =>
          r.username === recruiterUsername && r.password === recruiterPassword && r.isActive
      )

      if (recruiter) {
        // Create recruiter session (UNCHANGED)
        const recruiterUser = {
          id: recruiter.id,
          name: recruiter.fullName,
          email: recruiter.email,
          role: 'recruiter',
          department: recruiter.department,
          specialization: recruiter.specialization,
          isActive: recruiter.isActive,
          recruiterAuthenticated: true,
        }

        // Store in localStorage (UNCHANGED)
        localStorage.setItem('infrapilot_user', JSON.stringify(recruiterUser))
        localStorage.setItem('infrapilot_token', `recruiter_${recruiter.id}`)
        localStorage.setItem('recruiter_authenticated', 'true')
        localStorage.setItem('recruiter_id', recruiter.id)

        // Redirect (UNCHANGED)
        router.push('/recruiter')
        router.refresh()
      } else {
        setRecruiterError('Invalid credentials or account inactive. Contact admin.')
      }
    } catch {
      setRecruiterError('Login failed. Please try again.')
    } finally {
      setRecruiterLoading(false)
    }
  }

  const handleRecruiterDemoLogin = (who: 'john' | 'sarah') => {
    if (who === 'john') {
      setRecruiterUsername('john.smith')
      setRecruiterPassword('password123')
    } else {
      setRecruiterUsername('sarah.j')
      setRecruiterPassword('password123')
    }
  }

  // ---------------------------
  // CANDIDATE (UNCHANGED logic)
  // ---------------------------
  const [candidateUsername, setCandidateUsername] = useState('')
  const [candidatePassword, setCandidatePassword] = useState('')
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [showCandidatePassword, setShowCandidatePassword] = useState(false)

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCandidateLoading(true)
    setCandidateError('')

    try {
      // Get candidates from localStorage (UNCHANGED)
      const candidates = JSON.parse(localStorage.getItem('infrapilot_candidates') || '[]')

      // Find candidate with matching credentials (UNCHANGED)
      const candidate = candidates.find(
        (c: any) => c.username === candidateUsername && c.password === candidatePassword
      )

      if (!candidate) {
        setCandidateError('Invalid username or password')
        setCandidateLoading(false)
        return
      }

      // Check if candidate is active (UNCHANGED)
      if (candidate.subscriptionStatus !== 'active' && candidate.subscriptionPlan !== 'free') {
        setCandidateError('Your account is not active. Please contact admin.')
        setCandidateLoading(false)
        return
      }

      // Create user session (UNCHANGED)
      const userData = {
        id: candidate.id,
        name: candidate.fullName || `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        role: 'candidate',
        subscriptionPlan: candidate.subscriptionPlan,
        subscriptionStatus: candidate.subscriptionStatus,
        assignedRecruiter: candidate.assignedRecruiter,
      }

      localStorage.setItem('infrapilot_user', JSON.stringify(userData))
      localStorage.setItem('infrapilot_token', `candidate_${Date.now()}`)
      localStorage.setItem('candidate_authenticated', 'true')
      localStorage.setItem('candidate_id', candidate.id)

      // Redirect (UNCHANGED)
      router.push('/candidate/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setCandidateError('Login failed. Please try again.')
    } finally {
      setCandidateLoading(false)
    }
  }

  const handleCandidateForgotPassword = () => {
    alert('Please contact your recruiter or admin to reset your password.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.jpeg"
              alt="Infrapilot Logo"
              width={80}
              height={80}
              className="object-cover"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Infrapilot Login</h1>
          <p className="text-gray-400">Select a portal to sign in</p>
        </div>

        {/* 3 Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setPanel('candidate')}
            className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
              panel === 'candidate'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
            }`}
          >
            <span className="block text-base">👤</span>
            Candidate
          </button>

          <button
            type="button"
            onClick={() => setPanel('recruiter')}
            className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
              panel === 'recruiter'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
            }`}
          >
            <span className="block text-base">👔</span>
            Recruiter
          </button>

          <button
            type="button"
            onClick={() => setPanel('admin')}
            className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
              panel === 'admin'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
            }`}
          >
            <span className="block text-base">🔐</span>
            Admin
          </button>
        </div>

        {/* ---------------- Candidate ---------------- */}
        {panel === 'candidate' && (
          <>
            {candidateError && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{candidateError}</p>
              </div>
            )}

            <form onSubmit={handleCandidateLogin} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Username</label>
                <input
                  type="text"
                  value={candidateUsername}
                  onChange={(e) => setCandidateUsername(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                  disabled={candidateLoading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showCandidatePassword ? 'text' : 'password'}
                    value={candidatePassword}
                    onChange={(e) => setCandidatePassword(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Enter your password"
                    required
                    disabled={candidateLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCandidatePassword(!showCandidatePassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showCandidatePassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <label className="ml-2 text-sm text-gray-400">Remember me</label>
                </div>
                <button
                  type="button"
                  onClick={handleCandidateForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={candidateLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {candidateLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging in...
                  </span>
                ) : (
                  'Login to Dashboard'
                )}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    alert('Please contact your recruiter or the admin team to get login credentials.')
                  }
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 text-sm"
                >
                  👔 Ask Recruiter
                </button>
                <button
                  type="button"
                  onClick={() => window.open('mailto:support@infrapilot.com', '_blank')}
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 text-sm"
                >
                  📧 Email Support
                </button>
              </div>
            </form>
          </>
        )}

        {/* ---------------- Recruiter ---------------- */}
        {panel === 'recruiter' && (
          <>
            {recruiterError && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{recruiterError}</p>
                <p className="text-gray-400 text-xs mt-2">Contact admin if you forgot your credentials</p>
              </div>
            )}

            <form onSubmit={handleRecruiterSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Username</label>
                <input
                  type="text"
                  value={recruiterUsername}
                  onChange={(e) => setRecruiterUsername(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showRecruiterPassword ? 'text' : 'password'}
                    value={recruiterPassword}
                    onChange={(e) => setRecruiterPassword(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecruiterPassword(!showRecruiterPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showRecruiterPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <label className="ml-2 text-sm text-gray-400">Remember me</label>
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300"
                  onClick={() => alert('Contact admin to reset password')}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={recruiterLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {recruiterLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging in...
                  </span>
                ) : (
                  'Login as Recruiter'
                )}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-gray-400 text-sm text-center mb-3">Demo Accounts:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRecruiterDemoLogin('john')}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
                >
                  John Smith (Tech)
                </button>
                <button
                  type="button"
                  onClick={() => handleRecruiterDemoLogin('sarah')}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
                >
                  Sarah Johnson (Finance)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ---------------- Admin ---------------- */}
        {panel === 'admin' && (
          <>
            {adminError && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{adminError}</p>
                <p className="text-gray-400 text-xs mt-2">For demo: admin@infrapilot.com / Admin@123</p>
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@infrapilot.com"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {adminLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Authenticating...
                  </span>
                ) : (
                  'Login as Administrator'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-gray-500 text-sm text-center">
                ⚠️ This portal is for authorized personnel only
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
