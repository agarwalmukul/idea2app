import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripeClient } from "@/lib/stripe"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import type Stripe from "stripe"

function logWebhook(level: "info" | "warn" | "error", message: string, context: Record<string, unknown> = {}) {
  const payload = {
    scope: "stripe_webhook",
    level,
    message,
    ts: new Date().toISOString(),
    ...context,
  }

  if (level === "error") {
    console.error(JSON.stringify(payload))
    return
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload))
    return
  }

  console.info(JSON.stringify(payload))
}

// Use service role for webhook handling (no user context)
function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    logWebhook("warn", "Missing Stripe signature header")
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    logWebhook("error", "Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  const supabase = getAdminClient()

  logWebhook("info", "Webhook event received", {
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
  })

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planId = session.metadata?.plan_id

        if (userId && planId) {
          // Get plan details
          const { data: plan } = await supabase
            .from("plans")
            .select("*")
            .eq("id", planId)
            .single()

          if (plan) {
            // Create or update subscription
            await supabase.from("subscriptions").upsert(
              {
                user_id: userId,
                plan_id: planId,
                stripe_subscription_id: session.subscription as string,
                status: "active",
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
              },
              { onConflict: "user_id" }
            )

            // Add credits
            await supabase.rpc("add_credits", {
              p_user_id: userId,
              p_amount: plan.credits_monthly,
              p_action: "subscription",
              p_description: `${plan.name} plan subscription`,
            })
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as Record<string, unknown>
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (profile) {
          const periodEnd = subscription.current_period_end as number | undefined
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status as string,
              cancel_at_period_end: subscription.cancel_at_period_end as boolean,
              ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (profile) {
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id)
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as Record<string, unknown>
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        // Only process for renewal (not first payment)
        if (invoice.billing_reason === "subscription_cycle") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single()

          if (profile) {
            // Get the plan from subscription
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("plan_id, plans(*)")
              .eq("stripe_subscription_id", subscriptionId)
              .single()

            if (sub?.plans) {
              const plan = sub.plans as unknown as { credits_monthly: number; name: string }
              // Add monthly credits
              await supabase.rpc("add_credits", {
                p_user_id: profile.id,
                p_amount: plan.credits_monthly,
                p_action: "subscription_renewal",
                p_description: `Monthly credit renewal - ${plan.name}`,
              })
            }
          }
        }
        break
      }

      default:
        logWebhook("info", "Unhandled Stripe event type", {
          event_id: event.id,
          event_type: event.type,
        })
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logWebhook("error", "Webhook processing error", {
      event_id: event.id,
      event_type: event.type,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
