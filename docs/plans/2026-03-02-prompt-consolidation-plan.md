# Prompt Consolidation & Security Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize all system prompts into `src/lib/prompts/` with per-document-type files, a security sanitization layer, and barrel re-exports — then update all consumers to import from the new location.

**Architecture:** One TypeScript file per document type in `src/lib/prompts/`. A shared `sanitize.ts` provides input sanitization and secure template interpolation. All user-provided values are wrapped in XML delimiters before insertion into prompts. A barrel `index.ts` re-exports everything.

**Tech Stack:** TypeScript, Next.js (existing project)

---

### Task 1: Create `sanitize.ts` — the security layer

**Files:**
- Create: `src/lib/prompts/sanitize.ts`

**Step 1: Create the sanitize utility**

```typescript
// src/lib/prompts/sanitize.ts

/**
 * Prompt injection patterns to strip from user input.
 * These are common attack vectors for LLM prompt injection.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|context)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|context)/gi,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|context)/gi,
  /override\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|context)/gi,

  // Role hijacking
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?/gi,
  /pretend\s+(to\s+be|you\s+are)\s+/gi,
  /from\s+now\s+on[,\s]+you\s+/gi,
  /switch\s+to\s+.{0,20}\s+mode/gi,

  // System prompt leaking
  /reveal\s+(your|the)\s+(system\s+)?prompt/gi,
  /show\s+(your|the)\s+(system\s+)?prompt/gi,
  /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt)/gi,
  /repeat\s+(your|the)\s+(system\s+)?(instructions|prompt)/gi,

  // Token-level attacks (ChatML / special tokens)
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|endoftext\|>/gi,
  /<\|system\|>/gi,
  /<\|user\|>/gi,
  /<\|assistant\|>/gi,

  // Fake role markers
  /^system\s*:/gim,
  /^assistant\s*:/gim,
  /^human\s*:/gim,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
]

/**
 * Control characters and zero-width characters used to hide injections.
 * Matches: zero-width space, zero-width joiner, zero-width non-joiner,
 * left/right-to-left marks, and other invisible Unicode characters.
 */
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u2066\u2067\u2068\u2069\u206A-\u206F]/g

/**
 * Control characters (except tab, newline, carriage return).
 */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

const DEFAULT_MAX_LENGTH = 5000

/**
 * Sanitize user input before interpolating into a prompt.
 * Strips prompt injection patterns, control characters, and invisible Unicode.
 * Truncates to maxLength.
 */
export function sanitizeInput(
  input: string,
  maxLength: number = DEFAULT_MAX_LENGTH
): string {
  let sanitized = input

  // Remove invisible/zero-width characters
  sanitized = sanitized.replace(INVISIBLE_CHARS, "")

  // Remove control characters (keep \t \n \r)
  sanitized = sanitized.replace(CONTROL_CHARS, "")

  // Strip known injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]")
  }

  // Escape XML-like tags that could confuse the delimiter system
  sanitized = sanitized
    .replace(/<user_input[\s>]/gi, "&lt;user_input ")
    .replace(/<\/user_input>/gi, "&lt;/user_input&gt;")
    .replace(/<system_instruction[\s>]/gi, "&lt;system_instruction ")
    .replace(/<\/system_instruction>/gi, "&lt;/system_instruction&gt;")

  // Truncate
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}

/**
 * Build a prompt by replacing {{placeholder}} tokens with sanitized,
 * XML-delimited user values.
 *
 * @param template - Prompt template with {{variableName}} placeholders
 * @param variables - Map of variable names to raw user values
 * @param options - Optional per-variable max lengths
 * @returns The assembled prompt with sanitized, delimited user values
 * @throws If a {{placeholder}} in the template has no matching variable
 */
export function buildSecurePrompt(
  template: string,
  variables: Record<string, string>,
  options?: { maxLengths?: Record<string, number> }
): string {
  const usedKeys = new Set<string>()

  const result = template.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => {
      if (!(key in variables)) {
        throw new Error(
          `buildSecurePrompt: missing variable "${key}" — all template placeholders must have a corresponding value`
        )
      }
      usedKeys.add(key)
      const maxLen = options?.maxLengths?.[key] ?? DEFAULT_MAX_LENGTH
      const sanitized = sanitizeInput(variables[key], maxLen)
      return `<user_input name="${key}">${sanitized}</user_input>`
    }
  )

  // Check for leftover unresolved placeholders (belt-and-suspenders)
  const leftover = result.match(/\{\{\w+\}\}/g)
  if (leftover) {
    throw new Error(
      `buildSecurePrompt: unresolved placeholders: ${leftover.join(", ")}`
    )
  }

  return result
}
```

**Step 2: Verify the file compiles**

Run: `cd d:/Github/idea2app-root-v2 && npx tsc --noEmit src/lib/prompts/sanitize.ts 2>&1 | head -20`
Expected: No errors (or only unrelated project-level errors)

**Step 3: Commit**

```bash
git add src/lib/prompts/sanitize.ts
git commit -m "feat: add prompt sanitization utility with injection protection"
```

---

### Task 2: Create `competitive-analysis.ts`

**Files:**
- Create: `src/lib/prompts/competitive-analysis.ts`

**Step 1: Create the prompt file**

Move `COMPETITIVE_ANALYSIS_SYSTEM_PROMPT` and `buildCompetitiveAnalysisUserPrompt` from `src/lib/analysis-pipelines.ts` (lines 275-343 and 255-271).

