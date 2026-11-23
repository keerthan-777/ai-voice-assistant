const TOKEN_KEY = 'ai_voice_assistant_access_token'

export const tokenStorage = {
  get() {
    return window.sessionStorage.getItem(TOKEN_KEY)
  },

  set(token) {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  },

  clear() {
    window.sessionStorage.removeItem(TOKEN_KEY)
  },
}
