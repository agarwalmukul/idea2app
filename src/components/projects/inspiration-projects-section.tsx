import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { uiStylePresets } from "@/lib/ui-style-presets"

const inspirationProjects = [
  // TODO: keep #FF3B30 local as intentionally unique project emphasis color.
  {
    category: "FINTECH • CRM",
    title: "Apex Revenue OS",
    description: "+34% qualified pipeline in 60 days",
    action: "View Project",
    buttonClass: "bg-[#FF3B30] border-[#FF3B30] text-white",
    cardClass: "bg-text-primary text-white",
    titleClass: "text-white",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
  {
    category: "TRAVEL • MARKETPLACE",
    title: "StayFlow Booking Platform",
    description: "Cut onboarding time by 41% with instant host setup",
    action: "Explore Breakdown",
    buttonClass: "bg-text-primary border-text-primary text-white",
    cardClass: "bg-white text-text-primary",
    titleClass: "text-text-primary",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
  {
    category: "FINANCE • ANALYTICS",
    title: "Northstar Budget Suite",
    description: "Improved monthly retention by 22% via insight alerts",
    action: "View Project",
    buttonClass: "bg-text-primary border-text-primary text-white",
    cardClass: "bg-white text-text-primary",
    titleClass: "text-text-primary",
    categoryClass: "text-[#FF3B30]",
    href: "/projects",
  },
]

export function InspirationProjectsSection() {
  return (
    <section className="rounded-2xl border border-border-subtle bg-white p-7">
      <div className="mb-4 flex flex-col gap-3">
        <h2 className="text-[24px] leading-tight font-bold tracking-[-0.5px] text-text-primary">
          Get inspired by pre-made projects
        </h2>
        <p className="text-sm leading-[1.5] text-text-secondary">
          Browse successful apps already launched by other teams and use them as a starting point for your next build.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full border border-text-primary bg-text-primary px-3 text-xs ui-font-medium text-white">
            Case Studies
          </span>
          <span className={uiStylePresets.tagPill}>
            Top Performers
          </span>
          <span className={uiStylePresets.tagPill}>
            Recently Shipped
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {inspirationProjects.map((project) => (
          <article
            key={project.title}
            className={`min-h-[210px] rounded-2xl border border-border-subtle p-5 ${project.cardClass} flex flex-col justify-between`}
          >
            <div className="ui-stack-2">
              <p className={`text-[12px] ui-font-medium ${project.categoryClass}`}>{project.category}</p>
              <h3 className={`text-[24px] leading-tight font-bold tracking-[-0.5px] ${project.titleClass}`}>
                {project.title}
              </h3>
              <p className="text-sm text-text-muted dark:text-text-secondary">
                {project.description}
              </p>
            </div>
            <Link
              href={project.href}
              className={`mt-6 inline-flex h-9 items-center gap-2 rounded-lg border px-[18px] py-2 text-sm ui-font-medium ${project.buttonClass}`}
            >
              {project.action}
              <ArrowRight className="ui-icon-16" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
