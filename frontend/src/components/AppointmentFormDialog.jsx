import { X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function AppointmentFormDialog({
  appointment,
  customers,
  mode,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    customer_id: '',
    appointment_date: appointment?.appointment_date || '',
    appointment_time: appointment?.appointment_time?.slice(0, 5) || '',
    reason: appointment?.reason || '',
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

    let appointmentData
    if (mode === 'create') {
      if (!form.customer_id) {
        setErrorMessage('Select a customer for this appointment.')
        return
      }

      appointmentData = {
        customer_id: Number(form.customer_id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        reason: form.reason.trim() || null,
      }
    } else if (mode === 'edit') {
      appointmentData = { reason: form.reason.trim() }
    } else {
      appointmentData = {
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit(appointmentData)
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Could not save this appointment. Please try again.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? 'Book appointment'
      : mode === 'edit'
        ? 'Edit appointment details'
        : 'Reschedule appointment'

  const submitLabel =
    mode === 'create'
      ? 'Book appointment'
      : mode === 'edit'
        ? 'Save details'
        : 'Save new time'

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
        aria-labelledby="appointment-form-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#edf0ec] px-6 py-5">
          <div>
            <h2
              className="text-lg font-semibold text-[#17211d]"
              id="appointment-form-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#748078]">
              {mode === 'create'
                ? 'Choose a customer and preferred appointment time.'
                : mode === 'edit'
                  ? 'Update the reason for this appointment.'
                  : 'Choose a new date and time for this appointment.'}
            </p>
          </div>
          <button
            aria-label="Close appointment form"
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

          {mode === 'create' && (
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-[#27352e]"
                htmlFor="appointment-customer"
              >
                Customer <span className="text-rose-600">*</span>
              </label>
              {customers.length ? (
                <select
                  className="h-11 w-full rounded-xl border border-[#dfe5df] bg-white px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                  id="appointment-customer"
                  onChange={updateField('customer_id')}
                  required
                  value={form.customer_id}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone_number}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Add a customer before booking an appointment.{' '}
                  <Link
                    className="font-semibold underline underline-offset-2"
                    to="/workspace/customers"
                  >
                    Go to customers
                  </Link>
                </div>
              )}
            </div>
          )}

          {mode !== 'edit' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-[#27352e]"
                  htmlFor="appointment-date"
                >
                  Date <span className="text-rose-600">*</span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                  id="appointment-date"
                  onChange={updateField('appointment_date')}
                  required
                  type="date"
                  value={form.appointment_date}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-[#27352e]"
                  htmlFor="appointment-time"
                >
                  Time <span className="text-rose-600">*</span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border border-[#dfe5df] px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                  id="appointment-time"
                  onChange={updateField('appointment_time')}
                  required
                  type="time"
                  value={form.appointment_time}
                />
              </div>
            </div>
          )}

          {mode !== 'reschedule' && (
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-[#27352e]"
                htmlFor="appointment-reason"
              >
                Reason <span className="font-normal text-[#89938d]">(optional)</span>
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border border-[#dfe5df] px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="appointment-reason"
                maxLength={500}
                onChange={updateField('reason')}
                value={form.reason}
              />
              <p className="text-right text-xs text-[#89938d]">
                {form.reason.length}/500
              </p>
            </div>
          )}

          {mode !== 'edit' && (
            <p className="rounded-xl bg-[#f3f6f3] px-4 py-3 text-xs leading-5 text-[#617068]">
              The server checks date and time validity, working hours, holidays,
              and appointment conflicts when you submit.
            </p>
          )}

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
              disabled={isSubmitting || (mode === 'create' && customers.length === 0)}
              type="submit"
            >
              {isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default AppointmentFormDialog
