'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchWithAuth } from '@/utils/fetchWithAuth'

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Trial', price: 0, duration: 7 },
  { id: 'silver', name: 'Silver', price: 29, duration: 30 },
  { id: 'gold', name: 'Gold', price: 79, duration: 30 },
  { id: 'platinum', name: 'Platinum', price: 149, duration: 30 },
  { id: 'enterprise', name: 'Enterprise', price: 299, duration: 90 },
]

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')

  const initialFormState: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',

    experience: [
      {
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '',
      },
    ],

    education: [
      {
        school: '',
        degree: '',
        field: '',
        graduationYear: '',
      },
    ],

    subscriptionPlan: 'gold',
    paymentStatus: 'paid',
  }

  const [formData, setFormData] = useState<any>(initialFormState)

  /* ============================
     LOAD CANDIDATES
  ============================ */
  const loadCandidates = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/admin/candidates')
      const json = await res.json()
      setCandidates(json?.data || [])
    } catch (e: any) {
      setError('Failed to load candidates')
    }
  }

  useEffect(() => {
    loadCandidates().finally(() => setPageLoading(false))
  }, [])

  /* ============================
     FORM HELPERS
  ============================ */
  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleArrayInputChange = (
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

  const addExperience = () => {
    setFormData((prev: any) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          title: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }))
  }

  const removeExperience = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      experience: prev.experience.filter((_: any, i: number) => i !== index),
    }))
  }

  const addEducation = () => {
    setFormData((prev: any) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          school: '',
          degree: '',
          field: '',
          graduationYear: '',
        },
      ],
    }))
  }

  const removeEducation = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      education: prev.education.filter((_: any, i: number) => i !== index),
    }))
  }

  /* ============================
     CREATE CANDIDATE (DB CONNECTED)
  ============================ */
  const handleAddCandidate = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        subscriptionStatus:
          formData.paymentStatus === 'paid' ? 'active' : 'pending',
      }

      const res = await fetchWithAuth('/api/v1/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to create candidate')

      await loadCandidates()
      setFormData(initialFormState)
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          👥 Candidate Management
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Add Candidate
        </button>
      </div>

      {/* ============================
         ADD CANDIDATE MODAL
      ============================ */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl p-6 overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleAddCandidate} className="space-y-8">

              {/* PERSONAL INFO */}
              <div>
                <h3 className="font-bold text-lg mb-4">👤 Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="p-3 border rounded"
                    required
                  />
                  <input
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="p-3 border rounded"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="p-3 border rounded"
                    required
                  />
                </div>
              </div>

              {/* EXPERIENCE */}
              <div>
                <h3 className="font-bold text-lg mb-4">💼 Work Experience</h3>

                {formData.experience.map((exp: any, index: number) => (
                  <div key={index} className="border p-4 rounded mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        placeholder="Job Title"
                        value={exp.title}
                        onChange={(e) =>
                          handleArrayInputChange('experience', index, 'title', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                      <input
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) =>
                          handleArrayInputChange('experience', index, 'company', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                      <input
                        placeholder="Location"
                        value={exp.location}
                        onChange={(e) =>
                          handleArrayInputChange('experience', index, 'location', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                    </div>

                    <textarea
                      placeholder="Description"
                      value={exp.description}
                      onChange={(e) =>
                        handleArrayInputChange('experience', index, 'description', e.target.value)
                      }
                      className="w-full p-3 border rounded mt-3"
                    />

                    {formData.experience.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="text-red-600 mt-2"
                      >
                        Remove Experience
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={addExperience} className="text-blue-600">
                  + Add Experience
                </button>
              </div>

              {/* EDUCATION */}
              <div>
                <h3 className="font-bold text-lg mb-4">🎓 Education</h3>

                {formData.education.map((edu: any, index: number) => (
                  <div key={index} className="border p-4 rounded mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        placeholder="School"
                        value={edu.school}
                        onChange={(e) =>
                          handleArrayInputChange('education', index, 'school', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                      <input
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) =>
                          handleArrayInputChange('education', index, 'degree', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                      <input
                        placeholder="Field"
                        value={edu.field}
                        onChange={(e) =>
                          handleArrayInputChange('education', index, 'field', e.target.value)
                        }
                        className="p-3 border rounded"
                      />
                    </div>

                    {formData.education.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="text-red-600 mt-2"
                      >
                        Remove Education
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={addEducation} className="text-blue-600">
                  + Add Education
                </button>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded"
                >
                  {loading ? 'Saving...' : 'Save Candidate'}
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
