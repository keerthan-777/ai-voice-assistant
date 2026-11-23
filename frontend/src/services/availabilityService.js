import api from './api.js'

export async function getWorkingHours() {
  const response = await api.get('/business/working-hours')
  return response.data
}

export async function updateWorkingHours(workingHours) {
  const response = await api.put('/business/working-hours', workingHours)
  return response.data
}

export async function getHolidays() {
  const response = await api.get('/business/holidays')
  return response.data
}

export async function createHoliday(holiday) {
  const response = await api.post('/business/holidays', holiday)
  return response.data
}

export async function deleteHoliday(holidayId) {
  const response = await api.delete(`/business/holidays/${holidayId}`)
  return response.data
}
