import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

interface DocumentCounts {
  competitive: number
  prd: number
  mvp: number
  mockups: number
  techspec: number
  deploy: number
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined

  try {
    const { id } = await params
    projectId = id
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      statusCode = 401
      errorType = "unauthorized"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    userId = user.id

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      statusCode = 404
      errorType = "not_found"
      errorMessage = "Project not found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const [
      competitiveResult,
      prdResult,
      mvpResult,
      mockupResult,
      techSpecResult,
      deploymentResult,
    ] = await Promise.all([
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id)
        .eq("type", "competitive-analysis"),
      supabase
        .from("prds")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("mvp_plans")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("mockups" as any)
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("tech_specs")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("deployments")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
    ])

    const counts: DocumentCounts = {
      competitive: competitiveResult.count || 0,
      prd: prdResult.count || 0,
      mvp: mvpResult.count || 0,
      mockups: mockupResult.count || 0,
      techspec: techSpecResult.count || 0,
      deploy: deploymentResult.count || 0,
    }

    return NextResponse.json({
      data: {
        counts,
      },
    })
  } catch (error) {
    console.error("Error fetching project status:", error)
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json(
      { error: "Failed to load project generation status" },
      { status: 500 }
    )
  } finally {
    if (userId) {
      trackAPIMetrics({
        endpoint: `/api/projects/${projectId}/status`,
        method: "GET",
        featureType: "project-management",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed: 0,
        errorType,
        errorMessage,
      })
    }
  }
}
