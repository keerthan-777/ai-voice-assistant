import { LoaderCircle, RotateCw } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function ProtectedRoute({ children }) {
  const { authError, isAuthenticated, isLoading, refreshSession } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        aria-label="Checking your session"
        className="flex flex-1 items-center justify-center py-20 text-emerald-800"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="animate-spin" size={28} />
      </div>
    )
  }

  if (authError) {
    return (
      <section className="mx-auto my-auto w-full max-w-md rounded-2xl border border-[#e7ebe6] bg-white p-7 text-center shadow-sm">
        <p className="text-sm leading-6 text-rose-800" role="alert">
          {authError}
        </p>
        <button
          className="mx-auto mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:opacity-65"
          disabled={isLoading}
          onClick={() => void refreshSession()}
          type="button"
        >
          <RotateCw aria-hidden="true" size={15} />
          Retry
        </button>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        state={{ from: location }}
        to="/login"
      />
    )
  }

  return children
}

export default ProtectedRoute
