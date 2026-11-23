import { X } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function ConversationCloseDialog({ conversation, onClose, onConfirm }) {
  const [errorMessage, setErrorMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  const handleConfirm = async () => {
    setIsClosing(true)
    setErrorMessage('')
    try {
      await onConfirm()
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Could not close this conversation. Please try again.',
        ),
      )
      setIsClosing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        aria-labelledby="close-conversation-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="alertdialog"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
          <X aria-hidden="true" size={20} />
        </div>
        <h2
          className="mt-4 text-lg font-semibold text-[#17211d]"
          id="close-conversation-title"
        >
          Close conversation #{conversation.id}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#748078]">
          This marks the conversation as completed. Its messages will remain
          available in the history.
        </p>
        {errorMessage && (
          <p
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
            disabled={isClosing}
            onClick={onClose}
            type="button"
          >
            Keep open
          </button>
          <button
            className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
            disabled={isClosing}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isClosing ? 'Closing…' : 'Close conversation'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConversationCloseDialog
