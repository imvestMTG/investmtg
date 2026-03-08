import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type StatCardProps = {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'positive' | 'warning'
  icon?: ReactNode
}

export function StatCard({ label, value, hint, tone = 'default', icon }: StatCardProps) {
  return (
    <article className={cn('stat-card', tone !== 'default' && `tone-${tone}`)}>
      <div className="stat-card__meta">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  )
}
