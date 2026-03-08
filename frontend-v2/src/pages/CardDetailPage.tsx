import { AlertCircle, BadgeDollarSign, MapPinned, ShieldCheck } from 'lucide-react'
import { ListingRail } from '../components/search/ListingRail'
import { PrintingsTable } from '../components/card/PrintingsTable'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingCard } from '../components/ui/LoadingCard'
import { useRoute } from '../app/router'
import { useCardDetail } from '../hooks/useCardDetail'
import { cardFoilPrice, cardImage, cardReferencePrice, formatUSD } from '../lib/utils'
import { StatCard } from '../components/ui/StatCard'

export function CardDetailPage() {
  const route = useRoute()
  const cardId = route.name === 'card' ? route.cardId : ''
  const { cardQuery, printingsQuery } = useCardDetail(cardId)

  if (cardQuery.isLoading) {
    return (
      <div className="page-stack">
        <LoadingCard />
      </div>
    )
  }

  if (cardQuery.isError || !cardQuery.data) {
    return (
      <EmptyState
        title="Card not found"
        description="That card route did not resolve cleanly. The new architecture keeps the failure contained instead of breaking the whole page."
        action="Return to search"
      />
    )
  }

  const card = cardQuery.data

  return (
    <div className="page-stack">
      <section className="detail-hero panel">
        <div className="detail-hero__media">
          <img src={cardImage(card)} alt={card.name} />
        </div>
        <div className="detail-hero__body">
          <span className="eyebrow">Card detail rewrite</span>
          <h2>{card.name}</h2>
          <p className="detail-subtitle">
            {card.set_name} · #{card.collector_number} · {card.type_line ?? 'Magic card'}
          </p>
          <p className="detail-copy">{card.oracle_text ?? 'Oracle text unavailable for this printing.'}</p>
          <div className="chip-row">
            <span className="chip chip--accent"><ShieldCheck size={14} /> Guam seller trust</span>
            <span className="chip"><MapPinned size={14} /> Pickup and island delivery</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Reference price" value={formatUSD(cardReferencePrice(card))} hint="Live Scryfall reference" icon={<BadgeDollarSign size={16} />} />
        <StatCard label="Foil reference" value={formatUSD(cardFoilPrice(card))} hint="For premium listings" icon={<BadgeDollarSign size={16} />} />
        <StatCard label="Listing posture" value="Guam only" hint="No EU marketplace routing" tone="positive" icon={<ShieldCheck size={16} />} />
        <StatCard label="Risk note" value="Manual" hint="Condition + meetup still seller-managed" tone="warning" icon={<AlertCircle size={16} />} />
      </section>

      <section className="detail-grid">
        <div className="page-section">
          <div className="section-title section-title--compact">
            <span>Local inventory</span>
            <h2>Available Guam listings</h2>
            <p>Use transparent local listing cards instead of silent buttons with no feedback.</p>
          </div>
          <ListingRail cardName={card.name} />
        </div>

        <div className="page-section">
          {printingsQuery.isLoading ? <LoadingCard /> : printingsQuery.data?.length ? <PrintingsTable printings={printingsQuery.data} /> : <EmptyState title="No print ladder yet" description="The card loaded, but the recent printings request returned empty." />}
        </div>
      </section>
    </div>
  )
}
