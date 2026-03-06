"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatPrice } from "@/lib/utils"
import { BASE_ACTION_TOKENS, TOKEN_VALUE_CENTS, estimateFullReportTokens } from "@/lib/token-economics"
import { Check, Coins, Zap, CreditCard, Crown } from "lucide-react"

interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  credits_monthly: number
  features: string[]
  stripe_price_id: string | null
  is_active: boolean | null
}

interface Subscription {
  id: string
  plan_id: string | null
  status: string
  cancel_at_period_end: boolean | null
  current_period_end: string | null
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true })

      if (plansData) {
        setPlans(plansData.map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features as string[] : [],
        })))
      }

      // Get subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (subData) {
        setSubscription(subData)
      }

      // Get credits
      const { data: creditsData } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single()

      if (creditsData) {
        setCredits(creditsData.balance)
      }

      setLoading(false)
    }

    load()
  }, [])

  const handleCheckout = async (planId: string, priceId: string) => {
    setCheckoutLoading(planId)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, priceId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Portal error:", error)
    }
  }

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "free":
        return Coins
      case "starter":
        return Zap
      case "pro":
        return CreditCard
      case "enterprise":
        return Crown
      default:
        return Coins
    }
  }

  const tokenValueLabel = formatPrice(TOKEN_VALUE_CENTS)
  const fullReportFast = estimateFullReportTokens("grok-4-1-fast")
  const fullReportBalanced = estimateFullReportTokens("anthropic/claude-sonnet-4")
  const fullReportThinking = estimateFullReportTokens("openai/gpt-5-mini")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and token balance
        </p>
      </div>

      {/* Current Plan & Credits */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group hover:border-[rgba(0,212,255,0.2)] transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border border-[rgba(0,212,255,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                <CreditCard className="h-5 w-5 text-[#00d4ff]" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Plan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight">
              {subscription
                ? plans.find((p) => p.id === subscription.plan_id)?.name || "Active"
                : "Free"}
            </p>
            {subscription?.cancel_at_period_end && (
              <Badge variant="warning" className="mt-2">Cancels at period end</Badge>
            )}
            {subscription && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleManageSubscription}
              >
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="group hover:border-[rgba(124,58,237,0.2)] transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#f472b6]/20 border border-[rgba(124,58,237,0.15)] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                <Coins className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
Token Balance
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black tracking-tight">
              {credits >= 999999 ? (
                <span className="gradient-text">Unlimited</span>
              ) : credits.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Tokens are used for analyses and app generation (1 token = {tokenValueLabel})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.filter((p) => p.name !== "Internal Dev").map((plan) => {
            const Icon = getPlanIcon(plan.name)
            const isCurrentPlan = subscription?.plan_id === plan.id
            const isFree = plan.price_monthly === 0
            const isPro = plan.name.toLowerCase() === "pro"

            return (
              <Card
                key={plan.id}
                className={`relative group transition-all duration-300 hover:-translate-y-1 ${
                  isCurrentPlan
                    ? "border-[rgba(0,212,255,0.4)] shadow-[0_0_25px_rgba(0,212,255,0.15)]"
                    : isPro
                    ? "border-[rgba(124,58,237,0.3)] shadow-[0_0_25px_rgba(124,58,237,0.1)] hover:shadow-[0_0_35px_rgba(124,58,237,0.2)]"
                    : "hover:border-[rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,212,255,0.08)]"
                }`}
              >
                {isPro && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#7c3aed] to-[#f472b6] text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] text-white border-0 shadow-[0_0_15px_rgba(0,212,255,0.3)]">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 border shadow-lg ${
                    isPro
                      ? "bg-gradient-to-br from-[#7c3aed]/20 to-[#f472b6]/20 border-[rgba(124,58,237,0.2)] shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                      : "bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 border-[rgba(0,212,255,0.15)] shadow-[0_0_15px_rgba(0,212,255,0.1)]"
                  }`}>
                    <Icon className={`h-6 w-6 ${isPro ? "text-[#a78bfa]" : "text-[#00d4ff]"}`} />
                  </div>
                  <CardTitle className="font-bold">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className={`text-3xl font-black tracking-tight ${isPro ? "gradient-text" : ""}`}>
                      {isFree ? "Free" : formatPrice(plan.price_monthly)}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground text-sm">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Tier
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() =>
                        plan.stripe_price_id &&
                        handleCheckout(plan.id, plan.stripe_price_id)
                      }
                      disabled={!plan.stripe_price_id || checkoutLoading !== null}
                    >
                      {checkoutLoading === plan.id ? (
                        <Spinner size="sm" />
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Token Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
          <CardDescription>Base token costs by action (before model multiplier)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Chat Message", action: "chat" },
              { name: "Competitive Analysis", action: "competitive-analysis" },
              { name: "Gap Analysis", action: "gap-analysis" },
              { name: "PRD Document", action: "prd" },
              { name: "Technical Spec", action: "tech-spec" },
              { name: "Static Website", action: "app-static" },
              { name: "Dynamic Website", action: "app-dynamic" },
              { name: "Single Page App", action: "app-spa" },
              { name: "Progressive Web App", action: "app-pwa" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,212,255,0.15)] hover:bg-[rgba(0,212,255,0.03)] transition-all duration-200"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{BASE_ACTION_TOKENS[item.action as keyof typeof BASE_ACTION_TOKENS]} tokens</Badge>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] p-4 text-sm text-muted-foreground">
            <p>Model multiplier examples (full report = Competitive + PRD + MVP + Tech Spec):</p>
            <ul className="mt-2 space-y-1">
              <li>Fast model: ~{fullReportFast} tokens</li>
              <li>Balanced model: ~{fullReportBalanced} tokens</li>
              <li>Thinking model: ~{fullReportThinking} tokens</li>
            </ul>
            <p className="mt-2">Token value is configurable via <code>TOKEN_VALUE_CENTS</code> / <code>NEXT_PUBLIC_TOKEN_VALUE_CENTS</code> (current: {tokenValueLabel}).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
