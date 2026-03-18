import { api, setAuthToken } from '../lib/api'
import { useAuth as useBaseAuth } from '../contexts/AuthContext'

/**
 * Adapter context so `src/layout/*` can match the reference repo imports
 * without changing the rest of this codebase (which uses `src/contexts/*`).
 */
export function useAuth() {
  const { user, setUser, loading, refreshMe } = useBaseAuth()

  const isAuthenticated = Boolean(user) && !loading

  const logout = async () => {
    try {
      // Common Laravel/Sanctum logout endpoint; ignore failures and clear client state.
      await api.post('/logout')
    } catch {
      // ignore
    } finally {
      setAuthToken(null)
      setUser(null)
    }
  }

  return { user, loading, refreshMe, isAuthenticated, logout }
}