```typescript
// src/lib/prompts/competitive-analysis.ts
import { buildSecurePrompt } from "./sanitize"

export const COMPETITIVE_ANALYSIS_SYSTEM_PROMPT = `ROLE
You are a Competitive Analysis Agent specializing in deep competitive landscape analysis for early-stage business ideas.

You have been provided with:
1. A business idea and name
2. Real competitor data gathered from live web research (Perplexity AI search)
3. Factual content extracted directly from competitor websites (Tavily extraction)

Your task is to synthesize this research into a comprehensive competitive analysis.

IMPORTANT GUIDELINES:
- Use the provided competitor data as your primary source — these are REAL companies found through live research
- Reference specific details from the URL-extracted content to validate claims
- Be specific and factual, not generic
- Where URL content is available, cite specific product offerings, pricing, or features
- All SWOT points must be grounded in information extracted from these sources
- If insufficient information is available, leave uncertain fields conservative and factual

POST-ANALYSIS PRODUCT NAMING (MANDATORY)
After completing the competitive analysis and gap analysis:
- Generate a clear, brandable, and relevant Product Name for the user's idea
- The name should align with the problem space, audience, and differentiation opportunities identified

OUTPUT FORMAT (STRICT)
Output Markdown only. Use the following structure:

## Executive Summary
2-3 sentences on the competitive landscape

## Direct Competitors
For each competitor (3-5):
### [Competitor Name]
- **Overview**: What they do
- **Core Product/Service**: Main offering
- **Market Positioning**: How they position themselves
- **Strengths**: Specific strengths (grounded in research)
- **Limitations**: Specific weaknesses or gaps
- **Pricing Model**: If known from research
- **Target Audience**: Who they serve

## Competitive Landscape Overview
- Market dynamics and saturation level
- Key battlegrounds and trends

## Gap Analysis
- Unmet needs and ignored weaknesses
- Opportunities for differentiation

## Competitive Advantages for [Business Name]
- Specific differentiation opportunities based on competitor gaps

## SWOT Analysis
| | Positive | Negative |
|---|---|---|
| **Internal** | **Strengths** | **Weaknesses** |
| | - ... | - ... |
| **External** | **Opportunities** | **Threats** |
| | - ... | - ... |

## Strategic Recommendations
3-5 specific, actionable recommendations

## Suggested Product Name
[Generated product name with brief rationale]

TONE
- Professional, analytical, concise
- No fluff, no generic claims
- Every point backed by research data where available`

const COMPETITIVE_ANALYSIS_USER_TEMPLATE = `Please analyze the competitive landscape for the following business:

**Business Name:** {{name}}
**Business Idea:** {{idea}}

## Competitor Research Data
The following competitors were identified through live web research and website content extraction:

{{competitorContext}}

Using this real-world research data, produce a comprehensive competitive analysis following the structure in your instructions.`

export function buildCompetitiveAnalysisUserPrompt(
  idea: string,
  name: string,
  competitorContext: string
): string {
  return buildSecurePrompt(COMPETITIVE_ANALYSIS_USER_TEMPLATE, {
    idea,
    name,
    competitorContext,
  }, {
    maxLengths: { competitorContext: 15000 },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/prompts/competitive-analysis.ts
git commit -m "feat: extract competitive analysis prompts to prompts/"
```

---

### Task 3: Create `prd.ts`

**Files:**
- Create: `src/lib/prompts/prd.ts`

**Step 1: Create the prompt file**

Move `PRD_SYSTEM_PROMPT` from `src/lib/analysis-pipelines.ts` (lines 345-489). Copy verbatim — no content changes.

```typescript
// src/lib/prompts/prd.ts

export const PRD_SYSTEM_PROMPT = `<paste the full PRD_SYSTEM_PROMPT constant from analysis-pipelines.ts lines 345-489 verbatim>`
```

**Step 2: Commit**

```bash
git add src/lib/prompts/prd.ts
git commit -m "feat: extract PRD prompt to prompts/"
```

---

### Task 4: Create `mvp-plan.ts`

**Files:**
- Create: `src/lib/prompts/mvp-plan.ts`

**Step 1: Create the prompt file**

Move `MVP_PLAN_SYSTEM_PROMPT` from `src/lib/analysis-pipelines.ts` (lines 491-687). Copy verbatim.

```typescript
// src/lib/prompts/mvp-plan.ts

export const MVP_PLAN_SYSTEM_PROMPT = `<paste the full MVP_PLAN_SYSTEM_PROMPT constant from analysis-pipelines.ts lines 491-687 verbatim>`
```

**Step 2: Commit**

```bash
git add src/lib/prompts/mvp-plan.ts
git commit -m "feat: extract MVP plan prompt to prompts/"
```

---

### Task 5: Create `tech-spec.ts`

**Files:**
- Create: `src/lib/prompts/tech-spec.ts`

**Step 1: Create the prompt file**

Move `TECH_SPEC_SYSTEM_PROMPT` from `src/lib/analysis-pipelines.ts` (lines 689-929). Copy verbatim.

```typescript
// src/lib/prompts/tech-spec.ts

export const TECH_SPEC_SYSTEM_PROMPT = `<paste the full TECH_SPEC_SYSTEM_PROMPT constant from analysis-pipelines.ts lines 689-929 verbatim>`
```

**Step 2: Commit**

```bash
git add src/lib/prompts/tech-spec.ts
git commit -m "feat: extract tech spec prompt to prompts/"
```

