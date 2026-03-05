"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Check, Lightbulb } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const redirectTo = new URL("/callback", window.location.origin)
      redirectTo.searchParams.set("next", "/reset-password")

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      })

      if (error) {
        setError(error.message)
        return
      }

      setSent(true)
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen max-w-[1440px] flex-col ui-px-4 pb-6 md:px-8 lg:px-12 xl:px-16">
        <AuthHeader />
        <main className="flex flex-1 items-center justify-center ui-px-4 py-12">
          <Card className={uiStylePresets.authCardCompact}>
            <CardHeader className="ui-stack-2 ui-px-8 pt-8">
              <div className="ui-row-gap-3">
                <div className={uiStylePresets.authTopIconBadge}>
                  <Lightbulb className="h-5 w-5" />
                </div>
                <span className="text-base ui-font-semibold tracking-[0.05em]">Idea2App</span>
              </div>
              <CardTitle className="text-4xl tracking-[-0.02em]">Forgot your password?</CardTitle>
              <p className="ui-text-sm-muted">
                Enter the email for your account and we&apos;ll send you a reset link.
              </p>
            </CardHeader>

            {sent ? (
                <CardContent className="space-y-4 ui-px-8 pb-8 pt-4">
                <div className="rounded-lg border border-success-bg bg-success-bg p-4 text-sm text-success">
                  <p className="ui-row-gap-2">
                    <Check className="ui-icon-16" />
                    Reset link sent to <span className="ui-font-semibold">{email}</span>.
                  </p>
                </div>
                <p className="ui-text-sm-muted">
                  If you do not receive it within a few minutes, check spam and request again.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSent(false)}
                >
                  Send again
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleReset}>
                <CardContent className="space-y-5 ui-px-8 pb-8 pt-3">
                  {error && (
                    <p className={uiStylePresets.authErrorPill}>
                      {error}
                    </p>
                  )}

                  <div className="ui-stack-2">
                    <Label htmlFor="email" className={uiStylePresets.authFieldLabel}>
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={loading}
                      className={uiStylePresets.authFieldInput}
                    />
                  </div>

                  <Button type="submit" className={uiStylePresets.authPrimaryButton} disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </CardContent>
              </form>
            )}

            <CardFooter className="ui-px-8 pb-8 pt-0">
              <p className="w-full text-center ui-text-sm-muted">
                Remembered your password?{" "}
                <Link href="/login" className="ui-font-semibold text-foreground hover:text-primary underline decoration-dotted underline-offset-2">
                  Back to Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
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
          <div className={uiStylePresets.authTopIconBadge}>
            <Lightbulb className="h-5 w-5" />
          </div>
          <span className="text-base ui-font-semibold tracking-[0.05em]">Idea2App</span>
        </Link>
      </div>
    </header>
  )
}
