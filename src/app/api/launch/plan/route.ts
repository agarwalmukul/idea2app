import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackAPIMetrics, MetricsTimer, getErrorType, getErrorMessage } from "@/lib/metrics-tracker"

export async function POST(request: Request) {
  const timer = new MetricsTimer()
  let statusCode = 200
  let errorType: string | undefined
  let errorMessage: string | undefined
  let userId: string | undefined
  let projectId: string | undefined
  const creditsConsumed = 5

  try {
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

    const body = await request.json()
    const { projectId: incomingProjectId, idea, name, marketingBrief } = body
    projectId = incomingProjectId

    if (!projectId || !idea || !name) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "projectId, idea, and name are required"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const brief = {
      targetAudience: String(marketingBrief?.targetAudience ?? "").trim(),
      stage: String(marketingBrief?.stage ?? "").trim(),
      budget: String(marketingBrief?.budget ?? "").trim(),
      channels: String(marketingBrief?.channels ?? "").trim(),
      launchWindow: String(marketingBrief?.launchWindow ?? "").trim(),
    }

    if (!brief.targetAudience || !brief.stage || !brief.budget || !brief.channels || !brief.launchWindow) {
      statusCode = 400
      errorType = "validation_error"
      errorMessage = "marketingBrief with 5 fields is required"
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      statusCode = 404
      errorType = "not_found"
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: consumed } = await supabase.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: creditsConsumed,
      p_action: "launch-plan",
      p_description: `launch-plan for \"${name}\"`,
    })

    if (!consumed) {
      statusCode = 402
      errorType = "insufficient_credits"
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 402 }
      )
    }

    const channels = brief.channels.split(",").map((c: string) => c.trim()).filter(Boolean)
    const immediateChannels = channels.slice(0, 3)
    const scheduledChannels = channels.slice(3)

    const content = `# Marketing Plan — ${name}

## Brief Inputs
- **Target audience:** ${brief.targetAudience}
- **Stage:** ${brief.stage}
- **Budget:** ${brief.budget}
- **Launch window:** ${brief.launchWindow}
- **Channels:** ${channels.join(", ")}

## Positioning
- **Product:** ${name}
- **Who it is for:** ${brief.targetAudience}
- **Core value prop:** ${idea.slice(0, 240)}${idea.length > 240 ? "..." : ""}

## Channel Priority
### Immediate (${brief.launchWindow})
${immediateChannels.length > 0 ? immediateChannels.map((c, i) => `${i + 1}. ${c}`).join("\n") : "1. Product Hunt\n2. X\n3. Founder communities"}

### Scheduled (next cycle)
${scheduledChannels.length > 0 ? scheduledChannels.map((c, i) => `${i + 1}. ${c}`).join("\n") : "1. Show HN\n2. Niche communities\n3. Email/waitlist"}

### Budget Allocation (starting point)
- **Content & creative:** 40%
- **Distribution/boosts:** 40%
- **Experiments:** 20%

> Adjust for stage: **${brief.stage}** and budget ceiling **${brief.budget}**.

## Copy Pack (MVP)
### One-liner
${name} helps ${brief.targetAudience} move from idea to launch faster with clearer execution and distribution planning.

### Short description
${name} turns raw concepts into build-ready plans and practical marketing execution so teams can ship and validate faster.

### Founder comment template
We are launching ${name} for ${brief.targetAudience}. Current stage: ${brief.stage}. Looking for feedback on messaging clarity, channel fit, and activation friction.

## 14-Day Execution Checklist
- [ ] Finalize positioning + one-liner
- [ ] Prepare launch assets (logo, screenshots, demo)
- [ ] Ship first 3 channel posts
- [ ] Track signups, activation, and channel-level conversion
- [ ] Publish one iteration based on feedback within 48h
`

    await supabase.from("analyses").insert({
      project_id: projectId,
      type: "launch-plan",
      content,
      metadata: {
        source: "inhouse",

        generated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ content, type: "launch-plan", source: "inhouse" })
  } catch (error) {
    statusCode = 500
    errorType = getErrorType(500, error)
    errorMessage = getErrorMessage(error)
    return NextResponse.json({ error: "Failed to generate launch plan." }, { status: 500 })
  } finally {
    if (userId) {
      trackAPIMetrics({
        endpoint: "/api/launch/plan",
        method: "POST",
        featureType: "analysis",
        userId,
        projectId: projectId || null,
        statusCode,
        responseTimeMs: timer.getElapsedMs(),
        creditsConsumed: statusCode === 200 ? creditsConsumed : 0,
        errorType,
        errorMessage,
      })
    }
  }
}
