import { NextResponse } from 'next/server'

export async function POST() {
  // In a real app, you would blacklist the token
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })
}