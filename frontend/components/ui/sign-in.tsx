"use client"

import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { AlertCircle, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface SignInCredentials {
  email: string
  password: string
  remember: boolean
}

interface SignInPageProps {
  title?: React.ReactNode
  description?: React.ReactNode
  heroImageSrc?: string
  heroImageAlt?: string
  heroCaption?: React.ReactNode
  /**
   * Called only after the fields pass client-side validation. Rejecting with an
   * ApiError makes the component show that message and any field errors, so the
   * caller decides what the backend said without this file knowing about HTTP.
   */
  onSignIn?: (credentials: SignInCredentials) => Promise<void>
  pending?: boolean
  /** Rendered under the submit button. */
  notice?: React.ReactNode
  backHref?: string
  backLabel?: string
}

type FieldErrors = Partial<Record<"email" | "password", string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const FIELD_CLASSES =
  "h-11 w-full rounded-none border bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1"

function validate(values: SignInCredentials): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.email.trim()) {
    errors.email = "Email masih kosong."
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Format email belum benar."
  }

  if (!values.password) {
    errors.password = "Kata sandi masih kosong."
  } else if (values.password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter."
  }

  return errors
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  const id = React.useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {React.cloneElement(
        children as React.ReactElement<React.ComponentProps<"input">>,
        {
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
        }
      )}
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Sign in form for a guest account. Validation, password visibility, and the
 * error states live here; whether the request actually reaches a server is up
 * to `onSignIn`.
 */
export function SignInPage({
  title = "Masuk ke akun kamu",
  description = "Pakai email dan kata sandi yang kamu gunakan saat mendaftar.",
  heroImageSrc,
  heroImageAlt,
  heroCaption,
  onSignIn,
  pending = false,
  notice,
  backHref = "/",
  backLabel = "Smart Hotel",
}: SignInPageProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [values, setValues] = React.useState({
    email: "",
    password: "",
    remember: false,
  })
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setFormError(null)

    const nextErrors = validate(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const first = nextErrors.email ? emailRef : passwordRef
      first.current?.focus()
      return
    }

    setBusy(true)
    try {
      await onSignIn?.({
        email: values.email.trim(),
        password: values.password,
        remember: values.remember,
      })
      // The caller navigates on success, so nothing is reset here.
    } catch (error) {
      // Anything shaped like an API failure carries its own message and fields.
      if (error instanceof ApiError) {
        setErrors(error.fields ?? {})
        setFormError(error.message)
      } else {
        setFormError("Tidak bisa menghubungi server. Coba lagi sebentar.")
      }
      setBusy(false)
    }
  }

  const working = pending || busy

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href={backHref}
            className="animate-element animate-delay-100 inline-flex min-h-11 items-center font-heading text-sm font-semibold tracking-[-0.02em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {backLabel}
          </Link>

          <div className="mt-10 flex flex-col gap-3">
            <h1 className="animate-element animate-delay-200 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              {title}
            </h1>
            <p className="animate-element animate-delay-300 max-w-[42ch] text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 flex flex-col gap-5"
          >
            <div className="animate-element animate-delay-400">
              <Field label="Email" error={errors.email}>
                <input
                  ref={emailRef}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  value={values.email}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, email: e.target.value }))
                  }
                  className={cn(
                    FIELD_CLASSES,
                    errors.email
                      ? "border-destructive focus-visible:ring-destructive/40"
                      : "border-border focus-visible:border-ring focus-visible:ring-ring/50"
                  )}
                />
              </Field>
            </div>

            <div className="animate-element animate-delay-500">
              <Field label="Kata sandi" error={errors.password}>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Minimal 8 karakter"
                    value={values.password}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, password: e.target.value }))
                    }
                    className={cn(
                      FIELD_CLASSES,
                      "pr-11",
                      errors.password
                        ? "border-destructive focus-visible:ring-destructive/40"
                        : "border-border focus-visible:border-ring focus-visible:ring-ring/50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
                    )}
                  </button>
                </div>
              </Field>
            </div>

            <div className="animate-element animate-delay-600">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="remember"
                  checked={values.remember}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, remember: e.target.checked }))
                  }
                  className="size-5 shrink-0 accent-primary"
                />
                Ingat saya di perangkat ini
              </label>
            </div>

            <Button
              type="submit"
              disabled={working}
              className="animate-element animate-delay-700 h-11 w-full rounded-none text-sm"
            >
              {working ? "Memproses" : "Masuk"}
            </Button>

            {formError ? (
              <p
                role="alert"
                className="border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm leading-6 text-destructive"
              >
                {formError}
              </p>
            ) : null}

            {notice ? (
              <p
                role="status"
                className="flex items-start gap-2 border border-border bg-muted px-3 py-2.5 text-sm leading-6 text-foreground"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{notice}</span>
              </p>
            ) : null}
          </form>
        </div>
      </main>

      {heroImageSrc ? (
        <aside className="animate-slide-right relative hidden flex-1 md:block">
          <div className="absolute inset-0">
            <Image
              src={heroImageSrc}
              alt={heroImageAlt ?? ""}
              fill
              sizes="50vw"
              className="object-cover"
              priority
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--foreground)_86%,transparent),transparent_58%)]"
          />
          {heroCaption ? (
            <p className="absolute inset-x-0 bottom-0 max-w-md px-10 pb-10 text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance text-background">
              {heroCaption}
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}

export default SignInPage
