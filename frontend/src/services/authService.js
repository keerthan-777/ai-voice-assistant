import api from './api.js'

export async function createBusiness(businessName) {
  const response = await api.post('/businesses', {
    business_name: businessName,
  })

  return response.data
}

export async function register({ name, email, password, business_id }) {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
    business_id,
  })

  return response.data
}

export async function login({ email, password }) {
  const formData = new URLSearchParams({
    username: email.trim().toLowerCase(),
    password,
  })
  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}
