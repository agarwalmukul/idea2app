import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface MockupParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: MockupParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify ownership and update
    const { data: mockup, error } = await supabase
      .from("mockups" as any)
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("project_id", await getUserProjectId(supabase, user.id, id))
      .select()
      .single()

    if (error || !mockup) {
      return NextResponse.json(
        { error: "Mockup not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: mockup })
  } catch (error) {
    console.error("Error updating mockup:", error)
    return NextResponse.json({ error: "Failed to update mockup" }, { status: 500 })
  }
}

// Helper function to verify project ownership
async function getUserProjectId(supabase: any, userId: string, mockupId: string): Promise<string | null> {
  const { data: mockup } = await supabase
    .from("mockups" as any)
    .select("project_id")
    .eq("id", mockupId)
    .single()

  if (!mockup) return null

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", mockup.project_id)
    .eq("user_id", userId)
    .single()

  return project?.id || null
}
