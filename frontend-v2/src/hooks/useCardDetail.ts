import { useQuery } from '@tanstack/react-query'
import { portfolioSeed } from '../data/mockData'
import { getCard, getCollection, getPrintings } from '../lib/api'

export function useCardDetail(cardId: string) {
  const cardQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getCard(cardId),
    staleTime: 1000 * 60 * 10,
    enabled: Boolean(cardId),
  })

  const printingsQuery = useQuery({
    queryKey: ['printings', cardQuery.data?.name],
    queryFn: () => getPrintings(cardQuery.data!.name),
    enabled: Boolean(cardQuery.data?.name),
    staleTime: 1000 * 60 * 10,
  })

  return { cardQuery, printingsQuery }
}

export function usePortfolioCards() {
  const ids = portfolioSeed.map((item) => item.cardId)

  return useQuery({
    queryKey: ['portfolio-cards', ids],
    queryFn: () => getCollection(ids),
    staleTime: 1000 * 60 * 10,
  })
}
