import { X } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function FaqFormDialog({ faq, mode, onClose, onSubmit }) {
  const [form, setForm] = useState({
    question: faq?.question || '',
    answer: faq?.answer || '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const question = form.question.trim()
    const answer = form.answer.trim()
    if (question.length < 3) {
      setErrorMessage('Question must contain at least 3 characters.')
      return
    }
    if (answer.length < 2) {
      setErrorMessage('Answer must contain at least 2 characters.')
      return
    }

    setIsSaving(true)
    try {
      await onSubmit({ question, answer })
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Could not save this FAQ. Please try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isEditing = mode === 'edit'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="faq-form-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#edf0ec] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#17211d]" id="faq-form-title">
              {isEditing ? 'Edit FAQ' : 'Add FAQ'}
            </h2>
            <p className="mt-1 text-sm text-[#748078]">
              Add clear answers the assistant can use for customer questions.
            </p>
          </div>
          <button
            aria-label="Close FAQ form"
            className="rounded-lg p-2 text-[#748078] hover:bg-[#f3f6f3] disabled:opacity-50"
            disabled={isSaving}
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
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="faq-question"
            >
              Question <span className="text-rose-600">*</span>
            </label>
            <textarea
              className="min-h-20 w-full resize-y rounded-xl border border-[#dfe5df] px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="faq-question"
              maxLength={500}
              onChange={updateField('question')}
              required
              value={form.question}
            />
            <p className="text-right text-xs text-[#89938d]">
              {form.question.length}/500
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-[#27352e]"
              htmlFor="faq-answer"
            >
              Answer <span className="text-rose-600">*</span>
            </label>
            <textarea
              className="min-h-36 w-full resize-y rounded-xl border border-[#dfe5df] px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              id="faq-answer"
              maxLength={2000}
              onChange={updateField('answer')}
              required
              value={form.answer}
            />
            <p className="text-right text-xs text-[#89938d]">
              {form.answer.length}/2000
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-[#edf0ec] pt-5">
            <button
              className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add FAQ'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default FaqFormDialog
