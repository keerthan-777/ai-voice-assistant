import { useState } from 'react'
import { updateBusiness } from '../services/businessService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function BusinessProfileForm({ business, onBusinessUpdated }) {
  const [form, setForm] = useState({
    business_name: business.business_name || '',
    business_type: business.business_type || '',
    phone_number: business.phone_number || '',
    email: business.email || '',
    address: business.address || '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const businessName = form.business_name.trim()
    if (!businessName) {
      setErrorMessage('Business name is required.')
      return
    }

    setIsSaving(true)
    try {
      const updatedBusiness = await updateBusiness(business.id, {
        business_name: businessName,
        business_type: form.business_type.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      })
      onBusinessUpdated(updatedBusiness)
      setSuccessMessage('Business profile updated successfully.')
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Could not update the business profile.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
      <div className="border-b border-[#edf0ec] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[#27352e]">Business profile</h2>
        <p className="mt-1 text-xs text-[#89938d]">
          Update the contact and business information associated with this account.
        </p>
      </div>
      <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
        {errorMessage && (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {successMessage}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="business-name"
            >
              Business name <span className="text-rose-600">*</span>
            </label>
            <input
              autoComplete="organization"
              className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="business-name"
              maxLength={150}
              onChange={updateField('business_name')}
              required
              value={form.business_name}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="business-type"
            >
              Business type
            </label>
            <input
              className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="business-type"
              maxLength={100}
              onChange={updateField('business_type')}
              value={form.business_type}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="business-phone"
            >
              Phone number
            </label>
            <input
              autoComplete="tel"
              className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="business-phone"
              maxLength={20}
              onChange={updateField('phone_number')}
              type="tel"
              value={form.phone_number}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="business-email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="business-email"
              maxLength={150}
              onChange={updateField('email')}
              type="email"
              value={form.email}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="business-address"
            >
              Address
            </label>
            <textarea
              className="min-h-20 w-full resize-y rounded-xl border border-[#dfe5df] px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="business-address"
              maxLength={255}
              onChange={updateField('address')}
              value={form.address}
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-[#edf0ec] pt-5">
          <button
            className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default BusinessProfileForm
