import { AudioLines, Circle } from 'lucide-react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function AppLayout() {
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', {
      replace: true,
      state: { notice: 'You have been signed out.' },
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f8f6]">
      <header className="border-b border-[#e8ebe7] bg-white/80">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            aria-label="AI Voice Assistant home"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
            to="/"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#123c32] text-white shadow-sm">
              <AudioLines aria-hidden="true" size={20} strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-[#17211d] sm:text-base">
              Voice<span className="text-emerald-700">well</span>
            </span>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden max-w-48 truncate text-sm text-[#54615b] sm:block">
                {user.name}
              </span>
              <button
                className="rounded-lg border border-[#dfe5df] px-3 py-2 text-xs font-semibold text-[#27352e] transition hover:bg-[#f7f8f6] focus-visible:outline-2 focus-visible:outline-emerald-700"
                onClick={handleLogout}
                type="button"
              >
                Sign out
              </button>
            </div>
          ) : (
            <nav aria-label="Account" className="flex items-center gap-2 sm:gap-4">
              <Link
                className="px-2 py-2 text-sm font-medium text-[#52615a] hover:text-[#123c32]"
                to="/login"
              >
                Sign in
              </Link>
              <Link
                className="rounded-lg bg-[#123c32] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0d3028] sm:px-4 sm:text-sm"
                to="/register"
              >
                Create account
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-1 flex-col px-5 sm:px-8">
        <Outlet />
        <footer className="mt-auto flex flex-col gap-2 border-t border-[#e8ebe7] py-5 text-xs text-[#7b8580] sm:flex-row sm:items-center sm:justify-between">
          <span>AI Voice Assistant</span>
          <span className="inline-flex items-center gap-2">
            <Circle aria-hidden="true" className="fill-emerald-500 text-emerald-500" size={7} />
            Secure account access
          </span>
        </footer>
      </main>
    </div>
  )
}

export default AppLayout
