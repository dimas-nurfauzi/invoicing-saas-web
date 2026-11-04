import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm, type FieldError } from 'react-hook-form'
import { Link } from 'react-router'
import type { Schemas } from '@/api/client'
import { FormField } from '@/components/FormField'
import { NativeSelect } from '@/components/NativeSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { toInvoiceRequest, useCustomerOptions } from './api'
import {
  EMPTY_LINE,
  invoiceSchema,
  type InvoiceForm as InvoiceFormValues,
  type InvoiceFormOutput,
} from './schemas'

interface InvoiceFormProps {
  defaultValues: InvoiceFormValues
  /** Kept as an option even if it isn't among the active customers (e.g. archived). */
  currentCustomer?: { id?: string; name?: string }
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (body: Schemas['InvoiceRequest']) => void
  onCancel: () => void
}

/**
 * Create / edit a draft (and, later, review an AI draft). No totals are computed here: the
 * backend calculates them when the draft is saved.
 */
export function InvoiceForm({
  defaultValues,
  currentCustomer,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: InvoiceFormProps) {
  const customers = useCustomerOptions()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues, unknown, InvoiceFormOutput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  })
  const lines = useFieldArray({ control, name: 'lines' })

  const options = customers.data?.content ?? []
  const missingCurrent =
    currentCustomer?.id && !options.some((c) => c.id === currentCustomer.id)
      ? currentCustomer
      : null
  const noCustomers = customers.isSuccess && options.length === 0 && !missingCurrent

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toInvoiceRequest(values)))}
    >
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="invoice-customer">Customer</Label>
            {/* Controlled, so a preselected customer shows up once the options arrive. */}
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <NativeSelect
                  id="invoice-customer"
                  disabled={customers.isPending}
                  aria-invalid={errors.customerId ? true : undefined}
                  aria-describedby={errors.customerId ? 'invoice-customer-error' : undefined}
                  {...field}
                >
                  <option value="">{customers.isPending ? 'Loading…' : 'Select a customer'}</option>
                  {missingCurrent && (
                    <option value={missingCurrent.id}>{missingCurrent.name} (archived)</option>
                  )}
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` · ${c.email}` : ''}
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
            {errors.customerId && (
              <p id="invoice-customer-error" className="text-sm text-destructive">
                {errors.customerId.message}
              </p>
            )}
            {noCustomers && (
              <p className="text-sm text-muted-foreground">
                No customers yet.{' '}
                <Link to="/customers" className="underline">
                  Add one first
                </Link>
                .
              </p>
            )}
          </div>
          <FormField
            id="invoice-issue-date"
            label="Issue date"
            type="date"
            error={errors.issueDate?.message}
            {...register('issueDate')}
          />
          <FormField
            id="invoice-due-date"
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
          <FormField
            id="invoice-currency"
            label="Currency"
            maxLength={3}
            className="uppercase"
            error={errors.currency?.message}
            {...register('currency')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="hidden gap-2 text-sm font-medium text-muted-foreground md:grid md:grid-cols-[1fr_6rem_9rem_6rem_6rem_2rem]">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span>Disc. %</span>
            <span>Tax %</span>
            <span />
          </div>
          {lines.fields.map((field, index) => {
            const lineErrors = errors.lines?.[index]
            const cell = (
              name: keyof InvoiceFormValues['lines'][number],
              label: string,
              props: { inputMode?: 'decimal'; placeholder?: string } = {},
            ) => (
              <LineCell label={`Line ${index + 1} ${label}`} error={lineErrors?.[name]}>
                <Input
                  aria-label={`Line ${index + 1} ${label}`}
                  aria-invalid={lineErrors?.[name] ? true : undefined}
                  {...props}
                  {...register(`lines.${index}.${name}`)}
                />
              </LineCell>
            )
            return (
              <div
                key={field.id}
                className="grid gap-2 border-b pb-3 last:border-0 md:grid-cols-[1fr_6rem_9rem_6rem_6rem_2rem] md:border-0 md:pb-0"
              >
                {cell('description', 'description')}
                {cell('quantity', 'quantity', { inputMode: 'decimal' })}
                {cell('unitPrice', 'unit price', {
                  inputMode: 'decimal',
                  placeholder: '1.500.000',
                })}
                {cell('discountPercent', 'discount %', { inputMode: 'decimal', placeholder: '0' })}
                {cell('taxRatePercent', 'tax %', { inputMode: 'decimal', placeholder: '0' })}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.fields.length === 1}
                  onClick={() => lines.remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}
          {errors.lines?.root?.message || errors.lines?.message ? (
            <p className="text-sm text-destructive">
              {errors.lines.root?.message ?? errors.lines.message}
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={lines.fields.length >= 100}
              onClick={() => lines.append({ ...EMPTY_LINE })}
            >
              <Plus /> Add line
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Write numbers the Indonesian way: 1.500.000,50 (dot for thousands, comma for decimals).
            Totals, discounts and tax are calculated by the server when you save.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-1.5">
        <Label htmlFor="invoice-notes">Notes</Label>
        <Textarea
          id="invoice-notes"
          rows={3}
          placeholder="Payment instructions, PO number…"
          {...register('notes')}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function LineCell({
  label,
  error,
  children,
}: {
  label: string
  error?: FieldError
  children: ReactNode
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground md:hidden">
        {label.replace(/^Line \d+ /, '')}
      </span>
      {children}
      {error && (
        <p className="text-xs text-destructive" title={label}>
          {error.message}
        </p>
      )}
    </div>
  )
}
