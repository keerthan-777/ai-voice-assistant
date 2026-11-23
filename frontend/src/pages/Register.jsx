import { ArrowRight, Building2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../components/AuthField.jsx'
import { createBusiness, register } from '../services/authService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    businessName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [createdBusiness, setCreatedBusiness] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setSubmitError('')
    if (field === 'confirmPassword') {
      setConfirmPasswordError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setConfirmPasswordError('')

    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    let business = createdBusiness

    try {
      if (!business) {
        business = await createBusiness(form.businessName.trim())
        setCreatedBusiness(business)
      }

      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        business_id: business.id,
      })

      navigate('/login', {
        replace: true,
        state: {
          notice: 'Your account is ready. Sign in to continue.',
        },
      })
    } catch (error) {
      const detail = getApiErrorMessage(
        error,
        'Could not create your account. Please try again.',
      )
      setSubmitError(
        business
          ? `The business was created, but account registration failed: ${detail} Your business entry is preserved; correct the issue and submit again.`
          : detail,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center py-10 sm:py-14">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#e7ebe6] bg-white p-6 shadow-[0_16px_50px_rgba(34,53,42,0.06)] sm:p-9">
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#edf4ee] text-emerald-800">
          <Building2 aria-hidden="true" size={22} strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#17211d]">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#67736c]">
          Set up your business workspace and owner sign-in.
        </p>

        {submitError && (
          <div
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800"
            role="alert"
          >
            {submitError}
          </div>
        )}
        {createdBusiness && (
          <div
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            Business created. Complete the owner account details to continue.
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="organization"
            disabled={Boolean(createdBusiness)}
            id="register-business"
            label="Business name"
            onChange={updateField('businessName')}
            placeholder="Acme Services"
            value={form.businessName}
          />
          <AuthField
            autoComplete="name"
            id="register-name"
            label="Your name"
            onChange={updateField('name')}
            placeholder="Jordan Lee"
            value={form.name}
          />
          <AuthField
            autoComplete="email"
            id="register-email"
            label="Work email"
            onChange={updateField('email')}
            placeholder="you@company.com"
            type="email"
            value={form.email}
          />
          <AuthField
            autoComplete="new-password"
            id="register-password"
            label="Password"
            minLength={8}
            onChange={updateField('password')}
            placeholder="At least 8 characters"
            type="password"
            value={form.password}
          />
          <AuthField
            autoComplete="new-password"
            error={confirmPasswordError}
            id="register-confirm-password"
            label="Confirm password"
            minLength={8}
            onChange={updateField('confirmPassword')}
            placeholder="Enter your password again"
            type="password"
            value={form.confirmPassword}
          />
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white transition hover:bg-[#0d3028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-65"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
            {!isSubmitting && <ArrowRight aria-hidden="true" size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#67736c]">
          Already have an account?{' '}
          <Link
            className="font-semibold text-emerald-800 hover:text-emerald-950"
            to="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Register
