'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CandidateLogin() {
  const [username, setUsername] = useState('') // can be username OR email
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // ✅ change this if you use env var (recommended)
  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'https://infrapilot-tech-deploy.onrender.com'

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // ✅ Call backend auth/login (supports emailOrUsername)
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: username,
          password,
          role: 'candidate',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || data?.message || 'Invalid username or password')
        setLoading(false)
        return
      }

      // ✅ Support both response formats:
      // 1) { success, token, user } OR
      // 2) your generateToken util sometimes returns { success, token, data: user }
      const token = data?.token
      const user = data?.user || data?.data

      if (!token || !user) {
        console.error('Login response missing token/user:', data)
        setError('Login failed: server response invalid')
        setLoading(false)
        return
      }

      // Save session (use same keys your dashboards already use)
      localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('infrapilot_user', JSON.stringify(user))
      localStorage.setItem('candidate_authenticated', 'true')

      // ✅ fetch profile using /auth/me so dashboard has the Candidate doc too
      const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (meRes.ok) {
        const me = await meRes.json()
        // Store profile for fast dashboard load (optional)
        if (me?.profile) localStorage.setItem('infrapilot_profile', JSON.stringify(me.profile))
        // Candidate id convenience
        if (me?.profile?._id) localStorage.setItem('candidate_id', me.profile._id)
      }

      router.push('/candidate/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    alert('Please contact your recruiter or admin to reset your password.')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Left side - Brand/Info */}
      <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 text-white p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              <span className="text-3xl font-bold">IP</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Infrapilot Tech</h1>
              <p className="text-blue-100 mt-1">Candidate Career Platform</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4">Welcome Back!</h2>
              <p className="text-blue-100">
                Access your personalized career dashboard to track job applications, communicate with your recruiter,
                and manage your career progress.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mt-1">
                  <span>👔</span>
                </div>
                <div>
                  <h3 className="font-bold">Track Applications</h3>
                  <p className="text-sm text-blue-100">See all jobs being applied for by your recruiter</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mt-1">
                  <span>📊</span>
                </div>
                <div>
                  <h3 className="font-bold">Real-time Updates</h3>
                  <p className="text-sm text-blue-100">Get notified about application status changes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mt-1">
                  <span>💬</span>
                </div>
                <div>
                  <h3 className="font-bold">Direct Communication</h3>
                  <p className="text-sm text-blue-100">Chat with your assigned recruiter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Candidate Login</h2>
            <p className="text-gray-600 mt-2">Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <span>⚠️</span>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter your username or email"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Provided by your recruiter/admin (you can also use your email if enabled)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 pr-10"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Provided by your recruiter/admin
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <span>🔐</span> Login to Dashboard
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have credentials?{' '}
                <button
                  type="button"
                  onClick={() => alert('Please contact your recruiter or the admin team to get login credentials.')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Contact Support
                </button>
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-center text-sm text-gray-600 mb-4">Other login options</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('Contact your recruiter for assistance')}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                >
                  <span>👔</span> Ask Recruiter
                </button>
                <button
                  type="button"
                  onClick={() => window.open('mailto:support@infrapilot.com', '_blank')}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                >
                  <span>📧</span> Email Support
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">ℹ️ Important Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your login credentials are created by the admin</li>
              <li>• Contact your recruiter if you forget your password</li>
              <li>• This portal is only for registered candidates</li>
              <li>• All activity is monitored by your assigned recruiter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
