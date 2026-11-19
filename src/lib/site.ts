// Public origin for tracking links: NEXT_PUBLIC_SITE_URL (no trailing slash), else the current origin.
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || (typeof window !== 'undefined' ? window.location.origin : '')
