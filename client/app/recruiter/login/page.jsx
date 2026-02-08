'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RecruiterLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // ✅ Use your deployed backend URL (or use NEXT_PUBLIC_API_URL if you already have it)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://infrapilot-tech-deploy.onrender.com'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,               // ✅ must be an email now
          password,
          role: 'recruiter',   // optional (backend role check currently disabled)
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.message || 'Invalid credentials')
        return
      }

      // ✅ Store session like your other pages expect
      // sendTokenResponse usually returns token + user; handle both shapes safely
      const token = data?.token || data?.data?.token || data?.data || data?.accessToken
      const user = data?.user || data?.data?.user || data?.data

      // If backend returns { success, token, user }
      const recruiterUser = {
        id: user?._id || user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role || 'recruiter',
        recruiterAuthenticated: true,
      }

      localStorage.setItem('infrapilot_user', JSON.stringify(recruiterUser))
      if (token) localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('recruiter_authenticated', 'true')
      if (recruiterUser.id) localStorage.setItem('recruiter_id', recruiterUser.id)

      router.push('/recruiter')
      router.refresh()
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👔</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Recruiter Portal</h1>
          <p className="text-gray-400">Enter your credentials to access candidate dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Confirm you are using your recruiter email + password</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </span>
            ) : (
              'Login as Recruiter'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Need access? Contact your administrator</p>
            <Link
              href="/admin/login"
              className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
