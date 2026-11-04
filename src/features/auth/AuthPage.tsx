import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Button, Card, ErrorBox, Field, TextInput } from '../../components/ui'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (err) {
      setError(err)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-layout flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-medium">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          {mode === 'signin'
            ? 'Sign in to continue your prep.'
            : 'One account, your own private prep space.'}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <ErrorBox message={error} />}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-primary hover:underline"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
        <Link to="/" className="mt-2 block text-center text-sm text-muted-foreground hover:underline">
          ← Back to home
        </Link>
      </Card>
    </div>
  )
}