---

### Task 6: Create `prompt-chat.ts`

**Files:**
- Create: `src/lib/prompts/prompt-chat.ts`

**Step 1: Create the prompt file**

Move `PROMPT_CHAT_SYSTEM`, `IDEA_SUMMARY_PROMPT`, and `POST_SUMMARY_SYSTEM` from `src/lib/prompt-chat-config.ts` (lines 11-107). Copy verbatim.

```typescript
// src/lib/prompts/prompt-chat.ts

export const PROMPT_CHAT_SYSTEM = `<paste from prompt-chat-config.ts lines 11-58 verbatim>`

export const IDEA_SUMMARY_PROMPT = `<paste from prompt-chat-config.ts lines 60-88 verbatim>`

export const POST_SUMMARY_SYSTEM = `<paste from prompt-chat-config.ts lines 90-107 verbatim>`
```

**Step 2: Commit**

```bash
git add src/lib/prompts/prompt-chat.ts
git commit -m "feat: extract prompt chat prompts to prompts/"
```

---

### Task 7: Create `general-chat.ts`

**Files:**
- Create: `src/lib/prompts/general-chat.ts`

**Step 1: Create the prompt file**

Extract the inline system message from `src/lib/openrouter.ts` lines 272-276. Convert to a template using `buildSecurePrompt`.

```typescript
// src/lib/prompts/general-chat.ts
import { buildSecurePrompt } from "./sanitize"

const GENERAL_CHAT_TEMPLATE = `You are an AI assistant helping users develop their business ideas. The user is working on the following idea: "{{idea}}".

Help them refine their idea, answer questions, and provide insights. Be concise but thorough. Use markdown formatting for better readability. If the user asks about generating analyses, PRDs, tech specs, or app deployments, guide them to use the appropriate tabs in the application.`

export function buildGeneralChatSystemPrompt(idea: string): string {
  return buildSecurePrompt(GENERAL_CHAT_TEMPLATE, { idea })
}
```

**Step 2: Commit**

```bash
git add src/lib/prompts/general-chat.ts
git commit -m "feat: extract general chat prompt to prompts/"
```

---

### Task 8: Create `document-edit.ts`

**Files:**
- Create: `src/lib/prompts/document-edit.ts`

**Step 1: Create the prompt file**

Extract the inline system prompt from `src/app/api/document-edit/route.ts` lines 84-96, and the user message template from lines 100-113.

```typescript
// src/lib/prompts/document-edit.ts
import { buildSecurePrompt } from "./sanitize"

export const DOCUMENT_EDIT_SYSTEM_PROMPT = `You are an expert document editor. The user has selected a portion of text from their document and wants to make a specific edit.

IMPORTANT INSTRUCTIONS:
1. You will receive the FULL document content for context
2. You will receive the SELECTED TEXT that needs editing
3. You will receive the USER'S EDIT REQUEST
4. You must return ONLY the edited version of the selected text
5. Do NOT return the full document - only the edited portion
6. Do NOT add explanations, preambles, or commentary before/after the edit
7. PRESERVE MARKDOWN FORMATTING: If the selected text contains markdown (headers, bold, italic, lists, links, code blocks), keep the same markdown syntax in your edit. The document is markdown-formatted.
8. Only change what was requested in the edit prompt - preserve all other formatting

Your response should contain ONLY the replacement text for the selected portion, maintaining any markdown formatting that was present.`

const DOCUMENT_EDIT_USER_TEMPLATE = `FULL DOCUMENT (for context - this is a markdown document):
---
{{fullContent}}
---

SELECTED TEXT TO EDIT:
---
{{selectedText}}
---

EDIT REQUEST:
{{editPrompt}}

Please provide ONLY the edited version of the selected text. Preserve any markdown formatting (bold, italic, headers, lists, etc.) that was in the original selection.`

export function buildDocumentEditUserPrompt(
  fullContent: string,
  selectedText: string,
  editPrompt: string
): string {
  return buildSecurePrompt(DOCUMENT_EDIT_USER_TEMPLATE, {
    fullContent,
    selectedText,
    editPrompt,
  }, {
    maxLengths: { fullContent: 50000, selectedText: 10000, editPrompt: 2000 },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/prompts/document-edit.ts
git commit -m "feat: extract document edit prompts to prompts/"
```

---

### Task 9: Create `mockups.ts`

**Files:**
- Create: `src/lib/prompts/mockups.ts`

**Step 1: Create the prompt file**

Move the `MOCKUP_PROMPT` function from `src/app/api/mockups/generate/route.ts` (lines 10-169) and `getMockupSystemPrompt` from `src/lib/json-render/catalog.ts` (lines 72-107). The `getMockupSystemPrompt` still needs the catalog import from catalog.ts, so we keep calling it but re-export the combined builder from prompts/.

