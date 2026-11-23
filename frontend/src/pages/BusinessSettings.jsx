import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import BusinessProfileForm from '../components/BusinessProfileForm.jsx'
import HolidayManager from '../components/HolidayManager.jsx'
import WorkingHoursSection from '../components/WorkingHoursSection.jsx'
import { useAuth } from '../hooks/useAuth.js'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { getBusiness } from '../services/businessService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function BusinessSettings() {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let active = true

    const loadBusiness = async () => {
      try {
        const result = await getBusiness(user.business_id)
        if (active) {
          setBusiness(result)
          setErrorMessage('')
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, 'Could not load business information.'),
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadBusiness()
    return () => {
      active = false
    }
  }, [reloadVersion, user.business_id])

  const retryLoad = () => {
    setIsLoading(true)
    setErrorMessage('')
    setReloadVersion((version) => version + 1)
  }

  return (
    <DashboardLayout
      activeItem="Business Settings"
      businessName={business?.business_name || 'Your business'}
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
            Configuration
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211d] sm:text-[28px]">
            Business Settings
          </h1>
          <p className="mt-1 text-sm text-[#748078]">
            Manage your business profile, operating hours, and holidays.
          </p>
        </div>

        {errorMessage && (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {errorMessage}
            </p>
            {!isLoading && (
              <button
                className="self-start font-semibold text-rose-900 underline underline-offset-2 sm:self-auto"
                onClick={retryLoad}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div
            aria-label="Loading business profile"
            className="flex min-h-48 items-center justify-center rounded-2xl border border-[#e7ebe6] bg-white text-emerald-800"
            role="status"
          >
            <LoaderCircle aria-hidden="true" className="animate-spin" size={25} />
            <span className="ml-3 text-sm text-[#748078]">
              Loading business profile…
            </span>
          </div>
        ) : business ? (
          <BusinessProfileForm
            business={business}
            onBusinessUpdated={setBusiness}
          />
        ) : null}

        <WorkingHoursSection />
        <HolidayManager />
      </div>
    </DashboardLayout>
  )
}

export default BusinessSettings
