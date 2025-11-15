'use client'

import { LayoutGrid, Table2, List, KanbanSquare } from 'lucide-react'
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
    icon: Table2,
    description: 'Compact table with sorting'
  },
  {
    key: 'board' as ViewType,
    label: 'Board View',
    icon: KanbanSquare,
    description: 'Kanban board by status'
  },
  {
    key: 'gallery' as ViewType,
    label: 'Gallery View',
    icon: LayoutGrid,
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
      <SelectTrigger className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-[200px]">
        <div className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4" />
          <SelectValue placeholder={currentOption.label} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-700">
        {viewOptions.map((option) => {
          const Icon = option.icon
          return (
            <SelectItem
              key={option.key}
              value={option.key}
              className="cursor-pointer text-white/80 hover:bg-white/10 focus:bg-blue-600/20 focus:text-blue-200"
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

