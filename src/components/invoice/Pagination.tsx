'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  startIndex: number
  endIndex: number
  totalItems: number
  darkMode?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalItems,
  darkMode = false
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className={`flex items-center justify-center gap-1 mt-3 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          darkMode
            ? 'bg-card text-white hover:bg-slate-600'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Prev
      </button>

      {getPageNumbers().map((page, idx) => (
        <div key={idx}>
          {page === '...' ? (
            <span className="px-2 py-1 text-xs text-muted-foreground">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                currentPage === page
                  ? 'bg-emerald-600 text-white'
                  : darkMode
                  ? 'bg-card text-white hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {page}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          darkMode
            ? 'bg-card text-white hover:bg-slate-600'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        Next
      </button>

      <span className={`ml-2 text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
        {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
      </span>
    </div>
  )
}