import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProjectWorkspace } from "@/components/workspace/project-workspace"

interface ProjectPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const newProjectFlag = resolvedSearchParams.new
  const isNewProject =
    newProjectFlag === "1" || newProjectFlag === "true"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch all project data in parallel
  const [
    { data: analyses },
    { data: prds },
    { data: mvpPlans },
    { data: mockups },
    { data: techSpecs },
    { data: deployments },
    { data: credits },
  ] = await Promise.all([
    supabase.from("analyses").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("prds").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("mvp_plans").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("mockups" as any).select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("tech_specs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("deployments").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("credits").select("balance").eq("user_id", user!.id).single(),
  ])

  return (
    <ProjectWorkspace
      project={project}
      analyses={analyses || []}
      prds={prds || []}
      mvpPlans={mvpPlans || []}
      mockups={(mockups as any) || []}
      techSpecs={techSpecs || []}
      deployments={deployments || []}
      credits={credits?.balance || 0}
      user={user}
      isNewProject={isNewProject}
    />
  )
}
