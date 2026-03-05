"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, type ComponentType } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { Bell, CreditCard, KeyRound, Lock, Shield, Settings, User } from "lucide-react"

type MessageState = { type: "success" | "error"; text: string }
type SettingsTab = "profile" | "settings" | "subscriptions"

interface SubscriptionRecord {
  plan_id: string | null
  status: string | null
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

interface TabConfig {
  value: SettingsTab
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const settingsTabs: TabConfig[] = [
  {
    value: "profile",
    label: "Profile",
    description: "Manage your account information",
    icon: User,
  },
  {
    value: "settings",
    label: "Settings",
    description: "Configure account preferences",
    icon: Settings,
  },
  {
    value: "subscriptions",
    label: "Subscriptions",
    description: "Manage plan and billing",
    icon: CreditCard,
  },
]

const Mail = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-mail h-3 w-3"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" ry="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
)

export default function SettingsPage() {
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<MessageState | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<MessageState | null>(null)
  const [subscriptionMessage, setSubscriptionMessage] = useState<MessageState | null>(null)
  const [isDev, setIsDev] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [subscriptionPlanName, setSubscriptionPlanName] = useState("")

  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const activeTab: SettingsTab =
    tabParam === "settings" || tabParam === "subscriptions" || tabParam === "profile"
      ? tabParam
      : "profile"

  const getTabHref = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    return `/settings?${params.toString()}`
  }

