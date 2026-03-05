import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next") ?? "/dashboard"

  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is a dev account and set up unlimited credits
      const { data: { user } } = await supabase.auth.getUser()

      if (user?.email === "nazarework@gmail.com") {
        // Assign Internal Dev plan with unlimited credits
        const { data: devPlan } = await supabase
          .from("plans")
          .select("id")
          .eq("name", "Internal Dev")
          .single()

        if (devPlan) {
          // Create or update subscription
          await supabase.from("subscriptions").upsert({
            user_id: user.id,
            plan_id: devPlan.id,
            status: "active",
          }, { onConflict: "user_id" })

          // Set unlimited credits
          await supabase.from("credits").upsert({
            user_id: user.id,
            balance: 999999,
          }, { onConflict: "user_id" })
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
