import api from './api.js'

export async function getBusiness(businessId) {
  const response = await api.get(`/businesses/${businessId}`)
  return response.data
}

export async function updateBusiness(businessId, business) {
  const response = await api.put(`/businesses/${businessId}`, business)
  return response.data
}
