import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ApiError, api, unwrap } from '@/api/client'
import { draftToForm, MAX_TEXT, useAiDraft, type AiDraft } from '@/ai/api'
import { exampleRequest } from '@/ai/examples'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSaveInvoice } from '@/invoices/api'
import { InvoiceForm } from '@/invoices/InvoiceForm'
import { errorMessage } from '@/lib/errors'
import { formatMoney } from '@/lib/money'

export function AiDraftPage() {
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<AiDraft | null>(null)
  const extract = useAiDraft()

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    extract.mutate(trimmed, { onSuccess: setDraft })
  }

  const startOver = () => {
    setDraft(null)
    extract.reset()
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6" /> AI draft
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a billing request in any words. Claude turns it into a draft invoice; you review it,
          and nothing is saved until you click Save draft.
        </p>
      </div>
      {draft ? (
        <Review draft={draft} onStartOver={startOver} />
      ) : (
        <RequestForm
          text={text}
          onTextChange={setText}
          onSubmit={submit}
          pending={extract.isPending}
          error={extract.error}
        />
      )}
    </div>
  )
}

function RequestForm({
  text,
  onTextChange,
  onSubmit,
  pending,
  error,
}: {
  text: string
  onTextChange: (text: string) => void
  onSubmit: () => void
  pending: boolean
  error: unknown
}) {
  // Uses a real customer's name in the example, so the draft can match it.
  const firstCustomer = useQuery({
    queryKey: ['customers', 'list', { q: '', page: 0, includeArchived: false }],
    queryFn: () => unwrap(api.GET('/api/customers', { params: { query: { page: 0, size: 20 } } })),
  })
  const exampleName = firstCustomer.data?.content?.[0]?.name
  const tooLong = text.length > MAX_TEXT

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing request</CardTitle>
        <CardDescription>
          Who to bill, what for, how much, tax or discount, when it&apos;s due. Indonesian or
          English.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ai-text" className="sr-only">
              Billing request
            </Label>
            <Textarea
              id="ai-text"
              rows={8}
              value={text}
              aria-invalid={tooLong ? true : undefined}
              placeholder={exampleRequest(exampleName)}
              onChange={(e) => onTextChange(e.target.value)}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <button
                type="button"
                className="underline"
                onClick={() => onTextChange(exampleRequest(exampleName))}
              >
                Use the example
              </button>
              <span className={tooLong ? 'text-destructive' : undefined}>
                {text.length} / {MAX_TEXT}
              </span>
            </div>
          </div>
          {error ? <AiError error={error} /> : null}
          <div className="flex items-center justify-end gap-3">
            {pending && (
              <span className="text-sm text-muted-foreground">
                Reading your request… this can take a few seconds.
              </span>
            )}
            <Button type="submit" disabled={pending || !text.trim() || tooLong}>
              <Sparkles /> {pending ? 'Drafting…' : 'Draft invoice'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function AiError({ error }: { error: unknown }) {
  const status = error instanceof ApiError ? error.status : 0
  const hint =
    status === 503
      ? 'The backend has no ANTHROPIC_API_KEY or Claude is unreachable. You can still create the invoice by hand.'
      : status === 422 || status === 502
        ? 'Try rephrasing the request, or create the invoice by hand.'
        : null
  return (
    <Alert variant="destructive">
      <AlertTitle>{errorMessage(error)}</AlertTitle>
      {hint && (
        <AlertDescription>
          {hint}{' '}
          <Link to="/invoices/new" className="underline">
            New invoice
          </Link>
        </AlertDescription>
      )}
    </Alert>
  )
}

function Review({ draft, onStartOver }: { draft: AiDraft; onStartOver: () => void }) {
  const navigate = useNavigate()
  const save = useSaveInvoice()
  const warnings = draft.warnings ?? []

  return (
    <div className="grid gap-6">
      <Alert>
        <Sparkles />
        <AlertTitle>Draft from your request: review before saving</AlertTitle>
        <AlertDescription>
          <p>
            AI output can be wrong. Check the customer, every amount and the dates. Total of the
            draft as received:{' '}
            <strong>{formatMoney(draft.previewTotal, draft.currency ?? 'IDR')}</strong> (calculated
            by the server; it is recalculated from your edits when you save).
          </p>
          <Button variant="link" className="h-auto p-0" onClick={onStartOver}>
            <RotateCcw /> Start over with a new request
          </Button>
        </AlertDescription>
      </Alert>
      {warnings.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle />
          <AlertTitle>Check these</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {!draft.customerId && draft.customerName && (
        <p className="text-sm">
          The request mentions <strong>{draft.customerName}</strong>, which doesn&apos;t match
          exactly one customer. Pick the customer below, or{' '}
          <Link to="/customers" className="underline">
            add them first
          </Link>
          .
        </p>
      )}
      <InvoiceForm
        defaultValues={draftToForm(draft)}
        submitLabel="Save draft"
        pending={save.isPending}
        error={save.error}
        onCancel={onStartOver}
        onSubmit={(body) =>
          save.mutate(body, {
            onSuccess: (invoice) => {
              toast.success('Draft saved. Issue it when it looks right.')
              navigate(`/invoices/${invoice.id}`)
            },
          })
        }
      />
    </div>
  )
}