  const renderMessage = (message: MessageState | null) => {
    if (!message) return null

    return (
      <>
      {/* TODO: keep success/error color pairs intentionally local to the account settings domain. */}
      <div
        className={`p-3 rounded-xl text-sm border ${
          message.type === "success"
            ? "bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#15803d]"
            : "bg-[rgba(255,59,48,0.08)] border-[rgba(255,59,48,0.25)] text-[#b91c1c]"
        }`}
      >
        {message.text}
      </div>
      </>
    )
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setEmail(user.email || "")
      setIsDev(user.email === "nazarework@gmail.com")

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      const { data: subscriptionRecord } = await supabase
        .from("subscriptions")
        .select("plan_id, status, cancel_at_period_end, current_period_end")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()

      if (subscriptionRecord) {
        setSubscription(subscriptionRecord)

        if (subscriptionRecord.plan_id) {
          const { data: planData } = await supabase
            .from("plans")
            .select("name")
            .eq("id", subscriptionRecord.plan_id)
            .maybeSingle()

          if (planData?.name) {
            setSubscriptionPlanName(planData.name)
          }
        }
      }

      if (profile) {
        setFullName(profile.full_name || "")
        setUsername(profile.username || "")
      }

      setLoading(false)
    }

    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setProfileMessage(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        setProfileMessage({ type: "error", text: error.message })
      } else {
        setProfileMessage({ type: "success", text: "Profile updated successfully" })
      }
    } catch {
      setProfileMessage({ type: "error", text: "Failed to update profile" })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." })
      return
    }

    setPasswordSaving(true)
    setPasswordMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setPasswordMessage({ type: "error", text: error.message })
      } else {
        setPasswordMessage({ type: "success", text: "Password changed successfully" })
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Failed to update password" })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true)
    setSubscriptionMessage(null)

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url
        return
      }

      setSubscriptionMessage({ type: "error", text: data?.error || "Unable to open billing portal." })
    } catch {
      setSubscriptionMessage({ type: "error", text: "Unable to open billing portal." })
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const formatRenewalDate = (value: string | null) => {
    if (!value) return "Not set"

    return new Date(value).toLocaleDateString()
  }

  const activeTabConfig = settingsTabs.find((tab) => tab.value === activeTab) ?? settingsTabs[0]
  const badgeText = (fullName || username || email || "A").slice(0, 2).toUpperCase()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="bg-white text-text-primary">
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 lg:px-[56px] lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded border border-border-subtle bg-[#F8F8F8] p-4 lg:p-6 h-fit">
            <h2 className="text-[18px] ui-font-semibold mb-2 hidden lg:block">Account</h2>
            <div className="grid grid-cols-3 gap-2 lg:block lg:ui-stack-2">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value

                return (
                  <Link
                    key={tab.value}
                    href={getTabHref(tab.value)}
                    className={`group inline-flex lg:flex ui-row-gap-2 justify-center lg:justify-start rounded-md border px-3 py-3 transition ${
                      isActive
                        ? "border-text-primary bg-text-primary text-white"
                        : "border-border-subtle bg-white text-text-primary hover:border-[#B5B5B5]"
                    }`}
                  >
                    <Icon className="ui-icon-16" />
                    <div className="leading-tight">
                      <span className="ui-font-medium">{tab.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div>
              <h1 className="text-[30px] sm:text-[36px] font-bold tracking-[-0.03em] leading-tight">
                {activeTabConfig.label}
              </h1>
              <p className="text-text-secondary mt-1">{activeTabConfig.description}</p>
            </div>

            {activeTab === "profile" && (
              <>
                {isDev && (
                <Card className="border-border-subtle bg-[#FFF9E7]">
                  <CardHeader>
                    <div className="ui-row-gap-3">
                      <div className={uiStylePresets.settingsIconBadge}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>Developer Account</CardTitle>
                        <CardDescription>Unlimited credits enabled for testing and development.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}

              <Card className={uiStylePresets.settingsSurface}>
                <CardHeader>
                  <div className="ui-row-gap-3">
                    <div className={uiStylePresets.settingsIconBadge}>
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Profile</CardTitle>
                      <CardDescription>Update your personal information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderMessage(profileMessage)}

                  <div className="ui-stack-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="ui-row-gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="opacity-60"
                      />
                      <Badge variant="outline" className="gap-1">
                        <Mail />
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="ui-stack-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="ui-stack-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner size="sm" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={uiStylePresets.settingsSurface}>
                <CardHeader>
                  <div className="ui-row-gap-3">
                    <div className={uiStylePresets.settingsIconBadge}>
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Set a new password for your account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderMessage(passwordMessage)}

                  <div className="ui-stack-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="ui-stack-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat the new password"
                    />
                  </div>

                      <div className="flex justify-end">
                    <Button onClick={handlePasswordChange} disabled={passwordSaving}>
                      {passwordSaving ? (
                        <>
                          <Spinner size="sm" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <KeyRound className="ui-icon-16" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "settings" && (
            <Card className={uiStylePresets.settingsSurface}>
              <CardHeader>
                <div className="ui-row-gap-3">
                  <div className={uiStylePresets.settingsIconBadge}>
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Configure account and app behavior</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border-subtle bg-white p-4 text-sm text-text-secondary">
                  Additional account-level settings and preferences can be added here.
                </div>
                <div className="rounded-xl border border-border-subtle bg-white p-4 space-y-3">
                  <div className="ui-row-gap-2 text-text-primary">
                    <Bell className="ui-icon-16" />
                    <span>Notifications</span>
                  </div>
                  <p className={uiStylePresets.mutedTextSm}>
                    Notification preferences are not yet configurable in this build.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscriptions" && (
            <Card className={uiStylePresets.settingsSurface}>
              <CardHeader>
                <div className="ui-row-gap-3">
                  <div className={uiStylePresets.settingsIconBadge}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Manage Subscriptions</CardTitle>
                    <CardDescription>View and update your current plan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderMessage(subscriptionMessage)}

                {subscription ? (
                  <div className={uiStylePresets.settingsInfoCard}>
                    <div>
                      <p className={uiStylePresets.mutedTextSm}>Current plan</p>
                      <p className="text-lg font-bold">
                        {subscriptionPlanName || subscription.plan_id || "Active subscription"}
                      </p>
                    </div>
                    <div className="ui-stack-2 text-sm">
                      <p>
                        <span className={uiStylePresets.mutedTextSimple}>Status:</span> {subscription.status || "active"}
                      </p>
                      {subscription.cancel_at_period_end && (
                        <p className="text-[#ff3b30]">Cancels at period end</p>
                      )}
                      <p>
                        <span className={uiStylePresets.mutedTextSimple}>Next renewal:</span> {" "}
                        {formatRenewalDate(subscription.current_period_end)}
                      </p>
                    </div>
                    <Button onClick={handleManageSubscription} disabled={subscriptionLoading}>
                      {subscriptionLoading ? (
                        <>
                          <Spinner size="sm" />
                          Opening Billing Portal...
                        </>
                      ) : (
                        "Open Billing Portal"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className={uiStylePresets.settingsInfoCard}>
                    <p className={uiStylePresets.mutedTextSm}>
                      No active subscription found. You currently appear to be on the free tier.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/billing" className="inline-flex">
                        <Button variant="outline" className="border-border-subtle text-text-primary">
                          View Plans
                        </Button>
                      </Link>
                      <Button
                        onClick={handleManageSubscription}
                        variant="secondary"
                        disabled={subscriptionLoading}
                      >
                        {subscriptionLoading ? (
                          <>
                            <Spinner size="sm" />
                            Opening Billing Portal...
                          </>
                        ) : (
                          "Manage in Billing Portal"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </section>
        </div>
      </main>
    </div>
  )
}
