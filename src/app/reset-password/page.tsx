"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Lightbulb } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const verifySession = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setReady(Boolean(user))
    }

    verifySession()
  }, [])

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1400)
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  if (ready === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen max-w-[460px] flex-col justify-center ui-px-4">
          <Card className="border-border-subtle">
            <CardHeader className="space-y-3">
              <p className="ui-text-sm-muted">Password reset</p>
              <CardTitle className="text-2xl">Session expired</CardTitle>
              <p className="ui-text-sm-muted">
                The reset link is invalid or has expired. Go back and request a new reset link.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request new reset link</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-[480px] flex-col ui-px-4 pb-6 md:px-8">
        <AuthHeader />
        <div className="mt-12">
          <Card className={uiStylePresets.authCardCompact}>
            <CardHeader className="ui-stack-2">
              <CardTitle className="text-3xl tracking-[-0.02em]">Set new password</CardTitle>
              <p className="ui-text-sm-muted">
                Create a new password and confirm it to continue.
              </p>
            </CardHeader>

            <form onSubmit={handleReset}>
              <CardContent className="space-y-5">
                <div className="ui-stack-2">
                  <Label htmlFor="password" className={uiStylePresets.authFieldLabel}>
                    New password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className={uiStylePresets.authFieldInput}
                  />
                </div>
                <div className="ui-stack-2">
                  <Label htmlFor="confirmPassword" className={uiStylePresets.authFieldLabel}>
                    Confirm new password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className={uiStylePresets.authFieldInput}
                  />
                </div>

                {error && (
                  <p className={uiStylePresets.authErrorPill}>
                    {error}
                  </p>
                )}

                  <Button type="submit" className={uiStylePresets.authPrimaryButton} disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      Updating...
                    </>
                  ) : success ? (
                    "Password updated"
                  ) : (
                    "Update password"
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      </section>
    </div>
  )
}

function AuthHeader() {
  return (
    <header className="mt-10">
        <div className="mt-6 ui-row-gap-3">
        <div className={uiStylePresets.authTopIconBadge}>
          <Lightbulb className="h-5 w-5" />
        </div>
        <span className="text-base ui-font-semibold tracking-[0.05em]">Idea2App</span>
      </div>
    </header>
  )
}
