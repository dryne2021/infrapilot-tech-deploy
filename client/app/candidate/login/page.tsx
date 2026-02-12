'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CandidateLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://infrapilot-tech-deploy.onrender.com'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: 'candidate',
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.message || 'Invalid credentials')
        return
      }

      const token = data?.token || data?.data?.token || data?.accessToken
      const user = data?.user || data?.data?.user || data?.data

      const candidateUser = {
        id: user?._id || user?.id,
        name:
          user?.name ||
          user?.fullName ||
          `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        email: user?.email,
        role: user?.role || 'candidate',
        candidateAuthenticated: true,
      }

      localStorage.setItem('infrapilot_user', JSON.stringify(candidateUser))
      if (token) localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('candidate_authenticated', 'true')
      if (candidateUser.id) localStorage.setItem('candidate_id', candidateUser.id)

      // ✅ FIXED REDIRECT
      router.push('/candidate/dashboard')
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
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🧑‍💼</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Candidate Portal</h1>
          <p className="text-gray-400">
            Log in using credentials provided by the administrator
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">
              If you don’t have credentials yet, contact your administrator.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
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
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 focus:ring-4 focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </span>
            ) : (
              'Login as Candidate'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Are you a recruiter or admin?
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <Link
                href="/recruiter/login"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Recruiter Login →
              </Link>
              <Link
                href="/admin/login"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Admin Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
