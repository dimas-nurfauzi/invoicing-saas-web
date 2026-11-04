import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { api, unwrap } from '@/api/client'
import { useAuth } from '@/auth/auth-context'
import {
  loginSchema,
  registerSchema,
  slugify,
  type LoginForm,
  type RegisterForm,
} from '@/auth/schemas'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { session, notice } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')

  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Invoicing</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Sign in to your workspace.'
              : 'Create a workspace for your business. You become its admin.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm text-muted-foreground',
                  mode === m && 'bg-background text-foreground shadow-sm',
                )}
              >
                {m === 'login' ? 'Sign in' : 'Create workspace'}
              </button>
            ))}
          </div>
          {notice === 'expired' && mode === 'login' && (
            <Alert>
              <AlertDescription>Your session has expired. Please sign in again.</AlertDescription>
            </Alert>
          )}
          {mode === 'login' ? <LoginFormView /> : <RegisterFormView />}
        </CardContent>
      </Card>
    </div>
  )
}

function useLogin() {
  const { signIn } = useAuth()
  return useMutation({
    mutationFn: (body: LoginForm) => unwrap(api.POST('/api/auth/login', { body })),
    onSuccess: (login, body) => signIn(login, body.tenantSlug),
  })
}

function LoginFormView() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: '', email: '', password: '' },
  })

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit((v) => login.mutate(v))}>
      <FormField
        id="login-workspace"
        label="Workspace"
        placeholder="toko-maju"
        autoComplete="organization"
        error={errors.tenantSlug?.message}
        {...register('tenantSlug')}
      />
      <FormField
        id="login-email"
        label="Email"
        type="email"
        autoComplete="username"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {login.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(login.error)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

function RegisterFormView() {
  const { signIn } = useAuth()
  const [slugEdited, setSlugEdited] = useState(false)
  const signUp = useMutation({
    mutationFn: async (v: RegisterForm) => {
      await unwrap(api.POST('/api/tenants', { body: v }))
      return unwrap(
        api.POST('/api/auth/login', {
          body: { tenantSlug: v.tenantSlug, email: v.adminEmail, password: v.adminPassword },
        }),
      )
    },
    onSuccess: (login, v) => {
      signIn(login, v.tenantSlug)
      toast.success(`Workspace “${v.tenantSlug}” created`)
    },
  })
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenantName: '', tenantSlug: '', adminEmail: '', adminPassword: '' },
  })

  const name = register('tenantName')
  const slug = register('tenantSlug')

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit((v) => signUp.mutate(v))}>
      <FormField
        id="register-name"
        label="Business name"
        placeholder="Toko Maju"
        autoComplete="organization"
        error={errors.tenantName?.message}
        {...name}
        onChange={(e) => {
          void name.onChange(e)
          if (!slugEdited) {
            setValue('tenantSlug', slugify(e.target.value), {
              shouldValidate: errors.tenantSlug !== undefined,
            })
          }
        }}
      />
      <FormField
        id="register-slug"
        label="Workspace"
        hint="Used to sign in. Lowercase letters, digits and hyphens."
        error={errors.tenantSlug?.message}
        {...slug}
        onChange={(e) => {
          setSlugEdited(true)
          void slug.onChange(e)
        }}
      />
      <FormField
        id="register-email"
        label="Admin email"
        type="email"
        autoComplete="username"
        error={errors.adminEmail?.message}
        {...register('adminEmail')}
      />
      <FormField
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="8 to 72 characters."
        error={errors.adminPassword?.message}
        {...register('adminPassword')}
      />
      {signUp.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(signUp.error)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creating…' : 'Create workspace'}
      </Button>
    </form>
  )
}
