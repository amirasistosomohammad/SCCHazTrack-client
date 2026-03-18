/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react'
import haztrackLogo from '../assets/logo-removebg-preview.png'

const BrandingContext = createContext({
  appName: 'SCC HazTrack',
  logoUrl: haztrackLogo,
  brandingLoaded: false,
})

export function BrandingProvider({ children }) {
  // Keep this lightweight: layout only needs a name/logo for the topbar.
  const brandingLoaded = true

  const value = useMemo(
    () => ({
      appName: import.meta.env.VITE_APP_NAME || 'SCC HazTrack',
      logoUrl: import.meta.env.VITE_APP_LOGO_URL || haztrackLogo,
      brandingLoaded,
    }),
    [brandingLoaded]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  return useContext(BrandingContext)
}

