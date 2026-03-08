export type FulfillmentType = 'pickup' | 'delivery'
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP'

export type LocalListing = {
  id: string
  cardName: string
  setName: string
  condition: CardCondition
  price: number
  seller: string
  sellerRating: number
  location: string
  fulfillment: FulfillmentType[]
  responseTime: string
  notes: string
  verified: boolean
}

export type PortfolioPosition = {
  id: string
  cardId: string
  name: string
  setName: string
  qty: number
  buyPrice: number
  acquiredAt: string
  thesis: string
}

export type DraftListingInput = {
  cardName: string
  setName: string
  condition: CardCondition
  price: number
  fulfillment: FulfillmentType[]
  location: string
  notes: string
}

export type GuamZone = {
  name: string
  coverage: string
  eta: string
}

export type MarketPulse = {
  label: string
  value: string
  note: string
}

export type SellerTask = {
  label: string
  detail: string
  done: boolean
}

export type ScryfallCard = {
  id: string
  name: string
  set_name: string
  set: string
  collector_number: string
  rarity: string
  prices: {
    usd: string | null
    usd_foil: string | null
  }
  image_uris?: {
    small?: string
    normal?: string
  }
  card_faces?: Array<{
    image_uris?: {
      small?: string
      normal?: string
    }
  }>
  oracle_text?: string
  type_line?: string
  legalities?: Record<string, string>
  purchase_uris?: {
    tcgplayer?: string
  }
}
