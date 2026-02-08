'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Panel = 'candidate' | 'recruiter' | 'admin'

/**
 * ✅ Real backend auth for ALL roles
 * POST {API_URL}/api/v1/auth/login
 * Body: { emailOrUsername: string, password: string, role }
 *
 * NOTE: Your backend currently looks up Users by EMAIL.
 * So recruiters MUST login using an email address (not "nicole").
 */
export default function LoginPage() {
  const router = useRouter()

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '' // e.g. https://infrapilot-tech-deploy.onrender.com

  const [panel, setPanel] = useState<Panel>('candidate')

  // ---------------------------
  // ADMIN
  // ---------------------------
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // ---------------------------
  // RECRUITER (EMAIL LOGIN)
  // ---------------------------
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [recruiterPassword, setRecruiterPassword] = useState('')
  const [recruiterError, setRecruiterError] = useState('')
  const [recruiterLoading, setRecruiterLoading] = useState(false)
  const [showRecruiterPassword, setShowRecruiterPassword] = useState(false)

  // ---------------------------
  // CANDIDATE
  // ---------------------------
  const [candidateUsername, setCandidateUsername] = useState('')
  const [candidatePassword, setCandidatePassword] = useState('')
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [showCandidatePassword, setShowCandidatePassword] = useState(false)

  // ---------------------------
  // Shared backend login helper
  // ---------------------------
  async function backendLogin(args: {
    emailOrUsername: string
    password: string
    role: 'admin' | 'recruiter' | 'candidate'
  }): Promise<{ success: boolean; message?: string; token?: string; user?: any }> {
    try {
      if (!API_URL) {
        return { success: false, message: 'Missing NEXT_PUBLIC_API_URL in frontend environment.' }
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: args.emailOrUsername.trim(),
          password: args.password,
          role: args.role,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        return {
          success: false,
          message: data?.message || `Login failed (${res.status})`,
        }
      }

      // Support multiple response shapes:
      // 1) { token, user }
      // 2) { success, token, user }
      // 3) { data: { token, user } }
      const token = data?.token || data?.data?.token || data?.accessToken
      const user = data?.user || data?.data?.user

      if (!token || !user) {
        return {
          success: false,
          message: 'Login response missing token/user. Check backend login response.',
        }
      }

      // ✅ Store real JWT + user
      localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('infrapilot_user', JSON.stringify(user))

      // Optional flags if your app expects them
      if (args.role === 'candidate') {
        localStorage.setItem('candidate_authenticated', 'true')
        if (user?.id || user?._id) localStorage.setItem('candidate_id', user?.id || user?._id)
      }

      if (args.role === 'recruiter') {
        localStorage.setItem('recruiter_authenticated', 'true')
        if (user?.id || user?._id) localStorage.setItem('recruiter_id', user?.id || user?._id)
      }

      return { success: true, token, user }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network error' }
    }
  }

  // ---------------------------
  // Handlers
  // ---------------------------
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)

    const result = await backendLogin({
      emailOrUsername: adminEmail,
      password: adminPassword,
      role: 'admin',
    })

    if (!result.success) {
      setAdminError(result.message || 'Invalid credentials')
      setAdminLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
    setAdminLoading(false)
  }

  const handleRecruiterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecruiterError('')
    setRecruiterLoading(true)

    // ✅ recruiters must login with email (backend searches Users by email)
    const result = await backendLogin({
      emailOrUsername: recruiterEmail,
      password: recruiterPassword,
      role: 'recruiter',
    })

    if (!result.success) {
      setRecruiterError(result.message || 'Invalid credentials')
      setRecruiterLoading(false)
      return
    }

    router.push('/recruiter')
    router.refresh()
    setRecruiterLoading(false)
  }

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCandidateError('')
    setCandidateLoading(true)

    const result = await backendLogin({
      emailOrUsername: candidateUsername,
      password: candidatePassword,
      role: 'candidate',
    })

    if (!result.success) {
      setCandidateError(result.message || 'Invalid credentials')
      setCandidateLoading(false)
      return
    }

    router.push('/candidate/dashboard')
    router.refresh()
    setCandidateLoading(false)
  }

  const handleCandidateForgotPassword = () => {
    alert('Please contact support/admin to reset your password.')
  }

  const handleRecruiterDemoLogin = (who: 'john' | 'sarah') => {
    // ✅ IMPORTANT: use REAL recruiter emails that exist in your Users collection
    if (who === 'john') {
      setRecruiterEmail('john@infrapilot.com') // <-- change to a real email in your DB
      setRecruiterPassword('password123')
    } else {
      setRecruiterEmail('sarah@infrapilot.com') // <-- change to a real email in your DB
      setRecruiterPassword('password123')
    }
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

          {!API_URL && (
            <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <p className="text-yellow-200 text-xs">
                Missing <b>NEXT_PUBLIC_API_URL</b>. Set it to your backend URL in the frontend env.
              </p>
            </div>
          )}
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
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Email or Username
                </label>
                <input
                  type="text"
                  value={candidateUsername}
                  onChange={(e) => setCandidateUsername(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email or username"
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
                disabled={candidateLoading || !API_URL}
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
                  onClick={() => alert('Please contact support/admin to get login credentials.')}
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
                <p className="text-gray-400 text-xs mt-2">Use your recruiter EMAIL + password</p>
              </div>
            )}

            <form onSubmit={handleRecruiterSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Recruiter Email
                </label>
                <input
                  type="email"
                  value={recruiterEmail}
                  onChange={(e) => setRecruiterEmail(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email (e.g. nicole@gmail.com)"
                  required
                  disabled={recruiterLoading}
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
                    disabled={recruiterLoading}
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

              <button
                type="submit"
                disabled={recruiterLoading || !API_URL}
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
                  John (Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleRecruiterDemoLogin('sarah')}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
                >
                  Sarah (Demo)
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
                  placeholder="you@company.com"
                  required
                  disabled={adminLoading}
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
                  disabled={adminLoading}
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading || !API_URL}
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
