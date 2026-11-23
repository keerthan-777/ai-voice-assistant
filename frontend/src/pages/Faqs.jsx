import {
  AlertCircle,
  CircleHelp,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import FaqFormDialog from '../components/FaqFormDialog.jsx'
import { useAuth } from '../hooks/useAuth.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getBusiness } from '../services/businessService.js'
import {
  createFaq,
  deactivateFaq,
  getFaq,
  getFaqs,
  updateFaq,
} from '../services/faqService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function Faqs() {
  const { user } = useAuth()
  const [businessName, setBusinessName] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [faqs, setFaqs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [faqToDeactivate, setFaqToDeactivate] = useState(null)
  const [deactivateError, setDeactivateError] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let active = true

    const loadFaqs = async () => {
      try {
        const result = await getFaqs()
        if (active) {
          setFaqs(
            result.filter((faq) => faq.business_id === user.business_id),
          )
          setLoadError('')
        }
      } catch (error) {
        if (active) {
          setLoadError(getApiErrorMessage(error, 'Could not load FAQs.'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadFaqs()
    return () => {
      active = false
    }
  }, [reloadVersion, user.business_id])

  useEffect(() => {
    let active = true

    const loadBusinessName = async () => {
      try {
        const business = await getBusiness(user.business_id)
        if (active) {
          setBusinessName(business.business_name)
          setBusinessError('')
        }
      } catch (error) {
        if (active) {
          setBusinessName('')
          setBusinessError(
            getApiErrorMessage(error, 'Could not load your business details.'),
          )
        }
      }
    }

    void loadBusinessName()
    return () => {
      active = false
    }
  }, [user.business_id])

  const visibleFaqs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return faqs.filter((faq) => {
      const matchesStatus =
        filter === 'all' ||
        (filter === 'active' ? faq.is_active : !faq.is_active)
      const matchesQuery =
        !query ||
        `${faq.question} ${faq.answer}`.toLocaleLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [faqs, filter, search])

  const activeCount = faqs.filter((faq) => faq.is_active).length

  const openCreate = () => {
    setActionError('')
    setSuccessMessage('')
    setDialog({ type: 'form', mode: 'create', faq: null })
  }

  const openEdit = async (faqId) => {
    setActionError('')
    setSuccessMessage('')
    setDialog({ type: 'loading' })
    try {
      const faq = await getFaq(faqId)
      if (faq.business_id !== user.business_id) {
        throw new Error('FAQ not found.')
      }
      setDialog({ type: 'form', mode: 'edit', faq })
    } catch (error) {
      setDialog(null)
      setActionError(getApiErrorMessage(error, 'Could not load this FAQ.'))
    }
  }

  const saveFaq = async (faqData) => {
    if (dialog.mode === 'edit') {
      const updatedFaq = await updateFaq(dialog.faq.id, faqData)
      setFaqs((current) =>
        current.map((faq) => (faq.id === updatedFaq.id ? updatedFaq : faq)),
      )
      setSuccessMessage('FAQ updated successfully.')
    } else {
      const createdFaq = await createFaq(faqData)
      setFaqs((current) => [createdFaq, ...current])
      setSuccessMessage('FAQ added successfully.')
    }
    setDialog(null)
  }

  const confirmDeactivation = async () => {
    if (!faqToDeactivate) {
      return
    }

    setIsDeactivating(true)
    setDeactivateError('')
    try {
      await deactivateFaq(faqToDeactivate.id)
      setFaqs((current) =>
        current.map((faq) =>
          faq.id === faqToDeactivate.id ? { ...faq, is_active: false } : faq,
        ),
      )
      setFaqToDeactivate(null)
      setSuccessMessage('FAQ deactivated successfully.')
    } catch (error) {
      setDeactivateError(
        getApiErrorMessage(error, 'Could not deactivate this FAQ.'),
      )
    } finally {
      setIsDeactivating(false)
    }
  }

  const activateFaq = async (faq) => {
    setActionError('')
    setSuccessMessage('')
    try {
      const updatedFaq = await updateFaq(faq.id, { is_active: true })
      setFaqs((current) =>
        current.map((item) => (item.id === updatedFaq.id ? updatedFaq : item)),
      )
      setSuccessMessage('FAQ activated successfully.')
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, 'Could not activate this FAQ.'),
      )
    }
  }

  const retryLoad = () => {
    setIsLoading(true)
    setLoadError('')
    setReloadVersion((version) => version + 1)
  }

  return (
    <DashboardLayout
      activeItem="FAQs"
      businessName={businessName || 'Your business'}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              Knowledge base
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
              FAQs
            </h1>
            <p className="mt-1 text-sm text-[#748078]">
              Manage the questions and answers available to your assistant.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white transition hover:bg-[#0d3028] sm:self-auto"
            onClick={openCreate}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Add FAQ
          </button>
        </div>

        {businessError && (
          <p
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
            {businessError}
          </p>
        )}
        {actionError && (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {actionError}
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

        <section
          aria-label="FAQ list"
          className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]"
        >
          <div className="flex flex-col gap-4 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf4ee] text-emerald-800">
                <CircleHelp aria-hidden="true" size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#27352e]">
                  {faqs.length} {faqs.length === 1 ? 'FAQ' : 'FAQs'}
                </p>
                <p className="mt-0.5 text-xs text-[#89938d]">
                  {activeCount} active
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_160px]">
              <label className="relative block">
                <span className="sr-only">Search FAQs</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89938d]"
                  size={16}
                />
                <input
                  className="h-10 w-full rounded-xl border border-[#dfe5df] pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search questions or answers"
                  type="search"
                  value={search}
                />
              </label>
              <select
                aria-label="Filter FAQs by status"
                className="h-10 rounded-xl border border-[#dfe5df] bg-white px-3 text-sm text-[#52615a] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                onChange={(event) => setFilter(event.target.value)}
                value={filter}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loadError ? (
            <div className="p-5">
              <p className="text-sm text-rose-800" role="alert">{loadError}</p>
              <button
                className="mt-3 text-sm font-semibold text-rose-900 underline underline-offset-2"
                onClick={retryLoad}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div
              aria-label="Loading FAQs"
              className="flex min-h-56 items-center justify-center text-emerald-800"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="animate-spin" size={25} />
              <span className="ml-3 text-sm text-[#748078]">Loading FAQs…</span>
            </div>
          ) : faqs.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
              <CircleHelp aria-hidden="true" className="text-[#9aa39e]" size={24} />
              <h2 className="mt-3 text-sm font-semibold text-[#27352e]">
                No FAQs yet
              </h2>
              <p className="mt-1 text-sm text-[#7b8580]">
                Add your first question and answer for the assistant.
              </p>
              <button
                className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                onClick={openCreate}
                type="button"
              >
                Add an FAQ
              </button>
            </div>
          ) : visibleFaqs.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm text-[#7b8580]">
              No FAQs match the current search or filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#edf0ec] bg-[#fbfcfb] text-[11px] font-semibold uppercase tracking-wide text-[#89938d]">
                    <th className="px-5 py-3.5 font-semibold">Question</th>
                    <th className="px-5 py-3.5 font-semibold">Answer</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2ef]">
                  {visibleFaqs.map((faq) => (
                    <tr className="align-top text-[#52615a]" key={faq.id}>
                      <td className="max-w-72 px-5 py-4 font-medium text-[#27352e]">
                        <p className="line-clamp-3">{faq.question}</p>
                      </td>
                      <td className="max-w-[420px] px-5 py-4">
                        <p className="line-clamp-3 whitespace-pre-wrap text-[#68756d]">
                          {faq.answer}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            faq.is_active
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {faq.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            aria-label={`Edit FAQ ${faq.id}`}
                            className="rounded-lg p-2 text-[#66736b] hover:bg-[#edf4ee] hover:text-emerald-800"
                            onClick={() => void openEdit(faq.id)}
                            title="Edit FAQ"
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={16} />
                          </button>
                          {faq.is_active ? (
                            <button
                              aria-label={`Deactivate FAQ ${faq.id}`}
                              className="rounded-lg p-2 text-[#66736b] hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                setDeactivateError('')
                                setFaqToDeactivate(faq)
                              }}
                              title="Deactivate FAQ"
                              type="button"
                            >
                              <ToggleLeft aria-hidden="true" size={17} />
                            </button>
                          ) : (
                            <button
                              aria-label={`Activate FAQ ${faq.id}`}
                              className="rounded-lg p-2 text-[#66736b] hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => void activateFaq(faq)}
                              title="Activate FAQ"
                              type="button"
                            >
                              <ToggleRight aria-hidden="true" size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {dialog?.type === 'loading' && (
        <div
          aria-label="Loading FAQ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="animate-spin text-white" size={30} />
        </div>
      )}
      {dialog?.type === 'form' && (
        <FaqFormDialog
          faq={dialog.faq}
          key={`${dialog.mode}-${dialog.faq?.id || 'new'}`}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onSubmit={saveFaq}
        />
      )}
      {faqToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section
            aria-labelledby="deactivate-faq-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 aria-hidden="true" size={20} />
            </div>
            <h2
              className="mt-4 text-lg font-semibold text-[#17211d]"
              id="deactivate-faq-title"
            >
              Deactivate this FAQ?
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-[#748078]">
              {faqToDeactivate.question}
            </p>
            <p className="mt-2 text-xs text-[#89938d]">
              The FAQ will be kept and can be activated again later.
            </p>
            {deactivateError && (
              <p
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                {deactivateError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
                disabled={isDeactivating}
                onClick={() => setFaqToDeactivate(null)}
                type="button"
              >
                Keep active
              </button>
              <button
                className="h-10 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeactivating}
                onClick={() => void confirmDeactivation()}
                type="button"
              >
                {isDeactivating ? 'Deactivating…' : 'Deactivate FAQ'}
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  )
}

export default Faqs
