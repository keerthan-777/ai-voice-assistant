import api from './api.js'

export async function getAppointments() {
  const response = await api.get('/appointments')
  return response.data
}

export async function getAppointment(appointmentId) {
  const response = await api.get(`/appointments/${appointmentId}`)
  return response.data
}

export async function createAppointment(appointment) {
  const response = await api.post('/appointments', appointment)
  return response.data
}

export async function updateAppointment(appointmentId, appointment) {
  const response = await api.put(`/appointments/${appointmentId}`, appointment)
  return response.data
}

export async function cancelAppointment(appointmentId) {
  const response = await api.patch(`/appointments/${appointmentId}/cancel`)
  return response.data
}
