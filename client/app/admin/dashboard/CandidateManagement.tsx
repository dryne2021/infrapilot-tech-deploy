'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

/* -----------------------------
   Subscription Plans
----------------------------- */
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Trial', price: 0, duration: 7 },
  { id: 'silver', name: 'Silver', price: 29, duration: 30 },
  { id: 'gold', name: 'Gold', price: 79, duration: 30 },
  { id: 'platinum', name: 'Platinum', price: 149, duration: 30 },
  { id: 'enterprise', name: 'Enterprise', price: 299, duration: 90 },
]

type Candidate = any
type Recruiter = {
  _id: string
  name?: string
  email?: string
}

/* =========================================================
   Component
========================================================= */
const CandidateManagement = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  /* -----------------------------
     Initial Form State
  ----------------------------- */
  const initialFormState: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',

    experience: [
      {
        id: Date.now(),
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
      },
    ],

    education: [
      {
        id: Date.now() + 1,
        school: '',
        degree: '',
        field: '',
        graduationYear: '',
      },
    ],

    subscriptionPlan: 'gold',
    paymentStatus: 'paid',
    assignedRecruiter: '',
  }

  const [formData, setFormData] = useState<any>(initialFormState)

  /* =========================================================
     Backend Loads
  ========================================================= */
  const loadCandidates = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/candidates')
      const json = await res.json()
      setCandidates(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError('Failed to load candidates')
    }
  }

  const loadRecruiters = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/recruiters')
      const json = await res.json()
      setRecruiters(Array.isArray(json?.data) ? json.data : [])
    } catch {}
  }

  useEffect(() => {
    ;(async () => {
      setPageLoading(true)
      await Promise.all([loadCandidates(), loadRecruiters()])
      setPageLoading(false)
    })()
  }, [])

  /* =========================================================
     Helpers
  ========================================================= */
  const stripUiId = (arr: any[]) =>
    Array.isArray(arr) ? arr.map(({ id, ...rest }) => rest) : []

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (
    arrayName: string,
    index: number,
    field: string,
    value: any
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any, i: number) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  /* -----------------------------
     Experience
  ----------------------------- */
  const addExperience = () => {
    setFormData((prev: any) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: Date.now(),
          title: '',
          company: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }))
  }

  const removeExperience = (index: number) => {
    if (formData.experience.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        experience: prev.experience.filter((_: any, i: number) => i !== index),
      }))
    }
  }

  /* -----------------------------
     Education (School Only)
  ----------------------------- */
  const addEducation = () => {
    setFormData((prev: any) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: Date.now(),
          school: '',
          degree: '',
          field: '',
          graduationYear: '',
        },
      ],
    }))
  }

  const removeEducation = (index: number) => {
    if (formData.education.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        education: prev.education.filter((_: any, i: number) => i !== index),
      }))
    }
  }

  /* =========================================================
     Submit
  ========================================================= */
  const handleAddCandidate = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        location: formData.location,

        experience: stripUiId(formData.experience),
        education: stripUiId(formData.education),

        subscriptionPlan: formData.subscriptionPlan,
        paymentStatus: formData.paymentStatus,
        subscriptionStatus:
          formData.paymentStatus === 'paid' ? 'active' : 'pending',

        assignedRecruiter: formData.assignedRecruiter || null,
        status: 'New',
      }

      const res = await fetchWithAuth('/api/v1/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.message || 'Create failed')
      }

      await loadCandidates()
      setFormData(initialFormState)
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return <div className="text-gray-900">Loading…</div>
  }

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Candidate Management</h2>

      <button
        onClick={() => setShowAddForm(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Add Candidate
      </button>

      {/* ===================================================== */}
      {/* Add Candidate Modal                                  */}
      {/* ===================================================== */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleAddCandidate} className="p-6 space-y-8">
              {/* ---------------- Personal ---------------- */}
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-4">
                  Personal Info
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="p-3 border rounded text-gray-900"
                    required
                  />
                  <input
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="p-3 border rounded text-gray-900"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="p-3 border rounded text-gray-900"
                    required
                  />
                </div>
              </div>

              {/* ---------------- Experience ---------------- */}
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-4">
                  Experience
                </h3>

                {formData.experience.map((exp: any, i: number) => (
                  <div key={exp.id} className="border p-4 rounded mb-4">
                    <input
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) =>
                        handleArrayChange('experience', i, 'title', e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2 text-gray-900"
                    />
                    <input
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) =>
                        handleArrayChange('experience', i, 'company', e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2 text-gray-900"
                    />
                    <textarea
                      placeholder="Description"
                      value={exp.description}
                      onChange={(e) =>
                        handleArrayChange(
                          'experience',
                          i,
                          'description',
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeExperience(i)}
                      className="mt-2 text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExperience}
                  className="text-blue-600"
                >
                  + Add Experience
                </button>
              </div>

              {/* ---------------- Education ---------------- */}
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-4">
                  Education
                </h3>

                {formData.education.map((edu: any, i: number) => (
                  <div key={edu.id} className="border p-4 rounded mb-4">
                    <input
                      placeholder="School"
                      value={edu.school}
                      onChange={(e) =>
                        handleArrayChange('education', i, 'school', e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2 text-gray-900"
                    />
                    <input
                      placeholder="Degree"
                      value={edu.degree}
                      onChange={(e) =>
                        handleArrayChange('education', i, 'degree', e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2 text-gray-900"
                    />
                    <input
                      placeholder="Field"
                      value={edu.field}
                      onChange={(e) =>
                        handleArrayChange('education', i, 'field', e.target.value)
                      }
                      className="w-full p-2 border rounded mb-2 text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeEducation(i)}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEducation}
                  className="text-blue-600"
                >
                  + Add School
                </button>
              </div>

              {/* ---------------- Actions ---------------- */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border rounded text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded"
                >
                  {loading ? 'Saving…' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandidateManagement
