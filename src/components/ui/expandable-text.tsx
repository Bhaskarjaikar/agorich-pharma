'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CaretDown, CaretUp } from '@phosphor-icons/react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
  className?: string
  showToggleButton?: boolean
}

export function ExpandableText({
  text,
  maxLength = 150,
  className = '',
  showToggleButton = true,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text) return null
  
  const shouldTruncate = text.length > maxLength
  const displayText = isExpanded || !shouldTruncate ? text : `${text.substring(0, maxLength)}...`
  
  return (
    <div className={`${className}`}>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {displayText}
      </p>
      {shouldTruncate && showToggleButton && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <CaretUp className="w-3 h-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <CaretDown className="w-3 h-3 mr-1" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  )
}