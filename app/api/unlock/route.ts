import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  const expected = process.env.APP_PASSWORD
  const gateToken = process.env.APP_GATE_TOKEN
  if (!expected || !gateToken) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('kg_gate', gateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
