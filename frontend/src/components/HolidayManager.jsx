import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
} from '../services/availabilityService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

function formatHolidayDate(dateValue) {
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

function HolidayManager() {
  const [holidays, setHolidays] = useState([])
  const [holidayDate, setHolidayDate] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [holidayToDelete, setHolidayToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let active = true

    const loadHolidays = async () => {
      try {
        const result = await getHolidays()
        if (active) {
          setHolidays(result)
          setLoadError('')
        }
      } catch (error) {
        if (active) {
          setLoadError(getApiErrorMessage(error, 'Could not load holidays.'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadHolidays()
    return () => {
      active = false
    }
  }, [reloadVersion])

  const addHoliday = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const holiday = await createHoliday({
        holiday_date: holidayDate,
        name: name.trim() || null,
      })
      setHolidays((current) =>
        [...current, holiday].sort((first, second) =>
          first.holiday_date.localeCompare(second.holiday_date),
        ),
      )
      setHolidayDate('')
      setName('')
      setSuccessMessage('Holiday added successfully.')
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, 'Could not add this holiday. Please try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!holidayToDelete) {
      return
    }

    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteHoliday(holidayToDelete.id)
      setHolidays((current) =>
        current.filter((holiday) => holiday.id !== holidayToDelete.id),
      )
      setHolidayToDelete(null)
      setSuccessMessage('Holiday deleted successfully.')
    } catch (error) {
      setDeleteError(
        getApiErrorMessage(error, 'Could not delete this holiday.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const retryLoad = () => {
    setIsLoading(true)
    setLoadError('')
    setReloadVersion((version) => version + 1)
  }

  return (
    <section className="rounded-2xl border border-[#e7ebe6] bg-white shadow-[0_4px_18px_rgba(34,53,42,0.025)]">
      <div className="border-b border-[#edf0ec] px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#27352e]">Holidays</h2>
            <p className="mt-1 text-xs text-[#89938d]">
              Block appointment bookings for specific dates.
            </p>
          </div>
          <CalendarDays aria-hidden="true" className="text-emerald-800" size={19} />
        </div>
      </div>

      {isLoading ? (
        <div
          aria-label="Loading holidays"
          className="p-6 text-sm text-[#748078]"
          role="status"
        >
          Loading holidays…
        </div>
      ) : loadError ? (
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
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          {formError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {formError}
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

          <form
            className="grid gap-4 rounded-xl bg-[#f7f9f7] p-4 sm:grid-cols-[minmax(160px,0.8fr)_minmax(0,1.4fr)_auto] sm:items-end"
            onSubmit={addHoliday}
          >
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium text-[#52615a]"
                htmlFor="holiday-date"
              >
                Date <span className="text-rose-600">*</span>
              </label>
              <input
                className="h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="holiday-date"
                onChange={(event) => setHolidayDate(event.target.value)}
                required
                type="date"
                value={holidayDate}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium text-[#52615a]"
                htmlFor="holiday-name"
              >
                Description <span className="font-normal text-[#89938d]">(optional)</span>
              </label>
              <input
                className="h-10 w-full rounded-lg border border-[#dfe5df] bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                id="holiday-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Annual closure"
                value={name}
              />
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              <Plus aria-hidden="true" size={16} />
              {isSaving ? 'Adding…' : 'Add holiday'}
            </button>
          </form>

          {holidays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dfe5df] px-5 py-8 text-center">
              <p className="text-sm font-medium text-[#52615a]">No holidays configured</p>
              <p className="mt-1 text-xs text-[#89938d]">
                Add a holiday date to prevent bookings on that day.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#edf0ec] rounded-xl border border-[#edf0ec]">
              {holidays.map((holiday) => (
                <li
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  key={holiday.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#27352e]">
                      {formatHolidayDate(holiday.holiday_date)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#89938d]">
                      {holiday.name || 'Holiday'}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete holiday ${formatHolidayDate(holiday.holiday_date)}`}
                    className="rounded-lg p-2 text-[#66736b] hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => {
                      setDeleteError('')
                      setHolidayToDelete(holiday)
                    }}
                    title="Delete holiday"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section
            aria-labelledby="delete-holiday-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 aria-hidden="true" size={20} />
            </div>
            <h2
              className="mt-4 text-lg font-semibold text-[#17211d]"
              id="delete-holiday-title"
            >
              Delete this holiday?
            </h2>
            <p className="mt-2 text-sm text-[#748078]">
              {formatHolidayDate(holidayToDelete.holiday_date)} will no longer be blocked for bookings.
            </p>
            {deleteError && (
              <p
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-xl border border-[#dfe5df] px-4 text-sm font-medium text-[#52615a] hover:bg-[#f7f8f6] disabled:opacity-50"
                disabled={isDeleting}
                onClick={() => setHolidayToDelete(null)}
                type="button"
              >
                Keep holiday
              </button>
              <button
                className="h-10 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {isDeleting ? 'Deleting…' : 'Delete holiday'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default HolidayManager
