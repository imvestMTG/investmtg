import type { DraftListingInput, GuamZone, LocalListing, MarketPulse, PortfolioPosition, SellerTask } from '../lib/types'

export const localListings: LocalListing[] = [
  {
    id: 'listing-rhystic-1',
    cardName: 'Rhystic Study',
    setName: 'Wilds of Eldraine: Enchanting Tales',
    condition: 'NM',
    price: 36.5,
    seller: 'DededoDraws',
    sellerRating: 4.9,
    location: 'Dededo meetup',
    fulfillment: ['pickup', 'delivery'],
    responseTime: 'Replies in ~15m',
    notes: 'Guam delivery window available Tue-Thu after 6pm.',
    verified: true,
  },
  {
    id: 'listing-rhystic-2',
    cardName: 'Rhystic Study',
    setName: 'Jumpstart',
    condition: 'LP',
    price: 34,
    seller: 'ManaHagatna',
    sellerRating: 4.7,
    location: 'Hagåtña pickup',
    fulfillment: ['pickup'],
    responseTime: 'Replies same day',
    notes: 'Can trade into staples plus cash.',
    verified: true,
  },
  {
    id: 'listing-cyclonic-1',
    cardName: 'Cyclonic Rift',
    setName: 'Double Masters 2022',
    condition: 'NM',
    price: 24,
    seller: 'TamuningTaps',
    sellerRating: 5,
    location: 'Tamuning pickup',
    fulfillment: ['pickup', 'delivery'],
    responseTime: 'Replies in ~10m',
    notes: 'Bundle discount with two or more blue staples.',
    verified: true,
  },
  {
    id: 'listing-smothering-1',
    cardName: 'Smothering Tithe',
    setName: 'Wilds of Eldraine: Enchanting Tales',
    condition: 'NM',
    price: 31.5,
    seller: 'IslandStacks',
    sellerRating: 4.8,
    location: 'South Guam meetup',
    fulfillment: ['pickup'],
    responseTime: 'Replies in ~45m',
    notes: 'Weekend meetup preferred.',
    verified: false,
  },
]

export const portfolioSeed: PortfolioPosition[] = [
  {
    id: 'port-1',
    cardId: '6a0f2f77-40f5-4f5d-9f4f-6d2f7f70f2ae',
    name: 'Rhystic Study',
    setName: 'Wilds of Eldraine: Enchanting Tales',
    qty: 2,
    buyPrice: 29,
    acquiredAt: '2025-09-14',
    thesis: 'Commander liquidity and repeat demand in Guam pods.',
  },
  {
    id: 'port-2',
    cardId: '1e52c1de-bc6d-4577-83a0-4f6c8a230f22',
    name: 'Cyclonic Rift',
    setName: 'Double Masters 2022',
    qty: 1,
    buyPrice: 18.5,
    acquiredAt: '2025-11-03',
    thesis: 'Always-live staple with fast local turnover.',
  },
  {
    id: 'port-3',
    cardId: 'b382a8f2-c62f-4f63-ae6f-5d6ba3a59f0f',
    name: 'Smothering Tithe',
    setName: 'Wilds of Eldraine: Enchanting Tales',
    qty: 1,
    buyPrice: 24,
    acquiredAt: '2025-10-08',
    thesis: 'Sticky commander demand and low regret hold.',
  },
]

export const draftListing: DraftListingInput = {
  cardName: 'Orcish Bowmasters',
  setName: 'The Lord of the Rings: Tales of Middle-earth',
  condition: 'NM',
  price: 39,
  fulfillment: ['pickup', 'delivery'],
  location: 'Tamuning meetup',
  notes: 'Can hand off at weekday commander nights. Guam delivery available with deposit.',
}

export const guamZones: GuamZone[] = [
  { name: 'Tamuning / Tumon', coverage: 'Same-day meetup priority', eta: '2-4 hours' },
  { name: 'Hagåtña / Dededo', coverage: 'Core evening handoff lane', eta: 'Same day' },
  { name: 'South Guam', coverage: 'Scheduled route drop-offs', eta: 'Next route' },
]

export const marketPulse: MarketPulse[] = [
  { label: 'Active Guam listings', value: '42', note: 'Visible inventory with local fulfillment only' },
  { label: 'Median seller reply', value: '18m', note: 'Based on recent verified seller windows' },
  { label: 'Tracked staples', value: '196', note: 'Commander-heavy search coverage' },
]

export const sellerTasks: SellerTask[] = [
  { label: 'Set meetup zone', detail: 'Make handoff expectations obvious before payment.', done: true },
  { label: 'Add condition notes', detail: 'Call out whitening, foils, and sleeve history.', done: true },
  { label: 'Confirm delivery rules', detail: 'Keep island-only messaging and deposit terms visible.', done: false },
]
