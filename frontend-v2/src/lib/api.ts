import type { ScryfallCard } from './types'

const SCRYFALL = 'https://api.scryfall.com'

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  if (!query.trim()) return []
  const data = await request<{ data?: ScryfallCard[] }>(
    `${SCRYFALL}/cards/search?q=${encodeURIComponent(`${query} -is:digital has:usd`)}&order=usd&dir=desc`,
  )
  return data.data ?? []
}

export async function getCard(cardId: string): Promise<ScryfallCard> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId)
  const url = isUuid
    ? `${SCRYFALL}/cards/${cardId}`
    : `${SCRYFALL}/cards/named?fuzzy=${encodeURIComponent(cardId)}`
  return request<ScryfallCard>(url)
}

export async function getPrintings(cardName: string): Promise<ScryfallCard[]> {
  const data = await request<{ data?: ScryfallCard[] }>(
    `${SCRYFALL}/cards/search?q=${encodeURIComponent(`!"${cardName}" -is:digital has:usd`)}&unique=prints&order=released&dir=desc`,
  )
  return data.data ?? []
}

export async function autocompleteCards(query: string): Promise<string[]> {
  if (query.trim().length < 2) return []
  const data = await request<{ data?: string[] }>(`${SCRYFALL}/cards/autocomplete?q=${encodeURIComponent(query)}`)
  return data.data ?? []
}

export async function getCollection(ids: string[]): Promise<ScryfallCard[]> {
  if (!ids.length) return []
  const response = await fetch(`${SCRYFALL}/cards/collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifiers: ids.map((id) => ({ id })) }),
  })

  if (!response.ok) {
    throw new Error(`Collection request failed: ${response.status}`)
  }

  const data = (await response.json()) as { data?: ScryfallCard[] }
  return data.data ?? []
}
