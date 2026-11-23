import api from './api.js'

export async function getConversations(limit = 50, offset = 0) {
  const response = await api.get('/conversations', {
    params: { limit, offset },
  })
  return response.data
}

export async function getConversation(conversationId) {
  const response = await api.get(`/conversations/${conversationId}`)
  return response.data
}

export async function closeConversation(conversationId) {
  const response = await api.patch(`/conversations/${conversationId}/close`)
  return response.data
}
