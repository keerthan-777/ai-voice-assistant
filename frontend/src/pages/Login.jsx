import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthField from '../components/AuthField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function Login() {
  const { authNotice, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const notice = location.state?.notice || authNotice

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      const returnTo = location.state?.from?.pathname || '/workspace'
      navigate(returnTo, { replace: true })
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Could not sign in. Please try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center py-12 sm:py-16">
      <div className="w-full max-w-[440px] rounded-2xl border border-[#e7ebe6] bg-white p-6 shadow-[0_16px_50px_rgba(34,53,42,0.06)] sm:p-9">
        <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#edf4ee] text-emerald-800">
          <LockKeyhole aria-hidden="true" size={22} strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#17211d]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#67736c]">
          Sign in to continue to your AI Voice Assistant workspace.
        </p>

        {notice && (
          <div
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {notice}
          </div>
        )}
        {errorMessage && (
          <div
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="email"
            id="login-email"
            label="Email address"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
          <AuthField
            autoComplete="current-password"
            id="login-password"
            label="Password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white transition hover:bg-[#0d3028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
            {!isSubmitting && <ArrowRight aria-hidden="true" size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#67736c]">
          New to the assistant?{' '}
          <Link
            className="font-semibold text-emerald-800 hover:text-emerald-950"
            to="/register"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login
