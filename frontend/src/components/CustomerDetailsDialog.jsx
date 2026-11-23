import { X } from 'lucide-react'

function Detail({ label, value }) {
  return (
    <div className="border-b border-[#edf0ec] py-3 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#89938d]">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#27352e]">
        {value || 'Not provided'}
      </dd>
    </div>
  )
}

function CustomerDetailsDialog({ customer, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="customer-details-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#edf0ec] px-6 py-5">
          <div>
            <h2
              className="text-lg font-semibold text-[#17211d]"
              id="customer-details-title"
            >
              Customer details
            </h2>
            <p className="mt-1 text-sm text-[#748078]">
              Customer #{customer.id}
            </p>
          </div>
          <button
            aria-label="Close customer details"
            className="rounded-lg p-2 text-[#748078] hover:bg-[#f3f6f3]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <dl className="px-6 py-3">
          <Detail label="Name" value={customer.name} />
          <Detail label="Phone number" value={customer.phone_number} />
          <Detail label="Email" value={customer.email} />
          <Detail label="Notes" value={customer.notes} />
        </dl>
        <div className="flex justify-end border-t border-[#edf0ec] px-6 py-4">
          <button
            className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028]"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  )
}

export default CustomerDetailsDialog
