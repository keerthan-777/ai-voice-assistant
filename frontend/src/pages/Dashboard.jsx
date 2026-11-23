import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  MessageSquareText,
  Plus,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getDashboardData } from '../services/dashboardService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'
import { useAuth } from '../hooks/useAuth.js'

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function formatDateTime(dateValue) {
  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Time unavailable'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function getStatusClasses(status) {
  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === 'confirmed' || normalizedStatus === 'active') {
    return 'bg-emerald-50 text-emerald-800'
  }
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'closed') {
    return 'bg-rose-50 text-rose-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusClasses(status)}`}
    >
      {status}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, detail, iconClass }) {
  return (
    <article className="rounded-2xl border border-[#e7ebe6] bg-white p-5 shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#748078]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#17211d]">
            {value}
          </p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-xs text-[#8a948e]">{detail}</p>
    </article>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#f3f6f3] text-[#849088]">
        <Icon aria-hidden="true" size={19} />
      </span>
      <p className="mt-3 text-sm text-[#7b8580]">{message}</p>
    </div>
  )
}

function AppointmentTable({ appointments, customers }) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        message="No appointments to show."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[510px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#edf0ec] text-[11px] font-semibold uppercase tracking-wide text-[#8a948e]">
            <th className="px-5 py-3 font-semibold">Date</th>
            <th className="px-5 py-3 font-semibold">Time</th>
            <th className="px-5 py-3 font-semibold">Customer</th>
            <th className="px-5 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2ef]">
          {appointments.map((appointment) => {
            const customer = customers.get(appointment.customer_id)
            return (
              <tr className="text-[#39473f]" key={appointment.id}>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(appointment.appointment_date)}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatTime(appointment.appointment_time)}
                </td>
                <td className="px-5 py-4 font-medium text-[#27352e]">
                  {customer?.name || `Customer #${appointment.customer_id}`}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={appointment.status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="animate-pulse space-y-6" role="status">
      <div className="h-8 w-52 rounded-lg bg-[#e8ede8]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div className="h-32 rounded-2xl bg-white ring-1 ring-[#e7ebe6]" key={item} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div className="h-72 rounded-2xl bg-white ring-1 ring-[#e7ebe6]" key={item} />
        ))}
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        const result = await getDashboardData(user.business_id)
        if (active) {
          setDashboardData(result)
          setErrorMessage('')
          setStatus('success')
        }
      } catch (error) {
        if (active) {
          setDashboardData(null)
          setErrorMessage(
            getApiErrorMessage(error, 'Could not load dashboard data.'),
          )
          setStatus('error')
        }
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [reloadVersion, user.business_id])

  const customersById = useMemo(
    () => new Map((dashboardData?.customers || []).map((customer) => [customer.id, customer])),
    [dashboardData],
  )

  const todayKey = getLocalDateKey()
  const activeAppointments = (dashboardData?.appointments || []).filter(
    (appointment) => appointment.status.toLowerCase() !== 'cancelled',
  )
  const sortedByDate = [...activeAppointments].sort((first, second) =>
    `${first.appointment_date}T${first.appointment_time}`.localeCompare(
      `${second.appointment_date}T${second.appointment_time}`,
    ),
  )
  const todayAppointments = sortedByDate.filter(
    (appointment) => appointment.appointment_date === todayKey,
  )
  const upcomingAppointments = sortedByDate
    .filter((appointment) => appointment.appointment_date > todayKey)
    .slice(0, 5)

  const stats = dashboardData
    ? [
        {
          label: 'Total Customers',
          value: dashboardData.customers.length,
          detail: 'Customers in this business',
          icon: UsersRound,
          iconClass: 'bg-blue-50 text-blue-700',
        },
        {
          label: 'Total Appointments',
          value: dashboardData.appointments.length,
          detail: 'All appointment records',
          icon: CalendarDays,
          iconClass: 'bg-violet-50 text-violet-700',
        },
        {
          label: "Today's Appointments",
          value: todayAppointments.length,
          detail: 'Not cancelled',
          icon: CalendarClock,
          iconClass: 'bg-amber-50 text-amber-700',
        },
        {
          label: 'Upcoming Appointments',
          value: sortedByDate.filter(
            (appointment) => appointment.appointment_date > todayKey,
          ).length,
          detail: 'Future, not-cancelled appointments',
          icon: ArrowUpRight,
          iconClass: 'bg-emerald-50 text-emerald-700',
        },
      ]
    : []

  const retryLoading = () => {
    setDashboardData(null)
    setStatus('loading')
    setReloadVersion((version) => version + 1)
  }

  return (
    <DashboardLayout
      businessName={dashboardData?.business.business_name}
    >
      {status === 'loading' ? (
        <DashboardLoading />
      ) : status === 'error' ? (
        <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[#17211d]">
            Dashboard data is unavailable
          </h1>
          <p className="mt-2 text-sm text-rose-800" role="alert">
            {errorMessage}
          </p>
          <button
            className="mt-5 h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028]"
            onClick={retryLoading}
            type="button"
          >
            Try again
          </button>
        </section>
      ) : (
        <div className="space-y-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
                Overview
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-[#748078]">
                Here’s what’s happening with your business today.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe5df] bg-white px-3.5 text-sm font-medium text-[#52615a] transition hover:bg-[#f3f6f3]"
                to="/workspace/customers"
              >
                <Plus aria-hidden="true" size={16} />
                Add Customer
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#123c32] px-3.5 text-sm font-semibold text-white transition hover:bg-[#0d3028]"
                to="/workspace/appointments"
              >
                <CalendarDays aria-hidden="true" size={16} />
                Book Appointment
              </Link>
            </div>
          </div>

          <section aria-label="Business statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.8fr)]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
                <div className="flex items-center justify-between border-b border-[#edf0ec] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#27352e]">
                      Today’s appointments
                    </h2>
                    <p className="mt-1 text-xs text-[#89938d]">
                      {formatDate(todayKey)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f3f6f3] px-2.5 py-1 text-xs font-semibold text-[#536159]">
                    {todayAppointments.length}
                  </span>
                </div>
                {todayAppointments.length ? (
                  <AppointmentTable
                    appointments={todayAppointments}
                    customers={customersById}
                  />
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    message="No appointments scheduled for today."
                  />
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
                <div className="flex items-center justify-between border-b border-[#edf0ec] px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#27352e]">
                      Upcoming appointments
                    </h2>
                    <p className="mt-1 text-xs text-[#89938d]">
                      Future, not-cancelled appointments
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f3f6f3] px-2.5 py-1 text-xs font-semibold text-[#536159]">
                    {stats[3].value}
                  </span>
                </div>
                {upcomingAppointments.length ? (
                  <AppointmentTable
                    appointments={upcomingAppointments}
                    customers={customersById}
                  />
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    message="No upcoming appointments."
                  />
                )}
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
              <div className="flex items-center justify-between border-b border-[#edf0ec] px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#27352e]">
                    Recent conversations
                  </h2>
                  <p className="mt-1 text-xs text-[#89938d]">
                    Latest {dashboardData.conversations.length} of{' '}
                    {dashboardData.conversationTotal}
                  </p>
                </div>
                <Link
                  className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                  to="/workspace/conversations"
                >
                  View all
                  <MessageSquareText aria-hidden="true" size={16} />
                </Link>
              </div>
              {dashboardData.conversations.length ? (
                <ul className="divide-y divide-[#f0f2ef]">
                  {dashboardData.conversations.map((conversation) => {
                    const customer = customersById.get(conversation.customer_id)
                    return (
                      <li
                        className="flex items-start justify-between gap-3 px-5 py-4"
                        key={conversation.id}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-emerald-800">
                            <MessageSquareText aria-hidden="true" size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#27352e]">
                              {customer?.name ||
                                (conversation.customer_id
                                  ? `Customer #${conversation.customer_id}`
                                  : 'Unlinked customer')}
                            </p>
                            <p className="mt-1 text-xs capitalize text-[#89938d]">
                              {conversation.channel} ·{' '}
                              {formatDateTime(conversation.last_message_at)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={conversation.status} />
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={MessageSquareText}
                  message="No conversations yet."
                />
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default Dashboard
