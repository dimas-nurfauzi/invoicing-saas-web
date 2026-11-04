import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Stand-in for screens built in the next PRs. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming in a later PR.</CardContent>
    </Card>
  )
}