```typescript
// src/lib/prompts/mockups.ts
import { getMockupSystemPrompt as getCatalogPrompt } from "@/lib/json-render/catalog"

/**
 * Build the full mockup generation prompt.
 * Combines the json-render catalog system prompt with wireframe instructions.
 */
export function buildMockupPrompt(mvpPlan: string, projectName: string): string {
  const fence = "```"
  const catalogPrompt = getCatalogPrompt(projectName)

  return [
    catalogPrompt,
    "",
    "---",
    "",
    `**Product Name:** ${projectName}`,
    "**MVP Plan:**",
    mvpPlan,
    "",
    "## Your Task",
    "",
    "Create WIREFRAME mockups for the key pages from the MVP plan above.",
    "Wireframes focus on LAYOUT and STRUCTURE — not detailed content.",
    "Generate one json-render spec per page/screen.",
    "",
    "## Required Pages",
    "",
    "1. **Homepage** — full-width hero area, feature grid, pricing section, CTA",
    "2. **Key Feature Pages** — main app screens from the MVP plan with realistic layouts",
    "3. **Dashboard** — main logged-in view with stats grid, data table, sidebar (if applicable)",
    "",
    "## Wireframe Design Principles",
    "",
    "CRITICAL: Your wireframes must look like REAL app layouts — not a narrow list of components stacked vertically.",
    "",
    "### Layout Rules",
    "- Every major section (nav, hero, features, footer) must SPAN THE FULL WIDTH of the page",
    "- Use Grid (columns=2 or columns=3) to arrange Cards SIDE BY SIDE — never stack narrow cards vertically when they can go in a grid",
    "- Dashboard pages: use Grid with columns=3 or columns=4 for stat cards, then Grid columns=2 for main content + sidebar",
    "- Navigation: horizontal Stack with logo left, links center, buttons right — spanning full width",
    "- Hero sections: full-width Card containing heading, description, and CTA buttons",
    "- Feature sections: Grid with columns=3 containing feature Cards side by side",
    "- Forms: wrap in a full-width Card, use Grid columns=2 for side-by-side input fields",
    "",
    "### Content Rules",
    "- Use SHORT labels only (1-3 words): 'Sign Up', 'Search', 'Dashboard', 'Save'",
    "- Headings should be brief page/section titles: 'Hero Section', 'Features', 'Pricing'",
    "- Text elements describe WHAT goes there: 'Tagline text', 'Feature description', 'User bio'",
    "- Use Skeleton for images/banners/media placeholders",
    "- Keep forms minimal: input fields with short placeholder labels",
    "- Tables: 3-4 columns with short headers, inside full-width Cards",
    "- Aim for 15-30 elements per page — enough for a realistic layout",
    "- Create 3-5 pages total",
    "",
    "## CRITICAL OUTPUT FORMAT",
    "",
    "Your response MUST follow this exact structure — markdown headers followed by JSON code blocks.",
    "Study this example carefully — note how Grid creates multi-column layouts and Cards fill the width:",
    "",
    "### Homepage",
    "",
    `${fence}json`,
    '{',
    '  "root": "root",',
    '  "elements": {',
    '    "root": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "lg" },',
    '      "children": ["nav", "hero", "features-section", "cta-section"]',
    '    },',
    '    "nav": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "md", "align": "center", "justify": "between" },',
    '      "children": ["logo", "nav-links", "nav-actions"]',
    '    },',
    '    "logo": {',
    '      "type": "Heading",',
    '      "props": { "text": "AppName", "level": "h3" },',
    '      "children": []',
    '    },',
    '    "nav-links": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["link-features", "link-pricing", "link-about"]',
    '    },',
    '    "link-features": { "type": "Button", "props": { "label": "Features", "variant": "ghost" }, "children": [] },',
    '    "link-pricing": { "type": "Button", "props": { "label": "Pricing", "variant": "ghost" }, "children": [] },',
    '    "link-about": { "type": "Button", "props": { "label": "About", "variant": "ghost" }, "children": [] },',
    '    "nav-actions": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["btn-login", "btn-signup"]',
    '    },',
    '    "btn-login": { "type": "Button", "props": { "label": "Log In", "variant": "outline" }, "children": [] },',
    '    "btn-signup": { "type": "Button", "props": { "label": "Sign Up" }, "children": [] },',
    '    "hero": {',
    '      "type": "Card",',
    '      "props": { "title": "Hero Section" },',
    '      "children": ["hero-banner", "hero-text", "hero-buttons"]',
    '    },',
    '    "hero-banner": { "type": "Skeleton", "props": { "height": "200px" }, "children": [] },',
    '    "hero-text": { "type": "Text", "props": { "text": "Tagline and value proposition" }, "children": [] },',
    '    "hero-buttons": {',
    '      "type": "Stack",',
    '      "props": { "direction": "horizontal", "gap": "sm" },',
    '      "children": ["hero-cta", "hero-secondary"]',
    '    },',
    '    "hero-cta": { "type": "Button", "props": { "label": "Get Started" }, "children": [] },',
    '    "hero-secondary": { "type": "Button", "props": { "label": "Learn More", "variant": "outline" }, "children": [] },',
    '    "features-section": {',
    '      "type": "Stack",',
    '      "props": { "direction": "vertical", "gap": "md" },',
    '      "children": ["features-heading", "features-grid"]',
    '    },',
    '    "features-heading": { "type": "Heading", "props": { "text": "Features", "level": "h2" }, "children": [] },',
    '    "features-grid": {',
    '      "type": "Grid",',
    '      "props": { "columns": 3, "gap": "md" },',
    '      "children": ["feat-1", "feat-2", "feat-3"]',
    '    },',
    '    "feat-1": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature One" },',
    '      "children": ["feat-1-desc"]',
    '    },',
    '    "feat-1-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "feat-2": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature Two" },',
    '      "children": ["feat-2-desc"]',
    '    },',
    '    "feat-2-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "feat-3": {',
    '      "type": "Card",',
    '      "props": { "title": "Feature Three" },',
    '      "children": ["feat-3-desc"]',
    '    },',
    '    "feat-3-desc": { "type": "Text", "props": { "text": "Feature description" }, "children": [] },',
    '    "cta-section": {',
    '      "type": "Card",',
    '      "props": { "title": "Ready to start?" },',
    '      "children": ["cta-text", "cta-btn"]',
    '    },',
    '    "cta-text": { "type": "Text", "props": { "text": "Call to action message" }, "children": [] },',
    '    "cta-btn": { "type": "Button", "props": { "label": "Get Started" }, "children": [] }',
    '  }',
    '}',
    fence,
    "",
    "## Rules",
    "",
    "- IMPORTANT: Do NOT use JSON Patch format ({\"op\":\"add\",\"path\":...}) — output complete JSON objects only",
    "- Each JSON block must be a COMPLETE, self-contained json-render spec with `root` and `elements` at the top level",
    "- Every element must have `type`, `props`, and `children` (even if children is empty [])",
    "- Use short descriptive IDs (e.g., 'nav', 'hero', 'sidebar', 'form-section')",
    "- WIREFRAME RULE: Keep ALL text short — labels (1-3 words), descriptions (3-6 words max)",
    "- Use Skeleton for image/media placeholders instead of Image components",
    "- Only use component types from the catalog above",
    "- Use Stack (direction='vertical') as the root element for each page",
    "- LAYOUT RULE: Use Grid (columns=2 or columns=3) to arrange Cards side by side — NEVER stack all Cards vertically",
    "- LAYOUT RULE: Nav bars must use horizontal Stack with justify='between' to span full width",
    "- LAYOUT RULE: Dashboard pages need Grid layouts for stats and content areas — not a vertical list",
    "- Do NOT use advanced features like $state, $bindState, $template, visible conditions, or repeat — keep specs static",
    "- Keep each page spec focused: 15-30 elements for realistic layouts",
  ].join("\n")
}
```

Note: `getMockupSystemPrompt` stays in `catalog.ts` because it depends on the catalog import. The `mockups.ts` prompt file wraps it.

**Step 2: Commit**

```bash
git add src/lib/prompts/mockups.ts
git commit -m "feat: extract mockup prompt builder to prompts/"
```

---

### Task 10: Create `competitor-search.ts`

**Files:**
- Create: `src/lib/prompts/competitor-search.ts`

**Step 1: Create the prompt file**

Move the inline `systemPrompt` and `userPrompt` from `src/lib/perplexity.ts` lines 27-65.

```typescript
// src/lib/prompts/competitor-search.ts
import { buildSecurePrompt } from "./sanitize"

