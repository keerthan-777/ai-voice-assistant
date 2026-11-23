export function getApiErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(' ')
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Could not connect to the server. Check that the backend is running.'
  }

  return fallback
}
