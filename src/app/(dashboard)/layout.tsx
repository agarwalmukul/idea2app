import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: creditsData } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()

  return (
    <DashboardShell
      user={{
        email: user.email,
        full_name: profileData?.full_name ?? undefined,
        avatar_url: profileData?.avatar_url ?? undefined,
      }}
      credits={creditsData?.balance || 0}
    >
      {children}
    </DashboardShell>
  )
}
