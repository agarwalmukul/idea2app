import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { InspirationProjectsSection } from "@/components/projects/inspiration-projects-section"
import { uiStylePresets } from "@/lib/ui-style-presets"
import { ArrowRight, CloudUpload, GitBranch, ListChecks, Rocket, ScanSearch, FileText } from "lucide-react"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
]

const featureCards = [
  {
    icon: ScanSearch,
    title: "Competitive Analysis",
    description: "Map rivals, uncover whitespace, and identify your most defensible angle in minutes.",
  },
  {
    icon: FileText,
    title: "PRD Generation",
    description: "Turn requirements into production-grade docs with acceptance criteria, scopes, and edge cases.",
  },
  {
    icon: Rocket,
    title: "App Generation",
    description: "Generate full-stack app scaffolds and implementation plans tailored to your product goals.",
  },
  {
    icon: GitBranch,
    title: "Architecture Mapping",
    description: "Model services, data flows, and technical tradeoffs before writing expensive code.",
  },
  {
    icon: ListChecks,
    title: "Task Breakdown",
    description: "Auto-generate milestones and execution checklists aligned with your timeline.",
  },
  {
    icon: CloudUpload,
    title: "1-Click Deploy",
    description: "Ship directly to cloud infrastructure once your plan and app are generated.",
  },
]

const steps = [
  {
    number: "01",
    body: "Describe your idea\nTell IDEA2 what you want to build, who it serves, and your business constraints.",
  },
  {
    number: "02",
    body: "Run AI analysis\nGenerate market research, gap analysis, risks, and confidence scores automatically.",
  },
  {
    number: "03",
    body: "Generate PRD + technical plan\nProduce implementation-ready documentation, architecture, and work breakdown.",
  },
  {
    number: "04",
    body: "Deploy with one click\nShip your generated app and iterate with AI guidance from a single workspace.",
  },
]

