import api from './api.js'

export async function getCustomers() {
  const response = await api.get('/customers')
  return response.data
}

export async function getCustomer(customerId) {
  const response = await api.get(`/customers/${customerId}`)
  return response.data
}

export async function createCustomer(customer) {
  const response = await api.post('/customers', customer)
  return response.data
}

export async function updateCustomer(customerId, customer) {
  const response = await api.put(`/customers/${customerId}`, customer)
  return response.data
}

export async function deleteCustomer(customerId) {
  const response = await api.delete(`/customers/${customerId}`)
  return response.data
}