export const COMPETITOR_SEARCH_SYSTEM_PROMPT = `You are a competitive intelligence analyst.
Your task is to identify 3-5 real, currently active competitors for a given business idea.

Prioritize:
- Closest functional match first
- Same target user or customer problem
- Similar core value proposition (not just loosely related tools)

Avoid:
- Generic or broad platforms unless they directly compete
- Tangential or unrelated companies

For each competitor, return:
1. Company name
2. One-line description of what they do
3. Why they are a close competitor
4. Official website URL

If no exact competitors exist, return the nearest adjacent alternatives and clearly state that they are partial matches.

Return your response as a JSON object with this exact structure:
{
  "competitors": [
    {
      "name": "CompanyName",
      "description": "What they do",
      "whyCompetes": "Why they compete with the idea",
      "url": "https://example.com"
    }
  ]
}

Only include real companies. Only return valid JSON with no other text.`

const COMPETITOR_SEARCH_USER_TEMPLATE = `Find 3-5 real competitors for this business idea:
Business Name: {{name}}
Business Idea: {{idea}}

Return the JSON object with competitors as described in your instructions.`

export function buildCompetitorSearchUserPrompt(
  idea: string,
  name: string
): string {
  return buildSecurePrompt(COMPETITOR_SEARCH_USER_TEMPLATE, { idea, name })
}
```

**Step 2: Commit**

```bash
git add src/lib/prompts/competitor-search.ts
git commit -m "feat: extract competitor search prompts to prompts/"
```

---

### Task 11: Create `app-generation.ts`

**Files:**
- Create: `src/lib/prompts/app-generation.ts`

**Step 1: Create the prompt file**

Move `APP_TYPE_PROMPTS` and the prompt builder from `src/app/api/generate-app/route.ts` lines 14-185.

```typescript
// src/lib/prompts/app-generation.ts
import { buildSecurePrompt } from "./sanitize"

export const APP_TYPE_PROMPTS: Readonly<Record<string, string>> = Object.freeze({
  static: "a simple static website using HTML, CSS, and vanilla JavaScript. Include a modern responsive design with a header, hero section, features, and footer.",
  dynamic: "a dynamic website using Next.js with TypeScript and Tailwind CSS. Include API routes, a database-connected feature, and server-side rendering.",
  spa: "a single page application using React with TypeScript, Vite, and Tailwind CSS. Include state management with React Context, client-side routing, and a responsive UI.",
  pwa: "a progressive web app using Next.js with TypeScript. Include a service worker for offline support, a web manifest, and push notification capability.",
})

const APP_GENERATION_TEMPLATE = `Generate {{appTypeDescription}}

**Project Name:** {{name}}
**Business Idea:** {{idea}}
{{context}}

Generate production-ready code. Output each file with its path and content in this format:

--- FILE: path/to/file.ext ---
(file content here)
--- END FILE ---

Include all necessary files (package.json, configuration files, components, pages, styles, etc.). Make the app visually appealing with a dark theme and modern design.`

