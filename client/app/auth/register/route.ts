import { NextRequest, NextResponse } from 'next/server'

// Mock database
const users: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role = 'candidate' } = body

    // Check if user exists
    if (users.some(u => u.email === email)) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      )
    }

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role,
      status: 'active' as const,
      createdAt: new Date().toISOString()
    }

    users.push(newUser)

    // Create response without password
    const { password: _, ...userWithoutPassword } = newUser
    const token = `nextjs-jwt-${newUser.id}-${Date.now()}`

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Registration successful'
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}