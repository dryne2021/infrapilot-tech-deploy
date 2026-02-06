'use client'

import { useState } from 'react'

const PlanManagement = () => {
  const [plans, setPlans] = useState([
    { 
      id: 'free', 
      name: 'Free Trial', 
      price: 0, 
      duration: 7, 
      features: ['Basic profile', 'Limited applications (3/month)', 'Standard support'], 
      status: 'active',
      color: 'blue',
      description: 'Perfect for trying out our platform'
    },
    { 
      id: 'silver', 
      name: 'Silver', 
      price: 29, 
      duration: 30, 
      features: ['Priority listing', '10 applications/month', 'Resume review', 'Email support'], 
      status: 'active',
      color: 'blue',
      description: 'Great for active job seekers'
    },
    { 
      id: 'gold', 
      name: 'Gold', 
      price: 79, 
      duration: 30, 
      features: ['Top priority listing', 'Unlimited applications', 'Interview prep', 'LinkedIn optimization', 'Priority support'], 
      status: 'active',
      color: 'amber',
      description: 'Most popular - best value'
    },
    { 
      id: 'platinum', 
      name: 'Platinum', 
      price: 149, 
      duration: 30, 
      features: ['1:1 career coaching', 'Guaranteed interviews (3/month)', 'Salary negotiation', 'All Gold features', '24/7 support'], 
      status: 'active',
      color: 'gray',
      description: 'Premium career advancement'
    },
    { 
      id: 'enterprise', 
      name: 'Enterprise', 
      price: 299, 
      duration: 90, 
      features: ['Custom solutions', 'Dedicated recruiter', 'Team access', 'Analytics dashboard', 'Custom integrations'], 
      status: 'active',
      color: 'purple',
      description: 'Corporate & team solutions'
    }
  ])

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('add') // 'add' or 'edit'
  const [editingPlan, setEditingPlan] = useState(null)
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    duration: '',
    features: '',
    description: '',
    color: 'blue'
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [planToDelete, setPlanToDelete] = useState(null)

  // Color options for plan styling
  const colorOptions = [
    { value: 'blue', label: 'Blue', bg: 'from-blue-500 to-blue-600', text: 'text-white' },
    { value: 'emerald', label: 'Green', bg: 'from-emerald-500 to-emerald-600', text: 'text-white' },
    { value: 'amber', label: 'Gold', bg: 'from-amber-500 to-amber-600', text: 'text-white' },
    { value: 'purple', label: 'Purple', bg: 'from-purple-500 to-purple-600', text: 'text-white' },
    { value: 'gray', label: 'Silver', bg: 'from-gray-600 to-gray-700', text: 'text-white' },
    { value: 'rose', label: 'Red', bg: 'from-rose-500 to-rose-600', text: 'text-white' },
    { value: 'indigo', label: 'Indigo', bg: 'from-indigo-500 to-indigo-600', text: 'text-white' }
  ]

  const handleAddPlan = (e) => {
    e.preventDefault()
    const newPlanObj = {
      id: newPlan.name.toLowerCase().replace(/\s+/g, '_'),
      name: newPlan.name,
      price: parseFloat(newPlan.price),
      duration: parseInt(newPlan.duration),
      features: newPlan.features.split(',').map(f => f.trim()).filter(f => f),
      status: 'active',
      color: newPlan.color,
      description: newPlan.description
    }
    
    setPlans([...plans, newPlanObj])
    resetForm()
    setShowModal(false)
  }

  const handleEditPlan = (e) => {
    e.preventDefault()
    const updatedPlans = plans.map(plan => 
      plan.id === editingPlan.id 
        ? { 
            ...plan, 
            name: newPlan.name,
            price: parseFloat(newPlan.price),
            duration: parseInt(newPlan.duration),
            features: newPlan.features.split(',').map(f => f.trim()).filter(f => f),
            color: newPlan.color,
            description: newPlan.description
          }
        : plan
    )
    
    setPlans(updatedPlans)
    resetForm()
    setShowModal(false)
  }

  const handleDeletePlan = () => {
    const updatedPlans = plans.filter(plan => plan.id !== planToDelete.id)
    setPlans(updatedPlans)
    setShowDeleteConfirm(false)
    setPlanToDelete(null)
  }

  const openAddModal = () => {
    setModalType('add')
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (plan) => {
    setModalType('edit')
    setEditingPlan(plan)
    setNewPlan({
      name: plan.name,
      price: plan.price.toString(),
      duration: plan.duration.toString(),
      features: plan.features.join(', '),
      description: plan.description || '',
      color: plan.color
    })
    setShowModal(true)
  }

  const openDeleteConfirm = (plan) => {
    setPlanToDelete(plan)
    setShowDeleteConfirm(true)
  }

  const resetForm = () => {
    setNewPlan({
      name: '',
      price: '',
      duration: '',
      features: '',
      description: '',
      color: 'blue'
    })
    setEditingPlan(null)
  }

  const togglePlanStatus = (planId) => {
    setPlans(plans.map(plan => 
      plan.id === planId 
        ? { ...plan, status: plan.status === 'active' ? 'inactive' : 'active' }
        : plan
    ))
  }

  const getStats = () => {
    const activePlans = plans.filter(p => p.status === 'active')
    const totalRevenue = plans.reduce((sum, plan) => {
      // Simulate subscribers per plan for demo
      const subscribers = {
        'free': 500,
        'silver': 200,
        'gold': 150,
        'platinum': 50,
        'enterprise': 20
      }
      return sum + (plan.price * (subscribers[plan.id] || 0))
    }, 0)
    
    return { activePlans: activePlans.length, totalRevenue }
  }

  const stats = getStats()

  const getColorClasses = (color) => {
    const colorMap = {
      'blue': { bg: 'from-blue-500 to-blue-600', text: 'text-white', bgLight: 'bg-blue-50', border: 'border-blue-200', textDark: 'text-blue-800' },
      'emerald': { bg: 'from-emerald-500 to-emerald-600', text: 'text-white', bgLight: 'bg-emerald-50', border: 'border-emerald-200', textDark: 'text-emerald-800' },
      'amber': { bg: 'from-amber-500 to-amber-600', text: 'text-white', bgLight: 'bg-amber-50', border: 'border-amber-200', textDark: 'text-amber-800' },
      'purple': { bg: 'from-purple-500 to-purple-600', text: 'text-white', bgLight: 'bg-purple-50', border: 'border-purple-200', textDark: 'text-purple-800' },
      'gray': { bg: 'from-gray-600 to-gray-700', text: 'text-white', bgLight: 'bg-gray-50', border: 'border-gray-200', textDark: 'text-gray-800' },
      'rose': { bg: 'from-rose-500 to-rose-600', text: 'text-white', bgLight: 'bg-rose-50', border: 'border-rose-200', textDark: 'text-rose-800' },
      'indigo': { bg: 'from-indigo-500 to-indigo-600', text: 'text-white', bgLight: 'bg-indigo-50', border: 'border-indigo-200', textDark: 'text-indigo-800' }
    }
    return colorMap[color] || colorMap['blue']
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            💎 Subscription Plans Management
          </h2>
          <p className="text-slate-600">Create, edit, and manage subscription plans and pricing</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Plans</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                {plans.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-inner">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📋</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Plans</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent">
                {stats.activePlans}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center shadow-inner">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">✅</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Estimated Monthly Revenue</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-amber-900 to-amber-700 bg-clip-text text-transparent">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl flex items-center justify-center shadow-inner">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const colorClasses = getColorClasses(plan.color)
          return (
            <div 
              key={plan.id} 
              className={`bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                plan.status === 'active' ? colorClasses.border : 'border-slate-200'
              }`}
            >
              {/* Plan Header */}
              <div className={`p-6 bg-gradient-to-r ${colorClasses.bg} ${colorClasses.text}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.description && (
                      <p className="opacity-90 mt-1 text-sm">{plan.description}</p>
                    )}
                    <div className="flex items-baseline mt-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="ml-2 opacity-90">/ {plan.duration} days</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    plan.status === 'active' 
                      ? 'bg-white/20 backdrop-blur-sm text-white' 
                      : 'bg-white/10 backdrop-blur-sm text-white/80'
                  }`}>
                    {plan.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>

              {/* Plan Features */}
              <div className="p-6">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Included Features
                </h4>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-emerald-500 mr-3 flex-shrink-0 mt-0.5">✓</span>
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    onClick={() => togglePlanStatus(plan.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      plan.status === 'active' 
                        ? 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 hover:from-rose-200 hover:to-rose-100 border border-rose-200' 
                        : 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 hover:from-emerald-200 hover:to-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-lg hover:from-blue-200 hover:to-blue-100 transition-all duration-200 border border-blue-200 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(plan)}
                      className="px-4 py-2 bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 rounded-lg hover:from-rose-200 hover:to-rose-100 transition-all duration-200 border border-rose-200 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">
                  {modalType === 'add' ? 'Add New Plan' : 'Edit Plan'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                {modalType === 'add' ? 'Create a new subscription plan' : 'Modify plan details'}
              </p>
            </div>

            <form onSubmit={modalType === 'add' ? handleAddPlan : handleEditPlan} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Plan Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Premium Plus"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of the plan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Plan Color <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewPlan({...newPlan, color: color.value})}
                          className={`h-10 rounded-lg border-2 transition-all ${
                            newPlan.color === color.value 
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`h-full rounded-md ${color.bg}`}></div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Selected: {colorOptions.find(c => c.value === newPlan.color)?.label}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Price ($) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-500">$</span>
                        <input
                          type="number"
                          value={newPlan.price}
                          onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                          className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duration (days) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={newPlan.duration}
                        onChange={(e) => setNewPlan({...newPlan, duration: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="30"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Features (comma separated) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={newPlan.features}
                      onChange={(e) => setNewPlan({...newPlan, features: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="4"
                      placeholder="Feature 1, Feature 2, Feature 3"
                      required
                    />
                    <p className="text-sm text-slate-500 mt-1">Separate features with commas</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-200 font-medium"
                  >
                    {modalType === 'add' ? 'Add Plan' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && planToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Delete Plan</h3>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-100 to-rose-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.714-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Are you sure?</h4>
                  <p className="text-slate-600 text-sm mt-1">
                    You are about to delete the <span className="font-semibold">{planToDelete.name}</span> plan.
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                <p className="text-rose-800 text-sm">
                  ⚠️ This action cannot be undone. Any candidates subscribed to this plan will need to be migrated to another plan.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePlan}
                  className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-lg hover:from-rose-700 hover:to-rose-600 transition-all duration-200 shadow-md hover:shadow-lg shadow-rose-200 font-medium"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Strategy */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-800 text-lg mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Pricing Strategy & Best Practices
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">🎯 Tier Recommendations:</h4>
            <ul className="text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <span><strong>Free Trial:</strong> 7-14 days to attract users</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <span><strong>Entry Level ($19-49):</strong> Basic features for job seekers</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <span><strong>Professional ($79-149):</strong> Most popular - best value</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                <span><strong>Premium ($149-299):</strong> Advanced features & coaching</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">💡 Best Practices:</h4>
            <ul className="text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                <span>Offer 3-5 plan tiers maximum</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                <span>Highlight the most popular plan</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                <span>Use color coding for visual hierarchy</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                <span>Keep features clearly differentiated</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-blue-200">
          <h4 className="font-semibold text-blue-700 mb-2">📊 Current Plan Performance:</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">Free: 500 users</span>
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">Silver: 200 subscribers</span>
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">Gold: 150 subscribers</span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Platinum: 50 subscribers</span>
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">Enterprise: 20 clients</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanManagement