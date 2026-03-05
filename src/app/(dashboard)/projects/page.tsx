import { createClient } from "@/lib/supabase/server"
import { DashboardProjectCard } from "@/components/projects/dashboard-project-card"
import { InspirationProjectsSection } from "@/components/projects/inspiration-projects-section"

type ActiveProject = {
  id: string
  name: string
  description: string | null
  href: string
}

type DbProject = {
  id: string
  name: string
  description: string | null
}

const fallbackProjects: ActiveProject[] = [
  {
    id: "fallback-1",
    name: "Prompt Forge",
    description:
      '> optimize persona="CTO" constraints=[latency<500ms, tone=concise]',
    href: "/projects/new",
  },
  {
    id: "fallback-2",
    name: "Prompt Forge",
    description:
      '> optimize persona="CTO" constraints=[latency<500ms, tone=concise]',
    href: "/projects/new",
  },
  {
    id: "fallback-3",
    name: "Workflow Pilot",
    description:
      '"create runbook from incident log + auto-generate rollback checklist"',
    href: "/projects/new",
  },
]

export default async function ProjectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })

  const activeProjects: ActiveProject[] = (projects?.length ? (projects as DbProject[]) : fallbackProjects).map(
    (project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      href: project.id?.startsWith("fallback-")
        ? "/projects/new"
        : `/projects/${project.id}`,
    })
  )

  return (
    <div className="flex flex-col h-full bg-background px-6 py-6 md:px-12 md:py-6 lg:px-[56px] lg:py-6">
      <section className="rounded-2xl border border-border-subtle bg-text-primary p-8 text-white">
        <header className="mb-7">
          <h1 className="font-bold text-[24px] leading-tight tracking-[-0.5px] text-white">
            Projects
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Manage and organize your AI-powered applications.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeProjects.map((project) => (
            <DashboardProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              href={project.href}
              showDelete={project.id?.startsWith("fallback-") === false}
            />
          ))}
        </div>
      </section>

      <div className="h-[1px] bg-border-subtle my-6" />

      <InspirationProjectsSection />
    </div>
  )
}
