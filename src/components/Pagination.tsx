import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  /** 0-based, as in the API. */
  page: number
  size: number
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** "21–40 of 57" with previous / next, for the API's PageResponse. */
export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalElements === 0) return null
  const first = page * size + 1
  const last = Math.min((page + 1) * size, totalElements)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">
        {first}–{last} of {totalElements}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
