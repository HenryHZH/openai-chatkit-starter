'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function UnlockPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') ?? '/'

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)
    if (res.ok) router.replace(next)
    else setError('密码不正确')
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 16 }}>
      <h1>请输入访问密码</h1>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ width: '100%', padding: 10, marginTop: 12 }}
        />
        <button disabled={loading} style={{ width: '100%', padding: 10, marginTop: 12 }}>
          {loading ? '验证中…' : '进入'}
        </button>
      </form>
      {error && <p style={{ marginTop: 12 }}>{error}</p>}
    </main>
  )
}
