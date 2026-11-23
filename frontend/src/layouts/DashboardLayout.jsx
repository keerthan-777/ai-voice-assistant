import {
  AudioLines,
  CalendarDays,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/workspace' },
  { label: 'Customers', icon: UsersRound, path: '/workspace/customers' },
  { label: 'Appointments', icon: CalendarDays, path: '/workspace/appointments' },
  { label: 'Conversations', icon: MessageSquareText, path: '/workspace/conversations' },
  { label: 'Business Settings', icon: Settings2, path: '/workspace/settings' },
  { label: 'FAQs', icon: CircleHelp, path: '/workspace/faqs' },
]

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function DashboardLayout({ activeItem = 'Dashboard', businessName, children }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: { notice: 'You have been signed out.' },
    })
  }

  return (
    <div className="min-h-screen bg-[#f6f8f6] text-[#17211d] md:flex">
      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#e7ebe6] bg-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-[#edf0ec] px-5">
          <Link
            aria-label="AI Voice Assistant home"
            className="flex items-center gap-3"
            onClick={() => setIsSidebarOpen(false)}
            to="/workspace"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#123c32] text-white">
              <AudioLines aria-hidden="true" size={20} />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Voice<span className="text-emerald-700">well</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[#6b7770] hover:bg-[#f3f6f3] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <div className="border-b border-[#edf0ec] px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#89938d]">
            Business
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#27352e]">
            {businessName || 'Loading business…'}
          </p>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-5">
          {navigationItems.map(({ icon: Icon, label, path }) =>
            path ? (
              <Link
                aria-current={activeItem === label ? 'page' : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm ${
                  activeItem === label
                    ? 'bg-[#edf4ee] font-semibold text-[#15513d]'
                    : 'font-medium text-[#536159] hover:bg-[#f6f8f6]'
                }`}
                key={label}
                onClick={() => setIsSidebarOpen(false)}
                to={path}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                {label}
              </Link>
            ) : (
              <button
                aria-disabled="true"
                className="flex h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#929b96]"
                disabled
                key={label}
                title={`${label} will be available in a later step`}
                type="button"
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
              </button>
            ),
          )}
        </nav>

        <div className="border-t border-[#edf0ec] p-3">
          <button
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#59655e] transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between border-b border-[#e7ebe6] bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-lg p-2 text-[#536159] hover:bg-[#f3f6f3] md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#27352e]">
                Welcome back, {user.name}
              </p>
              <p className="truncate text-xs text-[#7b8580]">
                {businessName || 'Loading business…'}
              </p>
            </div>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#e7f0e9] text-xs font-semibold text-[#15513d]">
              {getInitials(user.name)}
            </span>
            <div className="hidden max-w-48 sm:block">
              <p className="truncate text-xs font-semibold text-[#27352e]">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-[#7b8580]">{user.email}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
