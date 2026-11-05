import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A styled native <select>: accessible, works with react-hook-form's register() and in tests,
 * and good enough for short option lists.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
