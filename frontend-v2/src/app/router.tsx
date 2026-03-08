/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { CardDetailPage } from '../pages/CardDetailPage'
import { PortfolioPage } from '../pages/PortfolioPage'
import { SearchPage } from '../pages/SearchPage'
import { SellerPage } from '../pages/SellerPage'

export type AppRoute =
  | { name: 'search' }
  | { name: 'portfolio' }
  | { name: 'sell' }
  | { name: 'card'; cardId: string }

const RouteContext = createContext<AppRoute>({ name: 'search' })

function parseHash(hash: string): AppRoute {
  const clean = hash.replace(/^#/, '') || '/search'

  if (clean === '/' || clean === '/search') return { name: 'search' }
  if (clean === '/portfolio') return { name: 'portfolio' }
  if (clean === '/sell') return { name: 'sell' }
  if (clean.startsWith('/card/')) {
    return { name: 'card', cardId: decodeURIComponent(clean.replace('/card/', '')) }
  }

  return { name: 'search' }
}

export function routeHref(route: AppRoute) {
  if (route.name === 'card') return `#/card/${encodeURIComponent(route.cardId)}`
  return `#/${route.name}`
}

function CurrentPage() {
  const route = useRoute()

  switch (route.name) {
    case 'portfolio':
      return <PortfolioPage />
    case 'sell':
      return <SellerPage />
    case 'card':
      return <CardDetailPage />
    case 'search':
    default:
      return <SearchPage />
  }
}

export function AppRouter() {
  const [hash, setHash] = useState(() => window.location.hash || '#/search')

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '#/search'
    }

    const onHashChange = () => setHash(window.location.hash || '#/search')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const route = useMemo(() => parseHash(hash), [hash])

  return (
    <RouteContext.Provider value={route}>
      <AppShell>
        <CurrentPage />
      </AppShell>
    </RouteContext.Provider>
  )
}

export function useRoute() {
  return useContext(RouteContext)
}

export function RouteLink({ route, className, children }: { route: AppRoute; className?: string; children: ReactNode }) {
  return (
    <a href={routeHref(route)} className={className}>
      {children}
    </a>
  )
}
