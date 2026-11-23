import api from './api.js'

export async function getFaqs() {
  const response = await api.get('/faqs')
  return response.data
}

export async function getFaq(faqId) {
  const response = await api.get(`/faqs/${faqId}`)
  return response.data
}

export async function createFaq(faq) {
  const response = await api.post('/faqs', faq)
  return response.data
}

export async function updateFaq(faqId, faq) {
  const response = await api.put(`/faqs/${faqId}`, faq)
  return response.data
}

export async function deactivateFaq(faqId) {
  const response = await api.delete(`/faqs/${faqId}`)
  return response.data
}
