import { BarChart3, CircleDollarSign, Layers3 } from 'lucide-react'
import { portfolioSeed } from '../data/mockData'
import { usePortfolioCards } from '../hooks/useCardDetail'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingCard } from '../components/ui/LoadingCard'
import { PortfolioTable } from '../components/portfolio/PortfolioTable'
import { StatCard } from '../components/ui/StatCard'
import { cardReferencePrice, formatUSD } from '../lib/utils'

export function PortfolioPage() {
  const portfolioQuery = usePortfolioCards()

  if (portfolioQuery.isLoading) {
    return (
      <div className="page-stack">
        <LoadingCard />
      </div>
    )
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return (
      <EmptyState
        title="Portfolio feed unavailable"
        description="The new portfolio view expects stable collection fetches. This failure is isolated instead of collapsing the app shell."
      />
    )
  }

  const referenceLookup = new Map(portfolioQuery.data.map((card) => [card.id, cardReferencePrice(card)]))
  const totalCost = portfolioSeed.reduce((sum, item) => sum + item.buyPrice * item.qty, 0)
  const totalValue = portfolioSeed.reduce((sum, item) => sum + (referenceLookup.get(item.cardId) ?? 0) * item.qty, 0)
  const totalDelta = totalValue - totalCost

  return (
    <div className="page-stack">
      <section className="page-section page-section--intro">
        <div className="section-title">
          <span>Portfolio rebuild</span>
          <h2>See card positions like a real trading dashboard.</h2>
          <p>Cleaner hierarchy, safer data fetching, and a better path toward real backend persistence.</p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Total basis" value={formatUSD(totalCost)} hint="Tracked across current seed positions" icon={<CircleDollarSign size={16} />} />
        <StatCard label="Reference value" value={formatUSD(totalValue)} hint="Live pricing snapshot" icon={<BarChart3 size={16} />} />
        <StatCard label="Net change" value={formatUSD(totalDelta)} hint={totalDelta >= 0 ? 'Portfolio is above cost basis' : 'Portfolio is below cost basis'} tone={totalDelta >= 0 ? 'positive' : 'warning'} icon={<Layers3 size={16} />} />
      </section>

      <PortfolioTable positions={portfolioSeed} cards={portfolioQuery.data} />
    </div>
  )
}
