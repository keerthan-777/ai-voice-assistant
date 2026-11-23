import { X } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function CustomerFormDialog({ customer, mode, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone_number: customer?.phone_number || '',
    email: customer?.email || '',
    notes: customer?.notes || '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const name = form.name.trim()
    if (!name) {
      setErrorMessage('Enter a customer name.')
      return
    }

    const phoneNumber = form.phone_number.trim()
    const phoneDigits = phoneNumber.replace(/\D/g, '')
    if (!/^[+()\d.\-\s]+$/.test(phoneNumber) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setErrorMessage('Enter a valid phone number with 7 to 15 digits.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        phone_number: phoneNumber,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      })
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Could not save this customer. Please try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isEditing = mode === 'edit'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="customer-form-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#edf0ec] px-6 py-5">
          <div>
            <h2
              className="text-lg font-semibold text-[#17211d]"
              id="customer-form-title"
            >
              {isEditing ? 'Edit customer' : 'Add customer'}
            </h2>
            <p className="mt-1 text-sm text-[#748078]">
              {isEditing
                ? 'Update this customer’s contact information.'
                : 'Add a customer to your business directory.'}
            </p>
          </div>
          <button
            aria-label="Close customer form"
            className="rounded-lg p-2 text-[#748078] hover:bg-[#f3f6f3] disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
          {errorMessage && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#27352e]" htmlFor="customer-name">
                Name <span className="text-rose-600">*</span>
              </label>
              <input
                autoComplete="name"
                className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="customer-name"
                maxLength={150}
                onChange={updateField('name')}
                required
                value={form.name}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#27352e]" htmlFor="customer-phone">
                Phone number <span className="text-rose-600">*</span>
              </label>
              <input
                autoComplete="tel"
                className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="customer-phone"
                maxLength={20}
                onChange={updateField('phone_number')}
                placeholder="+1 (555) 010-1234"
                required
                type="tel"
                value={form.phone_number}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-[#27352e]" htmlFor="customer-email">
                Email <span className="font-normal text-[#89938d]">(optional)</span>
              </label>
              <input
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="customer-email"
                maxLength={150}
                onChange={updateField('email')}
                type="email"
                value={form.email}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-[#27352e]" htmlFor="customer-notes">
                Notes <span className="font-normal text-[#89938d]">(optional)</span>
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border border-[#dfe5df] px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="customer-notes"
                maxLength={500}
                onChange={updateField('notes')}
                value={form.notes}
              />
              <p className="text-right text-xs text-[#89938d]">
                {form.notes.length}/500
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#edf0ec] pt-5">
            <button
              className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? 'Saving…'
                : isEditing
                  ? 'Save changes'
                  : 'Add customer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CustomerFormDialog
