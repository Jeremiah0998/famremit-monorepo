'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { Button } from '@famremit/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Sign up successful! Check your email to verify.')
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h1>FamRemit</h1>
      <p>Sign In or Create an Account</p>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', margin: '8px 0', padding: '12px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ display: 'block', margin: '8px 0', padding: '12px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }} />
      {message && <p style={{ color: 'red' }}>{message}</p>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <Button onPress={handleSignIn} text={loading ? "Loading..." : "Sign In"} />
        <Button onPress={handleSignUp} text={loading ? "Loading..." : "Sign Up"} />
      </div>
    </div>
  )
}