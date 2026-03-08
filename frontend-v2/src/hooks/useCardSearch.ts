import { useQuery } from '@tanstack/react-query'
import { searchCards } from '../lib/api'

export function useCardSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchCards(query),
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60 * 5,
  })
}
