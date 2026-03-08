import { MapPin, ShieldCheck, TimerReset } from 'lucide-react'
import { localListings } from '../../data/mockData'
import { formatUSD } from '../../lib/utils'
import { EmptyState } from '../ui/EmptyState'

type ListingRailProps = {
  cardName: string
}

export function ListingRail({ cardName }: ListingRailProps) {
  const matches = localListings.filter((listing) => listing.cardName.toLowerCase() === cardName.toLowerCase())

  if (!matches.length) {
    return (
      <EmptyState
        title="No Guam listings yet"
        description="Keep the pricing reference visible, then push sellers into the new local listing flow instead of showing fake shared inventory."
        action="Use the sell flow to seed island inventory"
      />
    )
  }

  return (
    <div className="listing-rail">
      {matches.map((listing) => (
        <article key={listing.id} className="listing-rail__card">
          <div className="listing-rail__header">
            <div>
              <strong>{listing.seller}</strong>
              <span>
                {listing.condition} · {listing.setName}
              </span>
            </div>
            <strong>{formatUSD(listing.price)}</strong>
          </div>
          <div className="listing-rail__meta">
            <span>
              <MapPin size={14} /> {listing.location}
            </span>
            <span>
              <TimerReset size={14} /> {listing.responseTime}
            </span>
            {listing.verified ? (
              <span>
                <ShieldCheck size={14} /> Verified
              </span>
            ) : null}
          </div>
          <p>{listing.notes}</p>
          <div className="chip-row">
            {listing.fulfillment.map((item) => (
              <span key={item} className="chip">{item === 'pickup' ? 'Pickup' : 'Island delivery'}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
