import {
  AlertCircle,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import AppointmentFormDialog from '../components/AppointmentFormDialog.jsx'
import { useAuth } from '../hooks/useAuth.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getBusiness } from '../services/businessService.js'
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  getAppointments,
  updateAppointment,
} from '../services/appointmentService.js'
import { getCustomers } from '../services/customerService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

const appointmentGroups = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All appointments' },
]

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatAppointmentDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    return dateValue
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatAppointmentTime(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeValue
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function getAppointmentStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-800'
    case 'cancelled':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function AppointmentStatus({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getAppointmentStatusClass(status)}`}
    >
      {status}
    </span>
  )
}

function Appointments() {
  const { user } = useAuth()
  const [businessName, setBusinessName] = useState('')
  const [businessError, setBusinessError] = useState('')
  const [appointments, setAppointments] = useState([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [appointmentReloadVersion, setAppointmentReloadVersion] = useState(0)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState('')
  const [customerReloadVersion, setCustomerReloadVersion] = useState(0)
  const [category, setCategory] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    let active = true

    const loadAppointments = async () => {
      try {
        const result = await getAppointments()
        if (active) {
          setAppointments(
            result.filter(
              (appointment) => appointment.business_id === user.business_id,
            ),
          )
          setAppointmentsError('')
        }
      } catch (error) {
        if (active) {
          setAppointmentsError(
            getApiErrorMessage(
              error,
              'Could not load appointments. Please try again.',
            ),
          )
        }
      } finally {
        if (active) {
          setAppointmentsLoading(false)
        }
      }
    }

    void loadAppointments()
    return () => {
      active = false
    }
  }, [appointmentReloadVersion, user.business_id])

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
            getApiErrorMessage(
              error,
              'Could not load customers for appointment booking.',
            ),
          )
        }
      } finally {
        if (active) {
          setCustomersLoading(false)
        }
      }
    }

    void loadCustomers()
    return () => {
      active = false
    }
  }, [customerReloadVersion, user.business_id])

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

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  )

  const todayKey = getLocalDateKey()
  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((first, second) =>
        `${first.appointment_date}T${first.appointment_time}`.localeCompare(
          `${second.appointment_date}T${second.appointment_time}`,
        ),
      ),
    [appointments],
  )
  const counts = useMemo(
    () => ({
      upcoming: appointments.filter(
        (appointment) => appointment.appointment_date > todayKey,
      ).length,
      today: appointments.filter(
        (appointment) => appointment.appointment_date === todayKey,
      ).length,
      past: appointments.filter(
        (appointment) => appointment.appointment_date < todayKey,
      ).length,
      all: appointments.length,
    }),
    [appointments, todayKey],
  )
  const statuses = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.status))].sort(),
    [appointments],
  )

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    return sortedAppointments.filter((appointment) => {
      const inCategory =
        category === 'all' ||
        (category === 'upcoming' && appointment.appointment_date > todayKey) ||
        (category === 'today' && appointment.appointment_date === todayKey) ||
        (category === 'past' && appointment.appointment_date < todayKey)
      const customer = customersById.get(appointment.customer_id)
      const searchableText = [
        customer?.name,
        customer?.phone_number,
        appointment.reason,
        appointment.appointment_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()

      return (
        inCategory &&
        (statusFilter === 'all' || appointment.status === statusFilter) &&
        (!dateFilter || appointment.appointment_date === dateFilter) &&
        (!query || searchableText.includes(query))
      )
    })
  }, [
    category,
    customersById,
    dateFilter,
    search,
    sortedAppointments,
    statusFilter,
    todayKey,
  ])

  const refreshAppointments = () => {
    setAppointmentsLoading(true)
    setAppointmentsError('')
    setAppointmentReloadVersion((version) => version + 1)
  }

  const refreshCustomers = () => {
    setCustomersLoading(true)
    setCustomersError('')
    setCustomerReloadVersion((version) => version + 1)
  }

  const openAppointmentForm = async (mode, appointmentId) => {
    setNotice('')
    setActionError('')

    if (mode === 'create') {
      setDialog({ type: 'form', mode, appointment: null })
      return
    }

    setDialog({ type: 'loading' })
    try {
      const appointment = await getAppointment(appointmentId)
      if (appointment.business_id !== user.business_id) {
        throw new Error('Appointment not found.')
      }
      setDialog({ type: 'form', mode, appointment })
    } catch (error) {
      setDialog(null)
      setActionError(
        getApiErrorMessage(error, 'Could not load this appointment.'),
      )
    }
  }

  const saveAppointment = async (appointmentData) => {
    if (dialog.mode === 'create') {
      await createAppointment(appointmentData)
      setNotice('Appointment booked successfully.')
    } else {
      await updateAppointment(dialog.appointment.id, appointmentData)
      setNotice(
        dialog.mode === 'reschedule'
          ? 'Appointment rescheduled successfully.'
          : 'Appointment details updated successfully.',
      )
    }

    setDialog(null)
    refreshAppointments()
  }

  const confirmCancellation = async () => {
    if (!appointmentToCancel) {
      return
    }

    setIsCancelling(true)
    setCancelError('')
    try {
      await cancelAppointment(appointmentToCancel.id)
      setNotice('Appointment cancelled successfully.')
      setAppointmentToCancel(null)
      refreshAppointments()
    } catch (error) {
      setCancelError(
        getApiErrorMessage(
          error,
          'Could not cancel this appointment. Please try again.',
        ),
      )
    } finally {
      setIsCancelling(false)
    }
  }

  const cancelConfirmation = appointmentToCancel && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        aria-labelledby="cancel-appointment-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="alertdialog"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <X aria-hidden="true" size={20} />
        </div>
        <h2
          className="mt-4 text-lg font-semibold text-[#17211d]"
          id="cancel-appointment-title"
        >
          Cancel this appointment?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#748078]">
          {customersById.get(appointmentToCancel.customer_id)?.name ||
            `Customer #${appointmentToCancel.customer_id}`}{' '}
          · {formatAppointmentDate(appointmentToCancel.appointment_date)} at{' '}
          {formatAppointmentTime(appointmentToCancel.appointment_time)}
        </p>
        {cancelError && (
          <p
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {cancelError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
            disabled={isCancelling}
            onClick={() => setAppointmentToCancel(null)}
            type="button"
          >
            Keep appointment
          </button>
          <button
            className="h-10 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
            disabled={isCancelling}
            onClick={() => void confirmCancellation()}
            type="button"
          >
            {isCancelling ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
        </div>
      </section>
    </div>
  )

  return (
    <DashboardLayout
      activeItem="Appointments"
      businessName={businessName || 'Your business'}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              Scheduling
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
              Appointments
            </h1>
            <p className="mt-1 text-sm text-[#748078]">
              Book, review, reschedule, and cancel appointments.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white transition hover:bg-[#0d3028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
            disabled={customersLoading || Boolean(customersError)}
            onClick={() => void openAppointmentForm('create')}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Book Appointment
          </button>
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
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {customersError}
            </p>
            <button
              className="self-start font-semibold text-rose-900 underline underline-offset-2 sm:self-auto"
              onClick={refreshCustomers}
              type="button"
            >
              Retry customers
            </button>
          </div>
        )}
        {appointmentsError && (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {appointmentsError}
            </p>
            <button
              className="self-start font-semibold text-rose-900 underline underline-offset-2 sm:self-auto"
              onClick={refreshAppointments}
              type="button"
            >
              Retry appointments
            </button>
          </div>
        )}
        {actionError && (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {actionError}
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

        <section
          aria-label="Appointment list"
          className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]"
        >
          <div className="flex flex-col gap-4 border-b border-[#edf0ec] p-4 sm:px-5">
            <div aria-label="Appointment date groups" className="flex flex-wrap gap-2" role="group">
              {appointmentGroups.map((group) => (
                <button
                  aria-pressed={category === group.key}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    category === group.key
                      ? 'bg-[#edf4ee] font-semibold text-[#15513d]'
                      : 'font-medium text-[#6b7770] hover:bg-[#f6f8f6]'
                  }`}
                  key={group.key}
                  onClick={() => setCategory(group.key)}
                  type="button"
                >
                  {group.label}
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px]">
                    {counts[group.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
              <label className="relative block">
                <span className="sr-only">Search appointments</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89938d]"
                  size={17}
                />
                <input
                  className="h-10 w-full rounded-xl border border-[#dfe5df] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9aa39e] focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer or reason"
                  type="search"
                  value={search}
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#dfe5df] px-3">
                <CalendarDays aria-hidden="true" className="shrink-0 text-[#89938d]" size={16} />
                <span className="sr-only">Filter by date</span>
                <input
                  aria-label="Filter by date"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#52615a] outline-none"
                  onChange={(event) => setDateFilter(event.target.value)}
                  type="date"
                  value={dateFilter}
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#dfe5df] px-3">
                <span className="text-xs font-medium text-[#89938d]">Status</span>
                <select
                  aria-label="Filter by status"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#52615a] outline-none"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {(search || dateFilter || statusFilter !== 'all') && (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-[#68756d] hover:bg-[#f3f6f3]"
                  onClick={() => {
                    setSearch('')
                    setDateFilter('')
                    setStatusFilter('all')
                  }}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={15} />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {appointmentsLoading ? (
            <div
              aria-label="Loading appointments"
              className="flex min-h-64 items-center justify-center text-emerald-800"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="animate-spin" size={27} />
              <span className="ml-3 text-sm text-[#748078]">Loading appointments…</span>
            </div>
          ) : appointmentsError ? (
            <div className="min-h-32" />
          ) : appointments.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f3f6f3] text-[#7b8580]">
                <CalendarDays aria-hidden="true" size={22} />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-[#27352e]">
                No appointments yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#7b8580]">
                Book an appointment to see it in this schedule.
              </p>
              <button
                className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                disabled={customersLoading || Boolean(customersError)}
                onClick={() => void openAppointmentForm('create')}
                type="button"
              >
                Book an appointment
              </button>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
              <Search aria-hidden="true" className="text-[#9aa39e]" size={23} />
              <h2 className="mt-3 text-sm font-semibold text-[#27352e]">
                No matching appointments
              </h2>
              <p className="mt-1 text-sm text-[#7b8580]">
                Try changing the search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#edf0ec] bg-[#fbfcfb] text-[11px] font-semibold uppercase tracking-wide text-[#89938d]">
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Time</th>
                    <th className="px-5 py-3.5 font-semibold">Reason</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2ef]">
                  {filteredAppointments.map((appointment) => {
                    const customer = customersById.get(appointment.customer_id)
                    const canUpdate = appointment.status.toLowerCase() === 'confirmed'

                    return (
                      <tr className="text-[#52615a]" key={appointment.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-[#27352e]">
                            {customer?.name || `Customer #${appointment.customer_id}`}
                          </p>
                          {customer?.phone_number && (
                            <p className="mt-1 text-xs text-[#89938d]">
                              {customer.phone_number}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {formatAppointmentDate(appointment.appointment_date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 aria-hidden="true" className="text-[#89938d]" size={14} />
                            {formatAppointmentTime(appointment.appointment_time)}
                          </span>
                        </td>
                        <td
                          className="max-w-56 truncate px-5 py-4 text-[#748078]"
                          title={appointment.reason || undefined}
                        >
                          {appointment.reason || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <AppointmentStatus status={appointment.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          {canUpdate ? (
                            <div className="flex justify-end gap-1">
                              <button
                                aria-label={`Edit appointment for ${customer?.name || `customer ${appointment.customer_id}`}`}
                                className="rounded-lg p-2 text-[#66736b] hover:bg-[#edf4ee] hover:text-emerald-800"
                                onClick={() =>
                                  void openAppointmentForm('edit', appointment.id)
                                }
                                title="Edit appointment details"
                                type="button"
                              >
                                <Pencil aria-hidden="true" size={16} />
                              </button>
                              <button
                                aria-label={`Reschedule appointment for ${customer?.name || `customer ${appointment.customer_id}`}`}
                                className="rounded-lg p-2 text-[#66736b] hover:bg-[#edf4ee] hover:text-emerald-800"
                                onClick={() =>
                                  void openAppointmentForm('reschedule', appointment.id)
                                }
                                title="Reschedule appointment"
                                type="button"
                              >
                                <CalendarDays aria-hidden="true" size={16} />
                              </button>
                              <button
                                aria-label={`Cancel appointment for ${customer?.name || `customer ${appointment.customer_id}`}`}
                                className="rounded-lg p-2 text-[#66736b] hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => {
                                  setCancelError('')
                                  setAppointmentToCancel(appointment)
                                }}
                                title="Cancel appointment"
                                type="button"
                              >
                                <X aria-hidden="true" size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-xs text-[#89938d]">
                              No actions
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!appointmentsLoading && !appointmentsError && appointments.length > 0 && (
            <div className="border-t border-[#edf0ec] px-5 py-3 text-xs text-[#89938d]">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </div>
          )}
        </section>
      </div>

      {dialog?.type === 'loading' && (
        <div
          aria-label="Loading appointment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="animate-spin text-white" size={30} />
        </div>
      )}
      {dialog?.type === 'form' && (
        <AppointmentFormDialog
          appointment={dialog.appointment}
          customers={customers}
          key={`${dialog.mode}-${dialog.appointment?.id || 'new'}`}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onSubmit={saveAppointment}
        />
      )}
      {cancelConfirmation}
    </DashboardLayout>
  )
}

export default Appointments
