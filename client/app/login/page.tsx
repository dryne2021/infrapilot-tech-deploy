'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'recruiter' | 'candidate' | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    remember: false
  })
  const [loginError, setLoginError] = useState('')

  // Mock user database for demo purposes
  const mockUsers = {
    admin: [
      { email: 'admin@infrapilot.com', password: 'admin123', name: 'Business Owner' },
      { email: 'owner@infrapilot.com', password: 'owner123', name: 'System Owner' },
      { email: 'john.doe@infrapilot.com', password: 'password123', name: 'John Doe' }
    ],
    recruiter: [
      { email: 'recruiter@infrapilot.com', password: 'recruiter123', name: 'Alex Johnson' },
      { email: 'emma.wilson@infrapilot.com', password: 'emma123', name: 'Emma Wilson' },
      { email: 'michael@infrapilot.com', password: 'michael123', name: 'Michael Chen' }
    ],
    candidate: [
      { email: 'candidate@infrapilot.com', password: 'candidate123', name: 'Sarah Miller' },
      { email: 'john.smith@infrapilot.com', password: 'john123', name: 'John Smith' },
      { email: 'lisa.wang@infrapilot.com', password: 'lisa123', name: 'Lisa Wang' }
    ]
  }

  // Demo credentials for each role
  const demoCredentials = {
    admin: { email: 'admin@infrapilot.com', password: 'admin123' },
    recruiter: { email: 'recruiter@infrapilot.com', password: 'recruiter123' },
    candidate: { email: 'candidate@infrapilot.com', password: 'candidate123' }
  }

  const handleRoleSelect = (role: 'admin' | 'recruiter' | 'candidate') => {
    setSelectedRole(role)
    setCredentials({
      email: demoCredentials[role].email,
      password: '',
      remember: false
    })
    setLoginError('')
    setShowLoginModal(true)
  }

  const handleLogin = () => {
    setLoading(true)
    setLoginError('')

    setTimeout(() => {
      if (!selectedRole) {
        setLoginError('Please select a role')
        setLoading(false)
        return
      }

      const users = mockUsers[selectedRole]
      const user = users.find(u => 
        u.email === credentials.email && u.password === credentials.password
      )

      if (user) {
        const userData = {
          id: '1',
          email: user.email,
          name: user.name,
          role: selectedRole
        }
        
        localStorage.setItem('infrapilot_user', JSON.stringify(userData))
        localStorage.setItem('infrapilot_token', 'mock-token')
        
        if (credentials.remember) {
          localStorage.setItem('infrapilot_remember', 'true')
          localStorage.setItem('infrapilot_email', user.email)
        } else {
          localStorage.removeItem('infrapilot_remember')
          localStorage.removeItem('infrapilot_email')
        }
        
        setShowLoginModal(false)
        
        // Redirect to dashboard based on role
        const redirectPath = selectedRole === 'admin' ? '/admin/dashboard' : `/${selectedRole}/dashboard`
        router.push(redirectPath)
      } else {
        setLoginError('Invalid email or password. Try demo credentials below.')
      }
      
      setLoading(false)
    }, 800)
  }

  const handleUseDemoCredentials = () => {
    if (selectedRole) {
      setCredentials({
        ...credentials,
        email: demoCredentials[selectedRole].email,
        password: demoCredentials[selectedRole].password
      })
    }
  }

  const handleForgotPassword = () => {
    alert(`Password reset instructions have been sent to ${credentials.email || 'your email'}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          {/* Logo Container with your actual logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-xl shadow-blue-200/50 mb-4 mx-auto border-4 border-white">
                <Image
                  src="/logo.jpeg"
                  alt="Infrapilot Logo"
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full animate-pulse flex items-center justify-center">
                <span className="text-white text-xs font-bold">IP</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
            Infrapilot Career Platform
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Professional career management system for businesses and job seekers
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Business Owner Panel */}
          <div 
            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
              selectedRole === 'admin' 
                ? 'border-blue-500 ring-4 ring-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50' 
                : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-lg'
            }`}
            onClick={() => handleRoleSelect('admin')}
          >
            <div className="p-2">
              <div className={`rounded-xl p-6 ${selectedRole === 'admin' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-white text-2xl">👑</span>
                  </div>
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                    Full Access
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Business Owner Panel</h3>
                <p className="text-blue-100 text-sm">
                  Complete system control, analytics, and management
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📊</span>
                    </div>
                    <span className="text-sm text-slate-700">Analytics Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👥</span>
                    </div>
                    <span className="text-sm text-slate-700">User Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">💰</span>
                    </div>
                    <span className="text-sm text-slate-700">Revenue Analytics</span>
                  </div>
                </div>
                
                <button 
                  className={`w-full mt-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-200'
                  }`}
                >
                  Access Business Panel
                </button>
              </div>
            </div>
            
            {/* Corner Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full">
              ADMIN
            </div>
          </div>

          {/* Recruiter Portal */}
          <div 
            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
              selectedRole === 'recruiter' 
                ? 'border-emerald-500 ring-4 ring-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50' 
                : 'border-slate-200 hover:border-emerald-300 bg-white hover:shadow-lg'
            }`}
            onClick={() => handleRoleSelect('recruiter')}
          >
            <div className="p-2">
              <div className={`rounded-xl p-6 ${selectedRole === 'recruiter' ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-emerald-500 to-green-500'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-white text-2xl">👔</span>
                  </div>
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                    Professional
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Recruiter Portal</h3>
                <p className="text-emerald-100 text-sm">
                  Talent acquisition, candidate management, and placements
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
                      <span className="text-emerald-600 text-sm">🎯</span>
                    </div>
                    <span className="text-sm text-slate-700">Candidate Matching</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
                      <span className="text-emerald-600 text-sm">💼</span>
                    </div>
                    <span className="text-sm text-slate-700">Job Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
                      <span className="text-emerald-600 text-sm">📊</span>
                    </div>
                    <span className="text-sm text-slate-700">Performance Metrics</span>
                  </div>
                </div>
                
                <button 
                  className={`w-full mt-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    selectedRole === 'recruiter'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 hover:from-emerald-100 hover:to-green-100 border border-emerald-200'
                  }`}
                >
                  Access Recruiter Portal
                </button>
              </div>
            </div>
            
            {/* Corner Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold rounded-full">
              RECRUITER
            </div>
          </div>

          {/* Candidate Dashboard */}
          <div 
            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
              selectedRole === 'candidate' 
                ? 'border-purple-500 ring-4 ring-purple-100 bg-gradient-to-br from-purple-50 to-violet-50' 
                : 'border-slate-200 hover:border-purple-300 bg-white hover:shadow-lg'
            }`}
            onClick={() => handleRoleSelect('candidate')}
          >
            <div className="p-2">
              <div className={`rounded-xl p-6 ${selectedRole === 'candidate' ? 'bg-gradient-to-r from-purple-600 to-violet-600' : 'bg-gradient-to-r from-purple-500 to-violet-500'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-white text-2xl">👤</span>
                  </div>
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                    Personal
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Candidate Dashboard</h3>
                <p className="text-purple-100 text-sm">
                  Job search, application tracking, and career advancement
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-100 to-violet-100 flex items-center justify-center">
                      <span className="text-purple-600 text-sm">📄</span>
                    </div>
                    <span className="text-sm text-slate-700">Resume Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-100 to-violet-100 flex items-center justify-center">
                      <span className="text-purple-600 text-sm">📋</span>
                    </div>
                    <span className="text-sm text-slate-700">Application Tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-100 to-violet-100 flex items-center justify-center">
                      <span className="text-purple-600 text-sm">💬</span>
                    </div>
                    <span className="text-sm text-slate-700">Career Advisor Chat</span>
                  </div>
                </div>
                
                <button 
                  className={`w-full mt-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    selectedRole === 'candidate'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600'
                      : 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 hover:from-purple-100 hover:to-violet-100 border border-purple-200'
                  }`}
                >
                  Access Candidate Dashboard
                </button>
              </div>
            </div>
            
            {/* Corner Badge */}
            <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold rounded-full">
              CANDIDATE
            </div>
          </div>
        </div>
        
        {/* Demo Information */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-600 text-xl">💡</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Demo Information</h4>
              <p className="text-slate-600 mb-3">
                Select a portal above to access the login screen. Use the demo credentials provided for instant access.
                All data is simulated for demonstration purposes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium">Business Owner Panel</p>
                  <p className="text-xs text-slate-500">Email: admin@infrapilot.com</p>
                  <p className="text-xs text-slate-500">Password: admin123</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium">Recruiter Portal</p>
                  <p className="text-xs text-slate-500">Email: recruiter@infrapilot.com</p>
                  <p className="text-xs text-slate-500">Password: recruiter123</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium">Candidate Dashboard</p>
                  <p className="text-xs text-slate-500">Email: candidate@infrapilot.com</p>
                  <p className="text-xs text-slate-500">Password: candidate123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            © 2024 Infrapilot Tech Solutions • Professional Career Platform
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Demo Version 2.0 • Secure Login Required for Access
          </p>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && selectedRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className={`p-6 rounded-t-2xl ${
              selectedRole === 'admin' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' :
              selectedRole === 'recruiter' ? 'bg-gradient-to-r from-emerald-600 to-green-600' :
              'bg-gradient-to-r from-purple-600 to-violet-600'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedRole === 'admin' && 'Business Owner Panel Login'}
                    {selectedRole === 'recruiter' && 'Recruiter Portal Login'}
                    {selectedRole === 'candidate' && 'Candidate Dashboard Login'}
                  </h3>
                  <p className="text-sm text-white/90 mt-1">
                    Enter your credentials to access the platform
                  </p>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-white hover:text-white/80 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Role Indicator */}
              <div className="mb-6">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  selectedRole === 'admin' ? 'bg-blue-50 text-blue-700' :
                  selectedRole === 'recruiter' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-purple-50 text-purple-700'
                }`}>
                  <span className={`text-sm font-medium ${
                    selectedRole === 'admin' ? 'text-blue-600' :
                    selectedRole === 'recruiter' ? 'text-emerald-600' :
                    'text-purple-600'
                  }`}>
                    {selectedRole === 'admin' && '👑 Business Owner'}
                    {selectedRole === 'recruiter' && '👔 Recruiter'}
                    {selectedRole === 'candidate' && '👤 Candidate'}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="mb-6 p-4 bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 rounded-xl border border-rose-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm">{loginError}</p>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">📧</span>
                    </div>
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">🔒</span>
                    </div>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      className="w-full pl-10 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={handleUseDemoCredentials}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Demo
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={credentials.remember}
                      onChange={(e) => setCredentials({...credentials, remember: e.target.checked})}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-slate-700">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Demo Credentials Hint */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-700 font-medium mb-1">Demo Credentials:</p>
                  <p className="text-xs text-slate-600">
                    Email: {demoCredentials[selectedRole].email}
                  </p>
                  <p className="text-xs text-slate-600">
                    Password: {demoCredentials[selectedRole].password}
                  </p>
                  <button
                    type="button"
                    onClick={handleUseDemoCredentials}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click here to auto-fill demo credentials
                  </button>
                </div>

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    selectedRole === 'admin' ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600' :
                    selectedRole === 'recruiter' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600' :
                    'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <div className={`w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ${
                        selectedRole === 'admin' ? 'border-blue-100' :
                        selectedRole === 'recruiter' ? 'border-emerald-100' :
                        'border-purple-100'
                      }`}></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      <span>Login to Continue</span>
                    </>
                  )}
                </button>
              </div>

              {/* Footer Note */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">
                  By logging in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}