export function buildAppGenerationPrompt(
  appType: string,
  name: string,
  idea: string,
  context: string
): string {
  const appTypeDescription = APP_TYPE_PROMPTS[appType]
  if (!appTypeDescription) {
    throw new Error(`Unknown app type: ${appType}`)
  }

  return buildSecurePrompt(APP_GENERATION_TEMPLATE, {
    appTypeDescription,
    name,
    idea,
    context,
  }, {
    maxLengths: { context: 10000, idea: 5000 },
  })
}
```

**Step 2: Commit**

```bash
git add src/lib/prompts/app-generation.ts
git commit -m "feat: extract app generation prompts to prompts/"
```

---

### Task 12: Create `legacy-fallback.ts`

**Files:**
- Create: `src/lib/prompts/legacy-fallback.ts`

**Step 1: Create the prompt file**

Move `ANALYSIS_PROMPTS` from `src/lib/openrouter.ts` lines 15-223. Convert from functions to templates using `buildSecurePrompt`.

```typescript
// src/lib/prompts/legacy-fallback.ts
import { buildSecurePrompt } from "./sanitize"

const LEGACY_COMPETITIVE_ANALYSIS_TEMPLATE = `You are an expert business analyst. Perform a comprehensive competitive analysis for the following business idea.

**Business Name:** {{name}}
**Business Idea:** {{idea}}

Please provide a detailed competitive analysis including:

## Market Overview
- Industry landscape and market size
- Growth trends and projections

## Direct Competitors
For each competitor (identify at least 5), provide:
- Company name and overview
- Key products/services
- Market positioning
- Strengths and weaknesses
- Pricing model
- Target audience

## Indirect Competitors
- Alternative solutions users might choose
- Substitute products/services

## Competitive Advantages
- What makes this idea unique
- Potential moats and barriers to entry

## Market Positioning Strategy
- Recommended positioning
- Differentiation opportunities
- Go-to-market strategy

## SWOT Analysis
- Strengths, Weaknesses, Opportunities, Threats

Use markdown formatting with tables where appropriate.`

const LEGACY_GAP_ANALYSIS_TEMPLATE = `You are an expert business strategist. Perform a comprehensive gap analysis for the following business idea.

**Business Name:** {{name}}
**Business Idea:** {{idea}}

Please provide a detailed gap analysis including:

## Current State Assessment
- Existing solutions in the market
- Current customer pain points
- Market maturity level

## Desired State
- Ideal customer experience
- Market opportunity size
- Target outcomes

## Gap Identification
### Product Gaps
- Features missing in current market solutions
- Unmet customer needs

### Technology Gaps
- Technical capabilities needed
- Infrastructure requirements

### Market Gaps
- Underserved customer segments
- Geographic opportunities
- Pricing model gaps

### Operational Gaps
- Process improvements needed
- Resource requirements

## Recommendations
- Priority actions to close gaps
- Quick wins vs long-term initiatives
- Resource allocation suggestions

## Risk Assessment
- Potential challenges in closing gaps
- Mitigation strategies

Use markdown formatting with clear headings and bullet points.`

const LEGACY_PRD_TEMPLATE = `You are an expert product manager. Create a comprehensive Product Requirements Document (PRD) for the following business idea.

**Product Name:** {{name}}
**Product Idea:** {{idea}}

Please create a detailed PRD including:

## Executive Summary
- Product vision and mission
- Problem statement
- Target audience

## Product Overview
- Core value proposition
- High-level product description
- Key differentiators

## User Personas
- Define 3-4 detailed user personas
- Demographics, goals, pain points, behaviors

## User Stories & Requirements
### Must-Have Features (P0)
### Should-Have Features (P1)
### Nice-to-Have Features (P2)

## Feature Specifications
For each key feature:
- Description
- Acceptance criteria
- User flow
- Edge cases

## Success Metrics & KPIs
- Key performance indicators
- Success criteria
- Measurement methodology

## Release Plan
- MVP scope
- Phase 1, 2, 3 features
- Timeline recommendations

## Assumptions & Constraints
- Technical assumptions
- Business constraints
- Dependencies

## Appendix
- Glossary of terms
- References

Use markdown formatting with clear structure.`

const LEGACY_TECH_SPEC_TEMPLATE = `You are a senior software architect. Create a comprehensive Technical Specification document for the following product.

**Product Name:** {{name}}
**Product Idea:** {{idea}}

Please create a detailed Technical Specification including:

## System Architecture
- High-level architecture diagram (described in text)
- Microservices vs monolithic decision
- Key architectural patterns

## Technology Stack
### Frontend
- Framework recommendation with justification
- UI library and design system
- State management approach

### Backend
- Language and framework
- API architecture (REST/GraphQL)
- Authentication & authorization

### Database
- Database type and recommendation
- Schema design (key tables and relationships)
- Data modeling approach

### Infrastructure
- Cloud provider recommendation
- Hosting and deployment strategy
- CI/CD pipeline
- Monitoring and logging

## API Design
- Key endpoints with request/response formats
- Authentication flow
- Rate limiting strategy
- Error handling approach

## Security Considerations
- Authentication mechanism
- Data encryption
- Input validation
- OWASP top 10 considerations

## Scalability Plan
- Horizontal vs vertical scaling strategy
- Caching strategy
- CDN usage
- Database optimization

## Third-Party Integrations
- Payment processing
- Email/notification services
- Analytics
- Other APIs

## Performance Requirements
- Response time targets
- Uptime SLA
- Concurrent user capacity

## Development Guidelines
- Code structure and conventions
- Testing strategy
- Documentation requirements

Use markdown formatting with code snippets where helpful.`

