import api from './api.js'

export async function getDashboardData(businessId) {
  const [customersResponse, appointmentsResponse, conversationsResponse, businessResponse] =
    await Promise.all([
      api.get('/customers'),
      api.get('/appointments'),
      api.get('/conversations', { params: { limit: 5, offset: 0 } }),
      api.get(`/businesses/${businessId}`),
    ])

  return {
    business: businessResponse.data,
    customers: customersResponse.data.filter(
      (customer) => customer.business_id === businessId,
    ),
    appointments: appointmentsResponse.data.filter(
      (appointment) => appointment.business_id === businessId,
    ),
    conversations: conversationsResponse.data.items.filter(
      (conversation) => conversation.business_id === businessId,
    ),
    conversationTotal: conversationsResponse.data.total,
  }
}
