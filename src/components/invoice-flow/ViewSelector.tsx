'use client'

import { SquaresFour, Table, List, Kanban } from '@phosphor-icons/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type ViewType = 'table' | 'board' | 'gallery' | 'list'

interface ViewSelectorProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

const viewOptions = [
  {
    key: 'table' as ViewType,
    label: 'Table View',
    icon: Table,
    description: 'Compact table with sorting'
  },
  {
    key: 'board' as ViewType,
    label: 'Board View',
    icon: Kanban,
    description: 'Kanban board by status'
  },
  {
    key: 'gallery' as ViewType,
    label: 'Gallery View',
    icon: SquaresFour,
    description: 'Card grid layout'
  },
  {
    key: 'list' as ViewType,
    label: 'List View',
    icon: List,
    description: 'Compact list with details'
  }
]

export default function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  const currentOption = viewOptions.find(opt => opt.key === currentView) || viewOptions[0]
  const CurrentIcon = currentOption.icon

  return (
    <Select value={currentView} onValueChange={(value) => onViewChange(value as ViewType)}>
      <SelectTrigger className="h-9 w-[min(100%,200px)] border-border bg-background text-foreground hover:bg-muted">
        <div className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={currentOption.label} />
        </div>
      </SelectTrigger>
      <SelectContent className="border-border bg-popover text-popover-foreground">
        {viewOptions.map((option) => {
          const Icon = option.icon
          return (
            <SelectItem
              key={option.key}
              value={option.key}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

