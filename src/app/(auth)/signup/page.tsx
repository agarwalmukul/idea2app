"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Lightbulb, ArrowRight, Check } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

function SignupScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  const socialText = "Continue with Google"

  const isSocialError = message === "social_callback_error"

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }

      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/callback?next=/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback?next=/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <section className="flex min-h-screen w-full flex-col">
          <AuthHeader />
          <main className="flex min-h-screen w-full items-center justify-center">
            <Card className={`${uiStylePresets.authCardCompact} p-8 text-center`}>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <p className="ui-text-sm-muted">
                  We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                  Open it to verify your account.
                </p>
              </CardHeader>
            </Card>
          </main>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="flex min-h-screen w-full flex-col">
        <main className="flex min-h-screen w-full overflow-hidden lg:flex-row-reverse">
          <aside className="hidden h-screen w-full max-w-[560px] bg-sidebar-bg px-14 py-14 text-sidebar-foreground lg:flex">
            <div className="flex h-full flex-col justify-between">
              <div>
                <h1 className="text-5xl ui-font-semibold leading-tight tracking-[-0.06em]">
                  Ship your next product faster.
                </h1>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Create your Idea2App account to manage prompts, builds, and releases from
                  one workspace.
                </p>
              </div>
              <p className={uiStylePresets.authFormMeta}>
                Trusted by 3,000+ teams
              </p>
            </div>
          </aside>
          <div className="flex w-full flex-1">
            <div className="w-full max-w-[880px] lg:h-full lg:flex lg:flex-col">
              <header className="h-[104px] ui-px-6 py-5">
                <Link href="/" className="inline-flex h-full items-center gap-3">
                  <div className={uiStylePresets.authIconCircle}>
                    <Lightbulb className="ui-icon-16" />
                  </div>
                  <span className="text-lg ui-font-semibold tracking-[0.05em]">Idea2App</span>
                </Link>
              </header>
              <div className="flex-1 flex items-center">
                <Card className={uiStylePresets.authCardContainer}>
                <CardHeader className="ui-stack-2 ui-px-8 pt-8">
                  <CardTitle className="text-3xl tracking-[-0.02em]">Create account</CardTitle>
                  <p className="ui-text-sm-muted">Join Idea2App and start building.</p>
                </CardHeader>

                <CardContent className="space-y-5 ui-px-8 pt-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    className={uiStylePresets.authSocialButton}
                    disabled={loading}
                  >
                    <ArrowRight className="ui-icon-16" />
                    {loading ? "Connecting..." : socialText}
                  </button>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className={uiStylePresets.authDividerLine} />
                    <span>OR</span>
                    <span className={uiStylePresets.authDividerLine} />
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    {isSocialError && (
                      <p className={uiStylePresets.authErrorPill}>
                        Could not complete Google sign in. Please try again.
                      </p>
                    )}

                    {error && (
                      <p className={uiStylePresets.authErrorPill}>
                        {error}
                      </p>
                    )}

                    <FormField
                      id="fullName"
                      label="Full name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(value) => setFullName(value)}
                      disabled={loading}
                    />
                    <FormField
                      id="email"
                      type="email"
                      label="Email address"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(value) => setEmail(value)}
                      disabled={loading}
                    />
                    <FormField
                      id="password"
                      type="password"
                      label="Password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(value) => setPassword(value)}
                      minLength={6}
                      disabled={loading}
                    />
                    <FormField
                      id="confirmPassword"
                      type="password"
                      label="Confirm password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(value) => setConfirmPassword(value)}
                      minLength={6}
                      disabled={loading}
                    />

                    <Button type="submit" className={uiStylePresets.authDestructiveButton} disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner size="sm" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="ui-px-8 pb-8 pt-2">
                  <p className="w-full text-center ui-text-sm-muted">
                    Already have an account?{" "}
                    <Link href="/login" className={uiStylePresets.authLinkUnderline}>
                      Log in
                    </Link>
                  </p>
                </CardFooter>
              </Card>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  )
}

function AuthHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between ui-px-4 md:px-8 lg:px-12 xl:px-16">
        <Link href="/" className="inline-ui-row-gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Lightbulb className="ui-icon-16" />
          </div>
          <span className="text-base ui-font-semibold tracking-[0.05em]">Idea2App</span>
        </Link>
      </div>
    </header>
  )
}

function FormField({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  disabled,
  minLength,
}: {
  id: string
  type?: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  minLength?: number
}) {
  return (
    <div className="ui-stack-2">
      <Label htmlFor={id} className={uiStylePresets.authFieldLabel}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={disabled}
        minLength={minLength}
        className={uiStylePresets.authFieldInput}
      />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Spinner size="lg" />
        </div>
      }
    >
      <SignupScreen />
    </Suspense>
  )
}