const plans = [
  {
    name: "Free",
    price: "$0/mo",
    points: ["2 projects", "Basic analysis", "Community support"],
    tone: "light",
    cta: "Choose Free",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Starter",
    price: "$29/mo",
    points: ["10 projects", "All analyses", "PRD export"],
    tone: "light",
    cta: "Start Starter",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
  {
    name: "Pro",
    price: "$79/mo",
    points: ["Unlimited projects", "App generation", "1-click deploy", "Priority support"],
    tone: "dark",
    cta: "Go Pro",
    ctaClasses: "h-11 bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    name: "Enterprise",
    price: "Custom",
    points: ["Dedicated VPC", "SSO + RBAC", "Custom integrations"],
    tone: "light",
    cta: "Talk to Sales",
    ctaClasses: "h-11 border border-text-primary bg-white text-text-primary hover:bg-muted",
  },
]

const container = "mx-auto w-full max-w-[1320px] px-6 sm:px-8 lg:px-14"

function SectionCard({ children }: { children: ReactNode }) {
  return <section className={`${container} py-8 md:py-10`}>{children}</section>
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-text-primary">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/95 backdrop-blur-sm">
        <div className={`${container} ui-row-between h-16`}>
          <div className="ui-row-gap-3">
            <div className="h-9 w-9 rounded-sm bg-primary text-white flex items-center justify-center font-bold">I</div>
            <span className="text-lg font-semibold tracking-[0.01em]">Idea2App</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a key={item.label} href={item.href} className="text-sm font-medium text-text-primary hover:text-text-secondary">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden ui-row-gap-3 md:flex">
            <Link href="/login">
              <Button variant="outline" className="h-10 border-text-primary px-6 text-sm font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="h-10 px-6 bg-primary text-primary-foreground">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <SectionCard>
        <div className="flex items-center justify-center pt-10 pb-8 md:pt-14">
          <div className="inline-flex items-center rounded-full border border-border-subtle px-4 py-2 text-xs font-medium tracking-[0.16em] text-text-secondary">
            AI-Powered Business Idea Platform
          </div>
        </div>

        <h1 className="max-w-[980px] mx-auto text-center text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.06em] font-semibold">
          Transform Your Ideas Into Reality
        </h1>

        <p className="mx-auto mt-6 max-w-[780px] text-center text-[20px] leading-relaxed text-text-secondary">
          Go from rough concept to validated plan, generated PRD, and deploy-ready app in one AI-assisted workflow.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/signup">
            <Button className="h-14 px-7 bg-primary text-base font-semibold text-white">Get Started Free</Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" className="h-14 px-7 border-border-subtle text-base font-semibold bg-white text-text-primary">
              Learn More
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-[780px] gap-4 sm:grid-cols-3">
          <div className="flex h-[112px] flex-col items-center justify-center border border-text-primary bg-text-primary text-white p-4">
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">5+</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#F0F0F0]">Analysis Types</p>
          </div>
          <div className={uiStylePresets.landingStatCard}>
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">AI</p>
            <p className={uiStylePresets.landingFeaturePill}>Powered</p>
          </div>
          <div className={uiStylePresets.landingStatCard}>
            <p className="text-[36px] font-semibold leading-none tracking-[-0.06em]">1-Click</p>
            <p className={uiStylePresets.landingFeaturePill}>Deploy</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <section id="features" className="py-3">
          <p className="ui-kicker-label">Features</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            Everything You Need To Build Smarter
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((item) => (
              <article key={item.title} className="border border-border-subtle bg-white p-6 md:p-7">
                <div className="flex h-10 w-10 items-center justify-center bg-text-primary text-white">
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-4 text-[14px] leading-relaxed text-text-secondary">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <section id="how-it-works" className="py-3">
          <p className="ui-kicker-label">How It Works</p>
          <h2 className="mt-4 max-w-[760px] text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            From Idea To Deployed Product
          </h2>

          <div className="mt-8 space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="grid grid-cols-[auto,1fr] gap-5 border border-border-subtle p-5 md:p-6">
                <p className="text-[36px] leading-none font-semibold tracking-[-0.06em] text-primary">{step.number}</p>
                <p className="whitespace-pre-line text-[16px] leading-7 text-text-primary">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <section id="pricing" className="py-3">
          <p className="ui-kicker-label">Pricing</p>
          <h2 className="mt-4 max-w-[840px] text-[clamp(2rem,4vw,3.35rem)] leading-[0.98] tracking-[-0.06em] font-semibold">
            Plans For Builders At Every Stage
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isDark = plan.tone === "dark"
              return (
                <article
                  key={plan.name}
                  className={`flex min-h-full flex-col border p-7 ${
                    isDark
                      ? "border-text-primary bg-text-primary text-white"
                      : "border-border-subtle bg-white text-text-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[26px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                    {isDark && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white">
                        Best Value
                      </span>
                    )}
                  </div>

                  <p className={`mt-2 text-4xl font-semibold tracking-[-0.05em] ${isDark ? "text-primary" : "text-text-primary"}`}>
                    {plan.price}
                  </p>

                  <div className="mt-8 mb-6 space-y-3 border-b border-[rgba(0,0,0,0.08)] pb-6 dark:border-white/20">
                    {plan.points.map((point) => (
                      <p key={point} className={`text-sm ${isDark ? "text-text-muted" : "text-text-secondary"}`}>
                        {point}
                      </p>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <Button className={`w-full ${plan.ctaClasses}`}>{plan.cta}</Button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </SectionCard>

      <SectionCard>
        <InspirationProjectsSection />
      </SectionCard>

      <section className="border-t border-border-subtle py-16 md:py-20">
        <div className={`${container} text-center`}>
          <h2 className="mx-auto max-w-[860px] text-[clamp(2rem,4.6vw,4rem)] leading-[0.96] tracking-[-0.06em] font-semibold">
            Ready To Turn Your Next Idea Into A Real Product?
          </h2>
          <p className="mx-auto mt-6 max-w-[760px] text-xl text-text-secondary">
            Join founders and product teams using IDEA2 to research, plan, generate, and launch faster.
          </p>
          <Link href="/signup" className="inline-block mt-8">
            <Button className="h-14 px-8 text-base font-semibold bg-primary text-white">
              Get Started Free
              <ArrowRight className="ml-2 ui-icon-16" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className={`${container} ui-row-between h-[88px] flex-wrap gap-5 text-sm`}>
          <span className="font-mono text-[11px] tracking-[0.05em] text-text-muted">(c) 2026 Idea2App. All rights reserved.</span>
          <div className="flex items-center gap-5 font-mono text-[11px] tracking-[0.05em] text-text-muted">
            <a href="#" className={uiStylePresets.subtleLinkHover}>Terms</a>
            <a href="#" className={uiStylePresets.subtleLinkHover}>Privacy</a>
            <a href="#" className={uiStylePresets.subtleLinkHover}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