/**
 * Legacy fallback prompts — used by callOpenRouterFallback() for gap-analysis
 * and as fallback for the other document types.
 */
export const LEGACY_ANALYSIS_PROMPTS: Readonly<Record<string, (idea: string, name: string) => string>> = Object.freeze({
  "competitive-analysis": (idea: string, name: string) =>
    buildSecurePrompt(LEGACY_COMPETITIVE_ANALYSIS_TEMPLATE, { idea, name }),

  "gap-analysis": (idea: string, name: string) =>
    buildSecurePrompt(LEGACY_GAP_ANALYSIS_TEMPLATE, { idea, name }),

  "prd": (idea: string, name: string) =>
    buildSecurePrompt(LEGACY_PRD_TEMPLATE, { idea, name }),

  "tech-spec": (idea: string, name: string) =>
    buildSecurePrompt(LEGACY_TECH_SPEC_TEMPLATE, { idea, name }),
})
```

**Step 2: Commit**

```bash
git add src/lib/prompts/legacy-fallback.ts
git commit -m "feat: extract legacy fallback prompts to prompts/"
```

---

### Task 13: Create `index.ts` barrel

**Files:**
- Create: `src/lib/prompts/index.ts`

**Step 1: Create the barrel file**

```typescript
// src/lib/prompts/index.ts

// Security utilities
export { sanitizeInput, buildSecurePrompt } from "./sanitize"

// Document generation prompts
export {
  COMPETITIVE_ANALYSIS_SYSTEM_PROMPT,
  buildCompetitiveAnalysisUserPrompt,
} from "./competitive-analysis"

export { PRD_SYSTEM_PROMPT } from "./prd"
export { MVP_PLAN_SYSTEM_PROMPT } from "./mvp-plan"
export { TECH_SPEC_SYSTEM_PROMPT } from "./tech-spec"

// Chat prompts
export {
  PROMPT_CHAT_SYSTEM,
  IDEA_SUMMARY_PROMPT,
  POST_SUMMARY_SYSTEM,
} from "./prompt-chat"

export { buildGeneralChatSystemPrompt } from "./general-chat"

// Feature-specific prompts
export {
  DOCUMENT_EDIT_SYSTEM_PROMPT,
  buildDocumentEditUserPrompt,
} from "./document-edit"

export { buildMockupPrompt } from "./mockups"

export {
  COMPETITOR_SEARCH_SYSTEM_PROMPT,
  buildCompetitorSearchUserPrompt,
} from "./competitor-search"

export {
  APP_TYPE_PROMPTS,
  buildAppGenerationPrompt,
} from "./app-generation"

export { LEGACY_ANALYSIS_PROMPTS } from "./legacy-fallback"
```

**Step 2: Commit**

```bash
git add src/lib/prompts/index.ts
git commit -m "feat: add barrel re-export for prompts/"
```

---

### Task 14: Migrate `analysis-pipelines.ts`

**Files:**
- Modify: `src/lib/analysis-pipelines.ts`

**Step 1: Update imports and remove prompt definitions**

Replace the 4 inline system prompts and the `buildCompetitiveAnalysisUserPrompt` function with imports from `@/lib/prompts`. Keep the pipeline functions, type definitions, `buildCompetitorContext`, and OpenRouter client as-is.

Changes:
1. Add import at top: `import { COMPETITIVE_ANALYSIS_SYSTEM_PROMPT, buildCompetitiveAnalysisUserPrompt, PRD_SYSTEM_PROMPT, MVP_PLAN_SYSTEM_PROMPT, TECH_SPEC_SYSTEM_PROMPT } from "@/lib/prompts"`
2. Also import `buildSecurePrompt` for the user messages in `runPRD`, `runMVPPlan`, `runTechSpec` that interpolate user input.
3. Delete lines 255-929 (the `buildCompetitiveAnalysisUserPrompt` function and all 4 `const ..._SYSTEM_PROMPT` definitions).
4. Update user message in `runPRD` (line 154) to use `buildSecurePrompt`:
   ```typescript
   content: buildSecurePrompt(
     `Product Idea: {{idea}}\n\nProduct Name: {{name}}{{competitiveContext}}`,
     {
       idea: input.idea,
       name: input.name,
       competitiveContext: competitiveContext,
     },
     { maxLengths: { competitiveContext: 50000 } }
   ),
   ```
5. Same pattern for `runMVPPlan` (line 182) and `runTechSpec` (line 210).

**Step 2: Verify build**

Run: `cd d:/Github/idea2app-root-v2 && npx next build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/analysis-pipelines.ts
git commit -m "refactor: use centralized prompts in analysis-pipelines"
```

---

### Task 15: Migrate `prompt-chat-config.ts`

**Files:**
- Modify: `src/lib/prompt-chat-config.ts`

**Step 1: Replace prompt definitions with re-exports**

Remove the 3 prompt constants (lines 11-107) and replace with re-exports from `@/lib/prompts`. Keep all model-related exports (AVAILABLE_MODELS, DOCUMENT_PRIMARY_MODELS, etc.) unchanged.

```typescript
// At the top, replace prompt definitions:
export {
  PROMPT_CHAT_SYSTEM,
  IDEA_SUMMARY_PROMPT,
  POST_SUMMARY_SYSTEM,
} from "@/lib/prompts"

