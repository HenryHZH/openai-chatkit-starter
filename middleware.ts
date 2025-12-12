import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/unlock') ||
    pathname.startsWith('/api/unlock')
  ) {
    return NextResponse.next()
  }

  const gateToken = process.env.APP_GATE_TOKEN

  // If gate configuration is missing, bypass the middleware entirely
  if (!gateToken || !process.env.APP_PASSWORD) {
    return NextResponse.next()
  }
  const cookie = req.cookies.get('kg_gate')?.value

  if (gateToken && cookie === gateToken) {
    return NextResponse.next()
  }

  const url = req.nextUrl.clone()
  url.pathname = '/unlock'
  url.searchParams.set('next', pathname + search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
