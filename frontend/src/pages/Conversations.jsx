import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  Search,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ConversationCloseDialog from '../components/ConversationCloseDialog.jsx'
import ConversationMessages from '../components/ConversationMessages.jsx'
import { useAuth } from '../hooks/useAuth.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getBusiness } from '../services/businessService.js'
import {
  closeConversation,
  getConversation,
  getConversations,
} from '../services/conversationService.js'
import { getCustomers } from '../services/customerService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

const PAGE_SIZE = 50

function formatConversationTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getConversationDateKey(timestamp) {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : getLocalDateKey(date)
}

function getConversationBucket(status) {
  return status.toLowerCase() === 'active' ? 'open' : 'closed'
}

function ConversationStatus({ status }) {
  const isOpen = getConversationBucket(status) === 'open'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isOpen ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {isOpen ? 'Open' : 'Closed'}
    </span>
  )
}

function Conversations() {
  const { user } = useAuth()
  const [businessName, setBusinessName] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [customers, setCustomers] = useState([])
  const [customersError, setCustomersError] = useState('')
  const [conversations, setConversations] = useState([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [listReloadVersion, setListReloadVersion] = useState(0)
  const [selectedConversationId, setSelectedConversationId] = useState(null)
  const [detailReloadVersion, setDetailReloadVersion] = useState(0)
  const [conversationDetail, setConversationDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [conversationToClose, setConversationToClose] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    const loadConversationPage = async () => {
      try {
        const page = await getConversations(PAGE_SIZE, 0)
        if (active) {
          const items = page.items.filter(
            (conversation) => conversation.business_id === user.business_id,
          )
          setConversations(items)
          setTotal(page.total)
          setNextOffset(page.offset + page.items.length)
          setListError('')
          setLoadMoreError('')
          setSelectedConversationId((current) => current ?? items[0]?.id ?? null)
        }
      } catch (error) {
        if (active) {
          setListError(
            getApiErrorMessage(
              error,
              'Could not load conversation history. Please try again.',
            ),
          )
        }
      } finally {
        if (active) {
          setListLoading(false)
        }
      }
    }

    void loadConversationPage()
    return () => {
      active = false
    }
  }, [listReloadVersion, user.business_id])

  useEffect(() => {
    let active = true

    const loadCustomers = async () => {
      try {
        const result = await getCustomers()
        if (active) {
          setCustomers(
            result.filter((customer) => customer.business_id === user.business_id),
          )
          setCustomersError('')
        }
      } catch (error) {
        if (active) {
          setCustomersError(
            getApiErrorMessage(error, 'Could not load customer names.'),
          )
        }
      }
    }

    void loadCustomers()
    return () => {
      active = false
    }
  }, [user.business_id])

  useEffect(() => {
    let active = true

    const loadBusiness = async () => {
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

    void loadBusiness()
    return () => {
      active = false
    }
  }, [user.business_id])

  useEffect(() => {
    if (selectedConversationId === null) {
      return undefined
    }

    let active = true

    const loadConversation = async () => {
      try {
        const result = await getConversation(selectedConversationId)
        if (result.conversation.business_id !== user.business_id) {
          throw new Error('Conversation not found.')
        }
        if (active) {
          setConversationDetail(result)
        }
      } catch (error) {
        if (active) {
          setDetailError(
            getApiErrorMessage(error, 'Could not load this conversation.'),
          )
        }
      }
    }

    void loadConversation()
    return () => {
      active = false
    }
  }, [detailReloadVersion, selectedConversationId, user.business_id])

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  )

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (first, second) =>
          new Date(second.last_message_at).getTime() -
          new Date(first.last_message_at).getTime(),
      ),
    [conversations],
  )

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return sortedConversations.filter((conversation) => {
      const customer = customersById.get(conversation.customer_id)
      const searchableText = [
        conversation.id,
        customer?.name,
        customer?.phone_number,
        conversation.channel,
        conversation.summary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()

      return (
        (statusFilter === 'all' ||
          getConversationBucket(conversation.status) === statusFilter) &&
        (!dateFilter ||
          getConversationDateKey(conversation.started_at) === dateFilter) &&
        (!query || searchableText.includes(query))
      )
    })
  }, [
    customersById,
    dateFilter,
    search,
    sortedConversations,
    statusFilter,
  ])

  const loadMore = async () => {
    setLoadMoreLoading(true)
    setLoadMoreError('')
    try {
      const page = await getConversations(PAGE_SIZE, nextOffset)
      const items = page.items.filter(
        (conversation) => conversation.business_id === user.business_id,
      )
      setConversations((current) => {
        const byId = new Map(current.map((conversation) => [conversation.id, conversation]))
        for (const conversation of items) {
          byId.set(conversation.id, conversation)
        }
        return [...byId.values()]
      })
      setTotal(page.total)
      setNextOffset(page.offset + page.items.length)
    } catch (error) {
      setLoadMoreError(
        getApiErrorMessage(error, 'Could not load more conversations.'),
      )
    } finally {
      setLoadMoreLoading(false)
    }
  }

  const refreshConversations = () => {
    setListLoading(true)
    setListError('')
    setListReloadVersion((version) => version + 1)
  }

  const handleCloseConversation = async () => {
    if (!conversationToClose) {
      return
    }

    const updatedConversation = await closeConversation(conversationToClose.id)
    if (updatedConversation.business_id !== user.business_id) {
      throw new Error('Conversation not found.')
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    )
    setConversationDetail((current) =>
      current?.conversation.id === updatedConversation.id
        ? { ...current, conversation: updatedConversation }
        : current,
    )
    setConversationToClose(null)
    setNotice('Conversation closed successfully.')
  }

  const hasMore = nextOffset < total
  const selectedConversation =
    conversationDetail?.conversation.id === selectedConversationId
      ? conversationDetail.conversation
      : null
  const selectedCustomer = selectedConversation
    ? customersById.get(selectedConversation.customer_id)
    : null
  const detailLoading =
    selectedConversationId !== null && !detailError && !selectedConversation
  const detailPanelVisible = selectedConversationId !== null

  return (
    <DashboardLayout
      activeItem="Conversations"
      businessName={businessName || 'Your business'}
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
            Customer interactions
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
            Conversation History
          </h1>
          <p className="mt-1 text-sm text-[#748078]">
            Review customer messages and assistant replies.
          </p>
        </div>

        {businessError && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            {businessError}
          </p>
        )}
        {customersError && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="alert"
          >
            {customersError} Conversations are still available by ID.
          </p>
        )}
        {notice && (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(330px,0.9fr)_minmax(0,1.35fr)]">
          <section
            aria-label="Conversation list"
            className={`min-w-0 overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)] ${
              detailPanelVisible ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-[#edf0ec] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#27352e]">
                    Conversations
                  </h2>
                  <p className="mt-1 text-xs text-[#89938d]">
                    {conversations.length} loaded of {total}
                  </p>
                </div>
                <MessageSquareText
                  aria-hidden="true"
                  className="text-emerald-800"
                  size={19}
                />
              </div>

              <div className="mt-4 space-y-3">
                <label className="relative block">
                  <span className="sr-only">Search loaded conversations</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89938d]"
                    size={16}
                  />
                  <input
                    className="h-10 w-full rounded-xl border border-[#dfe5df] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa39e] focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, channel, summary, ID"
                    type="search"
                    value={search}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[#dfe5df] px-3">
                    <span className="sr-only">Filter by status</span>
                    <select
                      aria-label="Filter by status"
                      className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#52615a] outline-none"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[#dfe5df] px-3">
                    <CalendarDays
                      aria-hidden="true"
                      className="shrink-0 text-[#89938d]"
                      size={15}
                    />
                    <span className="sr-only">Filter by start date</span>
                    <input
                      aria-label="Filter by start date"
                      className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#52615a] outline-none"
                      onChange={(event) => setDateFilter(event.target.value)}
                      type="date"
                      value={dateFilter}
                    />
                  </label>
                </div>
                {(search || dateFilter || statusFilter !== 'all') && (
                  <button
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                    onClick={() => {
                      setSearch('')
                      setDateFilter('')
                      setStatusFilter('all')
                    }}
                    type="button"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {listLoading ? (
              <div
                aria-label="Loading conversations"
                className="flex min-h-64 items-center justify-center text-emerald-800"
                role="status"
              >
                <LoaderCircle aria-hidden="true" className="animate-spin" size={25} />
                <span className="ml-3 text-sm text-[#748078]">
                  Loading conversations…
                </span>
              </div>
            ) : listError ? (
              <div className="p-5">
                <p className="text-sm text-rose-800" role="alert">
                  {listError}
                </p>
                <button
                  className="mt-3 text-sm font-semibold text-rose-900 underline underline-offset-2"
                  onClick={refreshConversations}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
                <MessageSquareText
                  aria-hidden="true"
                  className="text-[#9aa39e]"
                  size={24}
                />
                <h3 className="mt-3 text-sm font-semibold text-[#27352e]">
                  No conversations yet
                </h3>
                <p className="mt-1 text-sm text-[#7b8580]">
                  Conversations will appear here when customers contact your assistant.
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
                <Search aria-hidden="true" className="text-[#9aa39e]" size={22} />
                <p className="mt-3 text-sm font-medium text-[#52615a]">
                  No matching conversations
                </p>
              </div>
            ) : (
              <ul className="max-h-[65vh] divide-y divide-[#f0f2ef] overflow-y-auto">
                {filteredConversations.map((conversation) => {
                  const customer = customersById.get(conversation.customer_id)
                  const isSelected = conversation.id === selectedConversationId

                  return (
                    <li key={conversation.id}>
                      <button
                        aria-pressed={isSelected}
                        className={`w-full px-4 py-4 text-left transition sm:px-5 ${
                          isSelected
                            ? 'bg-[#f0f6f1]'
                            : 'bg-white hover:bg-[#fafbfa]'
                        }`}
                        onClick={() => {
                          setNotice('')
                          setConversationDetail(null)
                          setDetailError('')
                          setSelectedConversationId(conversation.id)
                          setDetailReloadVersion((version) => version + 1)
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#27352e]">
                              {customer?.name ||
                                (conversation.customer_id
                                  ? `Customer #${conversation.customer_id}`
                                  : 'Guest conversation')}
                            </p>
                            <p className="mt-1 text-xs text-[#89938d]">
                              Conversation #{conversation.id} ·{' '}
                              <span className="capitalize">{conversation.channel}</span>
                            </p>
                          </div>
                          <ConversationStatus status={conversation.status} />
                        </div>
                        {conversation.summary ? (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#68756d]">
                            {conversation.summary}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs italic text-[#9aa39e]">
                            No summary available
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#89938d]">
                          <span>
                            Started {formatConversationTime(conversation.started_at)}
                          </span>
                          <span>
                            Last message {formatConversationTime(conversation.last_message_at)}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {!listLoading && hasMore && (
              <div className="border-t border-[#edf0ec] p-4 text-center">
                {loadMoreError && (
                  <p className="mb-2 text-sm text-rose-800" role="alert">
                    {loadMoreError}
                  </p>
                )}
                <button
                  className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-50"
                  disabled={loadMoreLoading}
                  onClick={() => void loadMore()}
                  type="button"
                >
                  {loadMoreLoading ? 'Loading…' : 'Load more conversations'}
                </button>
              </div>
            )}
          </section>

          <section
            aria-label="Conversation details"
            className={`min-w-0 overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)] ${
              detailPanelVisible ? 'block' : 'hidden lg:block'
            }`}
          >
            {selectedConversationId && (
              <button
                className="inline-flex items-center gap-1 px-4 pt-4 text-sm font-medium text-emerald-800 lg:hidden"
                onClick={() => setSelectedConversationId(null)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={17} />
                Back to conversations
              </button>
            )}
            {detailLoading ? (
              <div
                aria-label="Loading conversation details"
                className="flex min-h-[420px] items-center justify-center text-emerald-800"
                role="status"
              >
                <LoaderCircle aria-hidden="true" className="animate-spin" size={26} />
                <span className="ml-3 text-sm text-[#748078]">
                  Loading conversation…
                </span>
              </div>
            ) : detailError && selectedConversationId !== null ? (
              <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-sm text-rose-800" role="alert">
                    {detailError}
                  </p>
                  <button
                    className="mt-3 text-sm font-semibold text-rose-900 underline underline-offset-2"
                    onClick={() => {
                      setConversationDetail(null)
                      setDetailError('')
                      setDetailReloadVersion((version) => version + 1)
                    }}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !selectedConversation ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <MessageSquareText
                  aria-hidden="true"
                  className="text-[#a1aaa5]"
                  size={28}
                />
                <h2 className="mt-4 text-sm font-semibold text-[#27352e]">
                  Select a conversation
                </h2>
                <p className="mt-1 text-sm text-[#7b8580]">
                  Choose a conversation to view its messages and summary.
                </p>
              </div>
            ) : (
              <>
                <header className="flex flex-col gap-4 border-b border-[#edf0ec] p-4 sm:p-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[#17211d]">
                        {selectedCustomer?.name ||
                          (selectedConversation.customer_id
                            ? `Customer #${selectedConversation.customer_id}`
                            : 'Guest conversation')}
                      </h2>
                      <ConversationStatus status={selectedConversation.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#89938d]">
                      Conversation #{selectedConversation.id} ·{' '}
                      <span className="capitalize">{selectedConversation.channel}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#748078]">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" size={14} />
                        Started {formatConversationTime(selectedConversation.started_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 aria-hidden="true" size={14} />
                        Last message {formatConversationTime(selectedConversation.last_message_at)}
                      </span>
                    </div>
                  </div>
                  {selectedConversation.status.toLowerCase() === 'active' && (
                    <button
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe5df] px-3 text-sm font-medium text-[#52615a] hover:bg-[#f3f6f3]"
                      onClick={() => setConversationToClose(selectedConversation)}
                      type="button"
                    >
                      Close conversation
                    </button>
                  )}
                </header>

                <div className="border-b border-[#edf0ec] bg-[#fbfcfb] px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#89938d]">
                    Conversation summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52615a]">
                    {selectedConversation.summary || 'No summary available.'}
                  </p>
                </div>

                <div className="border-b border-[#edf0ec] px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-[#27352e]">
                    Message history
                  </h3>
                  <p className="mt-0.5 text-xs text-[#89938d]">
                    {conversationDetail.messages.length}{' '}
                    {conversationDetail.messages.length === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                <div className="max-h-[55vh] min-h-60 overflow-y-auto px-4 py-5 sm:px-5">
                  <ConversationMessages
                    customerName={selectedCustomer?.name}
                    messages={conversationDetail.messages}
                  />
                </div>
              </>
            )}
          </section>
        </div>

        {hasMore && !listLoading && (
          <p className="text-center text-xs text-[#89938d]">
            Search and filters apply to the {conversations.length} conversations loaded so far.
          </p>
        )}
      </div>

      {conversationToClose && (
        <ConversationCloseDialog
          conversation={conversationToClose}
          onClose={() => setConversationToClose(null)}
          onConfirm={handleCloseConversation}
        />
      )}
    </DashboardLayout>
  )
}

export default Conversations
