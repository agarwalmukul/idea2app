"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ArrowRight, Lightbulb } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const queryError = searchParams.get("error")
  const queryMessage = searchParams.get("message")
  const [error, setError] = useState<string | null>(queryError || queryMessage)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push(redirect)
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
      } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback?next=${redirect}`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
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
                    <CardTitle className="text-3xl tracking-[-0.02em]">Welcome back</CardTitle>
                    <p className="ui-text-sm-muted">Sign in to continue to Idea2App.</p>
                  </CardHeader>
                  <form onSubmit={handleLogin}>
                    <CardContent className="space-y-5 ui-px-8 pt-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={uiStylePresets.authSocialButton}
                      >
                        <ArrowRight className="ui-icon-16" />
                        Continue with Google
                      </button>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className={uiStylePresets.authDividerLine} />
                        <span>OR</span>
                        <span className={uiStylePresets.authDividerLine} />
                      </div>

                      {error && (
                        <p className={uiStylePresets.authErrorPill}>
                          {error}
                        </p>
                      )}

                      <div className="ui-stack-2">
                        <Label htmlFor="email" className={uiStylePresets.authFieldLabel}>
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className={uiStylePresets.authFieldInput}
                        />
                      </div>

                      <div className="ui-stack-2">
                        <Label htmlFor="password" className={uiStylePresets.authFieldLabel}>
                          Password
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className={uiStylePresets.authFieldInput}
                        />
                      </div>

                      <Button
                        type="submit"
                        className={uiStylePresets.authDestructiveButton}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner size="sm" />
                            Signing in...
                          </>
                        ) : (
                          "Log in"
                        )}
                      </Button>
                    </CardContent>
                  </form>

                  <CardFooter className="ui-px-8 pb-8 pt-2">
                    <p className="w-full text-center ui-text-sm-muted">
                      Don&apos;t have an account?{" "}
                      <Link href="/signup" className={uiStylePresets.authLinkUnderline}>
                        Create account
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
