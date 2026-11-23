import { useEffect, useState } from 'react'
import {
  getWorkingHours,
  updateWorkingHours,
} from '../services/availabilityService.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function toSchedule(items) {
  return WEEKDAYS.map((day, weekday) => {
    const configured = items.find((item) => item.weekday === weekday)
    return {
      day,
      weekday,
      isOpen: Boolean(configured),
      open_time: configured?.open_time?.slice(0, 5) || '',
      close_time: configured?.close_time?.slice(0, 5) || '',
    }
  })
}

function WorkingHoursSection() {
  const [schedule, setSchedule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    let active = true

    const loadSchedule = async () => {
      try {
        const result = await getWorkingHours()
        if (active) {
          setSchedule(toSchedule(result))
          setLoadError('')
        }
      } catch (error) {
        if (active) {
          setLoadError(
            getApiErrorMessage(error, 'Could not load working hours.'),
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadSchedule()
    return () => {
      active = false
    }
  }, [reloadVersion])

  const updateDay = (weekday, field, value) => {
    setSchedule((current) =>
      current.map((item) =>
        item.weekday === weekday ? { ...item, [field]: value } : item,
      ),
    )
    setSaveError('')
    setSuccessMessage('')
  }

  const saveSchedule = async (event) => {
    event.preventDefault()
    setSaveError('')
    setSuccessMessage('')

    const openDays = schedule.filter((day) => day.isOpen)
    for (const day of openDays) {
      if (!day.open_time || !day.close_time) {
        setSaveError(`Set both opening and closing times for ${day.day}.`)
        return
      }
      if (day.close_time <= day.open_time) {
        setSaveError(`Closing time must be later than opening time on ${day.day}.`)
        return
      }
    }

    setIsSaving(true)
    try {
      const saved = await updateWorkingHours({
        working_hours: openDays.map(({ weekday, open_time, close_time }) => ({
          weekday,
          open_time,
          close_time,
        })),
      })
      setSchedule(toSchedule(saved))
      setSuccessMessage('Working hours saved successfully.')
    } catch (error) {
      setSaveError(
        getApiErrorMessage(error, 'Could not save working hours.'),
      )
    } finally {
      setIsSaving(false)
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
        <h2 className="text-sm font-semibold text-[#27352e]">Working hours</h2>
        <p className="mt-1 text-xs text-[#89938d]">
          Days left unchecked are saved as closed.
        </p>
      </div>

      {isLoading ? (
        <div
          aria-label="Loading working hours"
          className="p-6 text-sm text-[#748078]"
          role="status"
        >
          Loading working hours…
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
        <form className="space-y-4 p-5 sm:p-6" onSubmit={saveSchedule}>
          {saveError && (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {saveError}
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

          <div className="space-y-2">
            {schedule.map((day) => (
              <div
                className="grid gap-3 rounded-xl border border-[#edf0ec] p-3 sm:grid-cols-[minmax(120px,0.8fr)_minmax(120px,1fr)_minmax(120px,1fr)] sm:items-center"
                key={day.weekday}
              >
                <label className="flex items-center gap-3 text-sm font-medium text-[#27352e]">
                  <input
                    checked={day.isOpen}
                    className="size-4 accent-emerald-800"
                    onChange={(event) =>
                      updateDay(day.weekday, 'isOpen', event.target.checked)
                    }
                    type="checkbox"
                  />
                  {day.day}
                </label>
                {day.isOpen ? (
                  <>
                    <label className="flex items-center gap-2 text-xs text-[#748078]">
                      Opens
                      <input
                        aria-label={`${day.day} opening time`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe5df] px-2.5 text-sm text-[#27352e] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                        onChange={(event) =>
                          updateDay(day.weekday, 'open_time', event.target.value)
                        }
                        required
                        type="time"
                        value={day.open_time}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#748078]">
                      Closes
                      <input
                        aria-label={`${day.day} closing time`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe5df] px-2.5 text-sm text-[#27352e] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
                        onChange={(event) =>
                          updateDay(day.weekday, 'close_time', event.target.value)
                        }
                        required
                        type="time"
                        value={day.close_time}
                      />
                    </label>
                  </>
                ) : (
                  <p className="text-sm text-[#89938d] sm:col-span-2">
                    Closed
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-[#edf0ec] pt-5">
            <button
              className="h-10 rounded-xl bg-[#123c32] px-4 text-sm font-semibold text-white hover:bg-[#0d3028] disabled:cursor-wait disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving…' : 'Save working hours'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default WorkingHoursSection