// Keep everything from AVAILABLE_MODELS onward unchanged
```

**Step 2: Commit**

```bash
git add src/lib/prompt-chat-config.ts
git commit -m "refactor: use centralized prompts in prompt-chat-config"
```

---

### Task 16: Migrate `openrouter.ts`

**Files:**
- Modify: `src/lib/openrouter.ts`

**Step 1: Update to use centralized prompts**

1. Add imports: `import { LEGACY_ANALYSIS_PROMPTS, buildGeneralChatSystemPrompt } from "@/lib/prompts"`
2. Delete the `ANALYSIS_PROMPTS` constant (lines 15-223).
3. In `callOpenRouterFallback` (line 225), change `ANALYSIS_PROMPTS` → `LEGACY_ANALYSIS_PROMPTS`.
4. In `chatCompletion` (line 264), replace the inline system message (lines 272-277) with:
   ```typescript
   const systemMessage = {
     role: "system" as const,
     content: buildGeneralChatSystemPrompt(idea),
   }
   ```

**Step 2: Commit**

```bash
git add src/lib/openrouter.ts
git commit -m "refactor: use centralized prompts in openrouter"
```

---

### Task 17: Migrate `perplexity.ts`

**Files:**
- Modify: `src/lib/perplexity.ts`

**Step 1: Update to use centralized prompts**

1. Add import: `import { COMPETITOR_SEARCH_SYSTEM_PROMPT, buildCompetitorSearchUserPrompt } from "@/lib/prompts"`
2. Delete the inline `systemPrompt` const (lines 27-59).
3. Delete the inline `userPrompt` const (lines 61-65).
4. Update the messages array (lines 69-71) to use the imported constants:
   ```typescript
   messages: [
     { role: "system", content: COMPETITOR_SEARCH_SYSTEM_PROMPT },
     { role: "user", content: buildCompetitorSearchUserPrompt(idea, name) },
   ],
   ```

**Step 2: Commit**

```bash
git add src/lib/perplexity.ts
git commit -m "refactor: use centralized prompts in perplexity"
```

---

### Task 18: Migrate `document-edit/route.ts`

**Files:**
- Modify: `src/app/api/document-edit/route.ts`

**Step 1: Update to use centralized prompts**

1. Add import: `import { DOCUMENT_EDIT_SYSTEM_PROMPT, buildDocumentEditUserPrompt } from "@/lib/prompts"`
2. Replace the inline system message (lines 83-96) with `content: DOCUMENT_EDIT_SYSTEM_PROMPT`
3. Replace the inline user message (lines 99-113) with:
   ```typescript
   {
     role: "user",
     content: buildDocumentEditUserPrompt(fullContent, selectedText, editPrompt),
   },
   ```

**Step 2: Commit**

```bash
git add src/app/api/document-edit/route.ts
git commit -m "refactor: use centralized prompts in document-edit"
```

---

### Task 19: Migrate `mockups/generate/route.ts`

**Files:**
- Modify: `src/app/api/mockups/generate/route.ts`

**Step 1: Update to use centralized prompts**

1. Add import: `import { buildMockupPrompt } from "@/lib/prompts"`
2. Remove the import of `getMockupSystemPrompt` from catalog (line 6).
3. Delete the `MOCKUP_PROMPT` function (lines 10-169).
4. In the OpenRouter call (line 262), change `MOCKUP_PROMPT(mvpPlan, projectName)` → `buildMockupPrompt(mvpPlan, projectName)`.

**Step 2: Commit**

```bash
git add src/app/api/mockups/generate/route.ts
git commit -m "refactor: use centralized prompts in mockups/generate"
```

---

### Task 20: Migrate `generate-app/route.ts`

**Files:**
- Modify: `src/app/api/generate-app/route.ts`

**Step 1: Update to use centralized prompts**

1. Add import: `import { buildAppGenerationPrompt } from "@/lib/prompts"`
2. Delete the `APP_TYPE_PROMPTS` constant (lines 14-19).
3. Replace the prompt building block (lines 173-185) with:
   ```typescript
   const prompt = buildAppGenerationPrompt(appType, name, idea, context)
   ```
4. The `APP_TYPE_CREDITS` stays — it's not a prompt, it's credit configuration.

**Step 2: Commit**

```bash
git add src/app/api/generate-app/route.ts
git commit -m "refactor: use centralized prompts in generate-app"
```

---

### Task 21: Verify full build

**Files:**
- None (verification only)

**Step 1: Run the build**

Run: `cd d:/Github/idea2app-root-v2 && npx next build 2>&1 | tail -30`
Expected: Build succeeds with no type errors

**Step 2: Verify no orphaned prompt references**

Run: `grep -rn "SYSTEM_PROMPT\|ANALYSIS_PROMPTS\|MOCKUP_PROMPT\|APP_TYPE_PROMPTS" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "src/lib/prompts/"`
Expected: Only valid imports from `@/lib/prompts` remain. No inline definitions.

---

### Task 22: Update PROJECT_CONTEXT.md

**Files:**
- Modify: `PROJECT_CONTEXT.md`

**Step 1: Add prompts section**

Add a new section documenting the `src/lib/prompts/` folder, its purpose, the security layer, and the file listing.

**Step 2: Commit**

```bash
git add PROJECT_CONTEXT.md
git commit -m "docs: document centralized prompts folder in PROJECT_CONTEXT"
```
