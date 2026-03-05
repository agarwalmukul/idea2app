"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { CREDIT_COSTS } from "@/lib/utils"
import { uiStylePresets } from "@/lib/ui-style-presets"
import {
  BarChart3,
  Search,
  FileText,
  Code,
  Rocket,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  Download,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { downloadMarkdownAsPDF } from "@/lib/pdf-utils"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

interface AnalysisPanelProps {
  projectId: string
  project: {
    id: string
    name: string
    description: string
  }
  analyses: Array<{
    id: string
    content?: string
    type?: string
    status?: string | null
    deployment_url?: string | null
    created_at: string | null
    [key: string]: unknown
  }>
  competitiveAnalyses?: Array<{
    id: string
    content?: string
    type?: string
    created_at: string | null
    [key: string]: unknown
  }>
  prds?: Array<{
    id: string
    content?: string
    created_at: string | null
    [key: string]: unknown
  }>
  credits: number
  type: "analysis" | "prd" | "techspec" | "deploy"
}

const analysisTypes = [
  {
    id: "competitive-analysis",
    name: "Competitive Analysis",
    description: "Analyze competitors, market positioning, and industry landscape",
    icon: BarChart3,
    credits: CREDIT_COSTS["competitive-analysis"],
    gradient: "from-text-accent to-[#0ea5e9]",
  },
  {
    id: "gap-analysis",
    name: "Gap Analysis",
    description: "Identify market gaps, opportunities, and potential challenges",
    icon: Search,
    credits: CREDIT_COSTS["gap-analysis"],
    gradient: "from-[#34d399] to-text-accent",
  },
]

const appTypes = [
  {
    id: "static",
    name: "Static Website",
    description: "HTML/CSS/JS - Simple and fast hosting",
    icon: Globe,
    credits: CREDIT_COSTS["app-static"],
    gradient: "from-text-accent to-[#0ea5e9]",
  },
  {
    id: "dynamic",
    name: "Dynamic Website",
    description: "Next.js with API routes and database",
    icon: Monitor,
    credits: CREDIT_COSTS["app-dynamic"],
    gradient: "from-[#7c3aed] to-[#a855f7]",
  },
  {
    id: "spa",
    name: "Single Page App",
    description: "React SPA with state management",
    icon: Smartphone,
    credits: CREDIT_COSTS["app-spa"],
    gradient: "from-[#f472b6] to-[#fb923c]",
  },
  {
    id: "pwa",
    name: "Progressive Web App",
    description: "PWA with offline support and service workers",
    icon: Zap,
    credits: CREDIT_COSTS["app-pwa"],
    gradient: "from-[#34d399] to-text-accent",
  },
]

export function AnalysisPanel({ projectId, project, analyses, competitiveAnalyses, prds, credits, type }: AnalysisPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const [showCompetitiveAnalysisBanner, setShowCompetitiveAnalysisBanner] = useState(false)
  const [showPrdBanner, setShowPrdBanner] = useState(false)
  const router = useRouter()

  // Get the latest competitive analysis
  const latestCompetitiveAnalysis = competitiveAnalyses?.find(
    (analysis) => analysis.type === "competitive-analysis"
  )

  // Get the latest PRD
  const latestPrd = prds?.[0]

  const runAnalysis = async (analysisType: string) => {
    setLoading(analysisType)
    setError(null)

    try {
      const payload: {
        projectId: string
        idea: string
        name: string
        competitiveAnalysis?: string
        prd?: string
      } = {
        projectId,
        idea: project.description,
        name: project.name,
      }

      // Include competitive analysis for PRD generation
      if (analysisType === "prd" && latestCompetitiveAnalysis?.content) {
        payload.competitiveAnalysis = latestCompetitiveAnalysis.content
      }

      // Include PRD for tech spec generation
      if (analysisType === "tech-spec" && latestPrd?.content) {
        payload.prd = latestPrd.content
      }

      const response = await fetch(`/api/analysis/${analysisType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(null)
    }
  }

  const generateApp = async (appType: string) => {
    setLoading(appType)
    setError(null)

    try {
      const response = await fetch("/api/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          appType,
          idea: project.description,
          name: project.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "App generation failed")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(null)
    }
  }

  const handleDownloadPDF = async (
    analysisId: string,
    content: string,
    analysisType: string
  ) => {
    setDownloadingPdf(analysisId)
    try {
      const filename = `${project.name}-${analysisType}-${new Date().toISOString().split("T")[0]}.pdf`
      await downloadMarkdownAsPDF(content, filename, project.name, analysisType)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF")
    } finally {
      setDownloadingPdf(null)
    }
  }

  if (type === "analysis") {
    return (
      <div className="ui-stack-6">
        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {analysisTypes.map((analysis) => (
            <Card key={analysis.id} className="group hover:border-text-accent/20 transition-all duration-300 hover:shadow-[0_0_25px_var(--color-accent-primary-whisper)]">
              <CardHeader>
                <div className="ui-row-between">
                  <div className="ui-row-gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${analysis.gradient} flex items-center justify-center shadow-lg`}>
                      <analysis.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="ui-section-title">{analysis.name}</CardTitle>
                      <CardDescription>{analysis.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="ui-row-between">
                  <Badge variant="outline">{analysis.credits} credits</Badge>
                  <Button
                    onClick={() => runAnalysis(analysis.id)}
                    disabled={loading !== null || credits < analysis.credits}
                    size="sm"
                  >
                    {loading === analysis.id ? (
                      <>
                        <Spinner size="sm" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="ui-icon-16 mr-1" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div className={uiStylePresets.analysisErrorBanner}>
            {error}
          </div>
        )}

        {/* Previous Results */}
        {analyses.length > 0 && (
          <div className="space-y-4">
            <h3 className="ui-section-title">Previous Results</h3>
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <div className="ui-row-between">
                    <div className="ui-row-gap-2">
                      <Badge>{analysis.type}</Badge>
                      <span className="ui-text-sm-muted">
                        {new Date(analysis.created_at!).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="ui-row-gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(analysis.content || "")
                        }}
                      >
                        <Download className="ui-icon-16 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(
                            analysis.id,
                            analysis.content || "",
                            analysis.type || "analysis"
                          )
                        }
                        disabled={downloadingPdf === analysis.id}
                      >
                        {downloadingPdf === analysis.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="ui-icon-16 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto">
                    <MarkdownRenderer content={analysis.content || ""} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === "prd") {
    const hasCompetitiveAnalysis = !!latestCompetitiveAnalysis
    const isPrdButtonDisabled = loading !== null || credits < CREDIT_COSTS.prd || !hasCompetitiveAnalysis

    return (
      <div className="ui-stack-6">
        <Card>
          <CardHeader>
            <div className="ui-row-between">
              <div className="ui-row-gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#f472b6] flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="ui-section-title">Product Requirements Document</CardTitle>
                  <CardDescription>
                    Generate a comprehensive PRD for your business idea
                  </CardDescription>
                </div>
              </div>
              <div className="ui-row-gap-2">
                <Badge variant="outline">{CREDIT_COSTS.prd} credits</Badge>
                <Button
                  onClick={() => {
                    if (!hasCompetitiveAnalysis) {
                      setShowCompetitiveAnalysisBanner(true)
                      return
                    }
                    runAnalysis("prd")
                  }}
                  disabled={isPrdButtonDisabled}
                  size="sm"
                  className={!hasCompetitiveAnalysis ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {loading === "prd" ? (
                    <>
                      <Spinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    "Generate PRD"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {showCompetitiveAnalysisBanner && !hasCompetitiveAnalysis && (
          <div className={uiStylePresets.analysisDependencyBanner}>
            <span>You need to generate a Competitive Analysis first before creating a PRD.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompetitiveAnalysisBanner(false)}
              className={uiStylePresets.analysisDismissAction}
            >
              Dismiss
            </Button>
          </div>
        )}

        {error && (
          <div className={uiStylePresets.analysisErrorBanner}>
            {error}
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-4">
            {analyses.map((prd) => (
              <Card key={prd.id}>
                <CardHeader>
                  <div className="ui-row-between">
                    <span className="ui-text-sm-muted">
                      Version {String((prd as Record<string, unknown>).version || 1)} | {new Date(prd.created_at!).toLocaleDateString()}
                    </span>
                    <div className="ui-row-gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(prd.content || "")}
                      >
                        <Download className="ui-icon-16 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(prd.id, prd.content || "", "prd")
                        }
                        disabled={downloadingPdf === prd.id}
                      >
                        {downloadingPdf === prd.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="ui-icon-16 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer content={prd.content || ""} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === "techspec") {
    const hasPrd = !!latestPrd
    const isTechSpecButtonDisabled = loading !== null || credits < CREDIT_COSTS["tech-spec"] || !hasPrd

    return (
      <div className="ui-stack-6">
        <Card>
          <CardHeader>
            <div className="ui-row-between">
              <div className="ui-row-gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center shadow-lg">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="ui-section-title">Technical Specification</CardTitle>
                  <CardDescription>
                    Generate detailed technical specifications for your product
                  </CardDescription>
                </div>
              </div>
              <div className="ui-row-gap-2">
                <Badge variant="outline">{CREDIT_COSTS["tech-spec"]} credits</Badge>
                <Button
                  onClick={() => {
                    if (!hasPrd) {
                      setShowPrdBanner(true)
                      return
                    }
                    runAnalysis("tech-spec")
                  }}
                  disabled={isTechSpecButtonDisabled}
                  size="sm"
                  className={!hasPrd ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {loading === "tech-spec" ? (
                    <>
                      <Spinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    "Generate Tech Spec"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {showPrdBanner && !hasPrd && (
          <div className={uiStylePresets.analysisDependencyBanner}>
            <span>You need to generate a PRD first before creating a Technical Specification.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrdBanner(false)}
              className={uiStylePresets.analysisDismissAction}
            >
              Dismiss
            </Button>
          </div>
        )}

        {error && (
          <div className={uiStylePresets.analysisErrorBanner}>
            {error}
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-4">
            {analyses.map((spec) => (
              <Card key={spec.id}>
                <CardHeader>
                  <div className="ui-row-between">
                    <span className="ui-text-sm-muted">
                      Version {String((spec as Record<string, unknown>).version || 1)} | {new Date(spec.created_at!).toLocaleDateString()}
                    </span>
                    <div className="ui-row-gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(spec.content || "")}
                      >
                        <Download className="ui-icon-16 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPDF(spec.id, spec.content || "", "tech-spec")
                        }
                        disabled={downloadingPdf === spec.id}
                      >
                        {downloadingPdf === spec.id ? (
                          <>
                            <Spinner size="sm" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="ui-icon-16 mr-1" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MarkdownRenderer content={spec.content || ""} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Deploy tab
  return (
    <div className="ui-stack-6">
      <Card>
        <CardHeader>
          <div className="ui-row-gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#34d399] to-text-accent flex items-center justify-center shadow-lg">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="ui-section-title">Generate & Deploy Application</CardTitle>
              <CardDescription>
                Choose an app type to generate and deploy a working prototype
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {appTypes.map((app) => (
              <div
                key={app.id}
                className="group p-4 rounded-xl border border-surface-mid bg-[var(--color-surface-whisper)] hover:border-text-accent/20 hover:bg-text-accent/3 transition-all duration-300"
              >
                <div className="ui-row-gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg group-hover:shadow-[0_0_15px_var(--color-accent-primary-soft)] transition-shadow duration-300`}>
                    <app.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="ui-font-semibold ui-tracking-tight">{app.name}</h4>
                    <p className="ui-text-sm-muted">{app.description}</p>
                  </div>
                </div>
                <div className="ui-row-between">
                  <Badge variant="outline">{app.credits} credits</Badge>
                  <Button
                    onClick={() => generateApp(app.id)}
                    disabled={loading !== null || credits < app.credits}
                    size="sm"
                    variant="outline"
                  >
                    {loading === app.id ? (
                      <>
                        <Spinner size="sm" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className={uiStylePresets.analysisErrorBanner}>
          {error}
        </div>
      )}

      {/* Previous Deployments */}
      {analyses.length > 0 && (
        <div className="space-y-4">
          <h3 className="ui-section-title">Deployments</h3>
          {analyses.map((deployment) => (
            <Card key={deployment.id}>
              <CardHeader>
                <div className="ui-row-between">
                  <div className="ui-row-gap-2">
                    <Badge
                      variant={deployment.status === "deployed" ? "success" : deployment.status === "failed" ? "destructive" : "secondary"}
                    >
                      {deployment.status || "pending"}
                    </Badge>
                    <span className="ui-text-sm-muted">
                      {new Date(deployment.created_at!).toLocaleDateString()}
                    </span>
                  </div>
                  {deployment.deployment_url && (
                    <a
                      href={deployment.deployment_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-2">
                        <ExternalLink className="ui-icon-16" />
                        View App
                      </Button>
                    </a>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
