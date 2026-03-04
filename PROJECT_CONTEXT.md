# PROJECT_CONTEXT.md

**Last Updated**: 2026-03-03 (Centralized System Prompts with Injection Protection)
**Project**: Idea2App - AI-Powered Business Analysis Platform

---

## 1. Project Overview

**Idea2App** is a comprehensive AI-powered SaaS platform that transforms business ideas into reality. It provides an end-to-end solution for entrepreneurs, guiding them from initial concept through to deployment.

### Core Functionality

- **Prompt Tab AI Chat**: Interactive AI conversation in the Prompt tab that asks tailored follow-up questions to refine business ideas. Features:
  - Model selection (Claude, GPT-4, Gemini, Llama, etc.)
  - Context-aware question generation based on idea type (tool, marketplace, service, etc.)
  - Automatic idea summarization after sufficient context gathering
  - Configurable system prompts for customization
  - Persistent conversation history
- **Inline AI Document Editing**: Select any text in generated documents and edit it with AI assistance. Features:
  - Text selection toolbar that appears on highlight
  - Non-intrusive selection capture (only on mouseup, no interference during drag)
  - Conditional component rendering for optimal performance
  - Inline editor with diff preview (shows before/after)
  - Context-aware editing using full document as context
  - 1 credit per edit
  - Supports Competitive Research, PRD, MVP Plan, and Tech Spec documents
- **AI-Powered Chat**: General interactive conversation interface for ongoing project discussions
- **Competitive Analysis**: AI-generated competitive landscape analysis, market positioning, and SWOT analysis
- **Gap Analysis**: Identifies market opportunities and unmet customer needs
- **PRD Generation**: Complete Product Requirements Documents with user personas, features, and release plans
- **MVP Plan Generation**: Strategic development plan for Minimum Viable Product based on PRD
- **Mockup Generation**: ASCII art mockups showing information architecture based on MVP plans (with AI model selection)
- **Technical Specifications**: Architecture design, technology stack recommendations, and API designs
- **App Generation**: Automated code generation for multiple app types:
  - Static websites (HTML/CSS/JS)
  - Dynamic websites (Next.js)
  - Single Page Applications (React SPAs)
  - Progressive Web Apps (PWA)
- **Deployment**: Direct deployment capabilities for generated applications
- **Credit-based Pricing**: Usage-based model with multiple subscription tiers

### User Workflow

1. User creates a project and submits an initial business idea
2. **[NEW]** User is directed to the Prompt tab where AI asks 4-5 tailored follow-up questions
3. User answers questions to clarify missing context (target audience, features, business model, etc.)
4. AI synthesizes responses and generates a comprehensive idea summary
5. User validates/refines the summary through continued conversation
6. User generates various analyses (competitive, PRD, MVP plan, mockups, tech specs)
7. User generates a working prototype/application
8. User deploys the generated application

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.4 | Full-stack React framework with App Router |
| **React** | 19.2.3 | UI library with React Server Components |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | Various | Unstyled, accessible component primitives |
| **lucide-react** | 0.563.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Type-safe component variants |
| **tailwind-merge** | 3.4.0 | Tailwind class merging utility |
| **react-markdown** | 10.1.0 | Markdown rendering |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown support |
| **beautiful-mermaid** | Latest | Beautiful, themeable Mermaid diagram rendering with expansion |
| **react-syntax-highlighter** | 16.1.0 | Code syntax highlighting |
| **marked** | 17.0.1 | Markdown-to-HTML (used for PDF export) |
| **jspdf** | 4.0.0 | Client-side PDF generation |
| **html2canvas** | 1.4.1 | HTML-to-canvas rendering (used for PDF) |
| **Sora** | (Google Font) | Primary sans-serif typeface |
| **IBM Plex Mono** | (Google Font) | Monospace typeface for labels/code |

### Backend & Services

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | - | PostgreSQL database with auth and RLS |
| **@supabase/supabase-js** | 2.91.1 | Supabase client library |
| **@supabase/ssr** | 0.8.0 | Server-side rendering utilities |
| **Anthropic Claude** | 0.71.2 | AI SDK for app generation |
| **OpenRouter** | 6.16.0 | API wrapper for AI analysis |
| **Stripe** | 20.2.0 | Payment processing and subscriptions |
| **Perplexity** | - | AI-powered competitor search (sonar-pro model, OpenAI-compatible API) |
| **Tavily** | - | Web content extraction from competitor URLs |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9 | Code linting |
| **eslint-config-next** | 16.1.4 | Next.js ESLint configuration |
| **@types/node** | ^20 | Node.js type definitions |
| **@types/react** | ^19 | React type definitions |
| **@types/react-dom** | ^19 | React DOM type definitions |

### Build & Runtime

- **Build Tool**: Next.js built-in (Webpack)
- **Dev Server**: Next.js dev server with HMR
- **Package Manager**: npm
- **Runtime**: Node.js (Latest LTS)

---

## 3. Architecture

### High-Level Design Pattern

**Server Components + Client Components (React Server Components Pattern)**

```
┌─────────────────────────────────────┐
│    Client Layer (Browser)           │
│  - React Client Components          │
│  - Supabase Client SDK              │
│  - State management (React hooks)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Next.js Server Layer              │
│  - API Routes (/api/*)              │
│  - Server Components (RSC)          │
│  - Middleware (auth protection)     │
│  - Server Actions                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Backend Services                 │
│  - Supabase Auth & Database         │
│  - Anthropic Claude API             │
│  - OpenRouter API                   │
│  - Stripe API                       │
│  - Perplexity API (competitor search)│
│  - Tavily API (URL extraction)      │
└─────────────────────────────────────┘
```

### Data Flow

1. **Authentication Flow**:
   - User logs in via Supabase Auth
   - JWT stored in HTTP-only cookie
   - Middleware validates auth on every request
   - Protected routes redirect unauthorized users

2. **Chat Flow**:
   - Client component sends message to `/api/chat`
   - Server validates auth, checks credits
   - Server calls OpenRouter/Anthropic AI
   - Server saves message to database
   - Response streamed back to client

3. **Analysis Flow**:
   - Client requests analysis (competitive, PRD, MVP plan, or tech spec) from the workspace `ContentEditor`
   - Server checks credits, deducts if available
   - Routes to the appropriate in-house pipeline (`src/lib/analysis-pipelines.ts`):
     - **Competitive Analysis**: 3-step pipeline — Perplexity (sonar-pro) finds competitors → Tavily extracts URL content → OpenRouter synthesizes final report. Graceful degradation if Perplexity/Tavily fail.
     - **PRD**: OpenRouter LLM call with detailed system prompt, receives `competitiveAnalysis` as context
     - **MVP Plan**: OpenRouter LLM call with detailed system prompt, receives `prd` as context
     - **Tech Spec**: OpenRouter LLM call with detailed system prompt, receives `prd` as context
   - Result saved to the appropriate table (`analyses`, `prds`, `mvp_plans`, or `tech_specs`)
   - Page reloads to surface the new version

4. **App Generation Flow**:
   - Client requests app generation
   - Server validates credits (5 credits required)
   - Server calls Anthropic Claude with project context
   - Claude generates complete app code
   - Server saves deployment record
   - Returns generated code to client

### Workspace Layout (Three-Column)

The project workspace (`/projects/[id]`) uses a three-column layout inspired by Pencil:

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│ ProjectSide- │  DocumentNav      │  ContentEditor               │
│ bar          │  (pipeline steps) │  (active document view)      │
│              │                   │                              │
│ - Project    │  1. Prompt        │  - Header (title, actions)   │
│   list       │  2. Competitive   │  - Version navigation        │
│ - Search     │     Research      │  - Editable prompt / MD view │
│ - New Proj   │  3. PRD           │  - Generate button           │
│ - User info  │  4. MVP Plan      │  - Copy / PDF download       │
│              │  5. Mockups       │                              │
│   (dark bg)  │  6. Tech Spec     │                              │
│              │  7. Deploy        │   (light bg)                 │
└──────────────┴───────────────────┴──────────────────────────────┘
  260px fixed    280px fixed         flex-1 (remaining)
```

- **`ProjectSidebar`** — persistent app-level navigation; lists all user projects, search, sign-out. Dark background (`#000`), rendered server-side and passed to client.
- **`DocumentNav`** — pipeline-step navigation within a single project. Shows status badges (Done / In Progress / Pending) for each document stage.
- **`ContentEditor`** — renders the active document. Handles editing the prompt, triggering generation, displaying rendered Markdown, version switching, copy-to-clipboard, and PDF export.
- **`ProjectWorkspace`** — orchestrator component that connects all three columns. Manages active document state, version selection, and dispatches API calls.

### Key Design Patterns

1. **App Router with Route Groups**: Organized routes with shared layouts using `(group-name)` syntax
2. **Server Components by Default**: Pages default to server components; interactive components explicitly marked `"use client"`
3. **Middleware-based Auth**: Global authentication protection at the middleware level
4. **Credit System with Database Functions**: PostgreSQL stored procedures for atomic credit operations
5. **In-House Analysis Pipelines**: Competitive analysis uses a 3-step pipeline (Perplexity → Tavily → OpenRouter); PRD/MVP/Tech Spec use direct OpenRouter calls with detailed prompts
6. **TypeScript-First**: Strict typing throughout, auto-generated database types
7. **Component Composition**: Radix UI primitives + CVA for variants
8. **Optimistic UI Updates**: Immediate feedback with graceful error handling
9. **Path Aliases**: Clean imports using `@/*` aliases
10. **Pencil Design System**: Light-mode UI with dark sidebar; CSS custom properties for theming; Sora + IBM Plex Mono typography
11. **Non-Intrusive Selection Handling**: Text selection captured only on `mouseup` with `requestAnimationFrame` to ensure browser finalizes selection first, preventing interference during drag operations

### Inline Editing Technical Implementation

The inline AI editing feature in `MarkdownRenderer` uses a sophisticated approach to avoid interfering with native browser text selection:

**Selection Capture Strategy**:
- Uses `mouseup` event listener instead of continuous `selectionchange` tracking
- Wraps selection capture in `requestAnimationFrame` to ensure browser has finalized the selection
- No state updates during the drag operation, preventing React re-renders that could interrupt selection

**Conditional Component Rendering**:
- When there's **no pending edit** (normal viewing), ReactMarkdown uses minimal custom components (only `code` for syntax highlighting)
- This matches how PromptChatInterface renders and allows normal browser text selection
- When there **is a pending edit** (showing diff), all custom component renderers (p, li, h1, h2, etc.) are added to process the diff marker
- Components are memoized with `useMemo` to prevent unnecessary re-renders

**Result**: Users can select text across multiple elements (like list items) without any JavaScript interference, exactly like selecting text in the Prompt editor tab.

### Mermaid Diagram Expansion Feature

The `MarkdownRenderer` component includes an interactive Mermaid diagram viewer with expansion capabilities:

**Compact View**:
- Diagrams fit within the document width using `w-full overflow-hidden` (no horizontal scrolling)
- Expand button appears in the bottom-right corner on hover (`opacity-0 group-hover:opacity-100`)
- Uses lucide-react `Maximize2` icon

**Expanded Modal View**:
- Triggered by clicking the expand button
- Full-screen modal with `calc(100vw-4rem)` × `calc(100vh-4rem)` sizing (2rem margins on all sides)
- Dark backdrop with blur (`bg-black/50 backdrop-blur-sm`)
- Close button (top-right) with `Minimize2` icon
- Click outside or press `Escape` to close
- Body scroll prevention when modal is open
- Larger font size (20px vs 14px) for better readability

**Styling Implementation**:
- Both compact and expanded views use the same `mermaid-diagram` CSS class
- Theme-appropriate colors defined in `globals.css` (lines 248-351)
- Light mode: dark text (`#111827`), white entity boxes
- Dark mode: light text (`#e5e5e5`), dark entity boxes
- Uses `@media (prefers-color-scheme: dark)` for automatic theme detection
- Important: CSS rules target `.mermaid-diagram` class specifically, so both views must use this class name

**Technical Details**:
- SVG rendered once by `beautiful-mermaid` and reused for both views
- Theme detection uses `window.matchMedia('(prefers-color-scheme: dark)')`
- React state (`isExpanded`) controls modal visibility
- Event listeners for keyboard (`Escape`) and click-outside handled with proper cleanup

---

## 4. Key Directories

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (no layout)
│   │   ├── login/page.tsx        # Login page
│   │   ├── signup/page.tsx       # Signup page
│   │   └── callback/route.ts     # OAuth callback handler
│   ├── (dashboard)/              # Dashboard route group (shared layout)
│   │   ├── layout.tsx            # ProjectSidebar + main content layout
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── projects/
│   │   │   ├── page.tsx          # Projects list
│   │   │   ├── new/page.tsx      # Create project
│   │   │   └── [id]/page.tsx     # Project workspace (main app)
│   │   ├── billing/page.tsx      # Billing & subscription plans
│   │   └── settings/page.tsx     # User settings
│   ├── api/                      # API routes
│   │   ├── chat/route.ts         # POST chat messages (general chat)
│   │   ├── prompt-chat/route.ts  # GET/POST Prompt tab AI chat with follow-up questions
│   │   ├── document-edit/route.ts     # POST inline AI document editing
│   │   ├── analysis/[type]/route.ts   # POST run analysis (in-house pipelines)
│   │   ├── analyses/[id]/route.ts     # PATCH update analysis content
│   │   ├── prds/[id]/route.ts         # PATCH update PRD content
│   │   ├── mvp-plans/[id]/route.ts    # PATCH update MVP plan content
│   │   ├── tech-specs/[id]/route.ts   # PATCH update tech spec content
│   │   ├── generate-app/route.ts      # POST generate app code
│   │   ├── projects/[id]/route.ts     # PATCH/GET project details
│   │   └── stripe/
│   │       ├── checkout/route.ts      # Create checkout session
│   │       ├── portal/route.ts        # Customer portal
│   │       └── webhook/route.ts       # Stripe webhooks
│   ├── globals.css               # Global styles + Tailwind
│   ├── page.tsx                  # Landing page
│   └── layout.tsx                # Root layout (fonts, metadata)
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives
│   │   ├── button.tsx            # Button with variants
│   │   ├── card.tsx              # Card layouts
│   │   ├── input.tsx, textarea.tsx, label.tsx
│   │   ├── badge.tsx, avatar.tsx, spinner.tsx
│   │   ├── dropdown-menu.tsx, tabs.tsx  # Radix UI
│   │   ├── markdown-renderer.tsx # Markdown with Mermaid + syntax highlighting + inline AI editing
│   │   ├── inline-ai-editor.tsx  # Inline AI editing popup component
│   │   ├── selection-toolbar.tsx # Text selection toolbar ("Edit with AI" button)
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx           # Legacy dashboard sidebar (retained)
│   │   ├── header.tsx            # Legacy dashboard header (retained)
│   │   ├── project-sidebar.tsx   # App-level project list sidebar (dark theme)
│   │   ├── document-nav.tsx      # Pipeline-step navigation within a project
│   │   └── content-editor.tsx    # Active document view (edit/generate/export)
│   ├── workspace/                # Workspace orchestration
│   │   └── project-workspace.tsx # Three-column layout orchestrator
│   ├── chat/                     # Chat feature
│   │   ├── chat-interface.tsx    # General chat UI
│   │   └── prompt-chat-interface.tsx  # Prompt tab AI chat with model selection
│   └── analysis/                 # Analysis feature
│       └── analysis-panel.tsx    # Analysis/PRD/TechSpec UI
│
├── lib/                          # Utilities & services
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server-side client
│   │   └── middleware.ts         # Auth middleware logic
│   ├── stripe.ts                 # Stripe singleton
│   ├── openrouter.ts             # OpenRouter AI API (chat, gap-analysis fallback)
│   ├── analysis-pipelines.ts     # In-house analysis orchestration (competitive, PRD, MVP, tech spec)
│   ├── perplexity.ts             # Perplexity API client (competitor search)
│   ├── tavily.ts                 # Tavily API client (URL content extraction)
│   ├── pdf-utils.ts              # PDF export: renders Markdown → HTML → canvas → jsPDF
│   ├── prompt-chat-config.ts     # System prompts and AI models for Prompt chat
│   └── utils.ts                  # Utility functions & CREDIT_COSTS
│
├── types/                        # TypeScript types
│   └── database.ts               # Supabase DB types (auto-generated)
│
├── hooks/                        # React hooks (empty currently)
│
└── middleware.ts                 # Auth middleware (root level)
```

### Directory Purpose Map

| Directory | Purpose | When to Add/Modify |
|-----------|---------|-------------------|
| `app/(auth)/` | Authentication pages | Adding new auth methods or flows |
| `app/(dashboard)/` | Protected app pages | Adding new dashboard features |
| `app/api/` | Backend API endpoints | Creating new API functionality |
| `components/ui/` | Reusable UI components | Adding new UI primitives |
| `components/layout/` | Layout & navigation components | Modifying sidebar, document nav, or content editor |
| `components/workspace/` | Workspace orchestration | Changing the project workspace flow or column layout |
| `components/chat/` | Chat feature components | Enhancing chat functionality |
| `components/analysis/` | Analysis feature components | Adding analysis features |
| `lib/` | Business logic & external APIs | Integrating new services |
| `lib/prompts/` | **All AI system prompts** — one file per document type | Editing any AI prompt or adding new document generation features |
| `lib/supabase/` | Database & auth logic | Database operations |
| `lib/pdf-utils.ts` | PDF export logic | Changing PDF styling or export behaviour |
| `types/` | TypeScript definitions | Adding new type definitions |

---

## 4a. Prompt Architecture (`src/lib/prompts/`)

All AI system prompts live in `src/lib/prompts/`. Import everything through the barrel: `import { ... } from "@/lib/prompts"`.

### File Map

| File | Contents | Used By |
|------|----------|---------|
| `sanitize.ts` | `sanitizeInput()`, `buildSecurePrompt()` | All prompt builders |
| `competitive-analysis.ts` | `COMPETITIVE_ANALYSIS_SYSTEM_PROMPT`, `buildCompetitiveAnalysisUserPrompt()` | `analysis-pipelines.ts` |
| `prd.ts` | `PRD_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| `mvp-plan.ts` | `MVP_PLAN_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| `tech-spec.ts` | `TECH_SPEC_SYSTEM_PROMPT` | `analysis-pipelines.ts` |
| `prompt-chat.ts` | `PROMPT_CHAT_SYSTEM`, `IDEA_SUMMARY_PROMPT`, `POST_SUMMARY_SYSTEM` | `prompt-chat-config.ts`, `api/prompt-chat/` |
| `general-chat.ts` | `buildGeneralChatSystemPrompt()` | `openrouter.ts` |
| `document-edit.ts` | `DOCUMENT_EDIT_SYSTEM_PROMPT`, `buildDocumentEditUserPrompt()` | `api/document-edit/` |
| `mockups.ts` | `buildMockupPrompt()` | `api/mockups/generate/` |
| `competitor-search.ts` | `COMPETITOR_SEARCH_SYSTEM_PROMPT`, `buildCompetitorSearchUserPrompt()` | `perplexity.ts` |
| `app-generation.ts` | `APP_TYPE_PROMPTS`, `buildAppGenerationPrompt()` | `api/generate-app/` |
| `legacy-fallback.ts` | `LEGACY_ANALYSIS_PROMPTS` | `openrouter.ts` (gap-analysis fallback) |
| `index.ts` | Barrel re-export of all above | Everything |

### Security Rules

- **Never** interpolate user values directly into prompt strings (`${variable}`).
- **Always** use `buildSecurePrompt(template, { key: userValue })` — it strips injection patterns and wraps values in `<user_input name="key">` XML delimiters.
- `sanitizeInput()` is called automatically by `buildSecurePrompt`, but can also be called directly for non-template cases (e.g., `mockups.ts`).

---

## 5. Coding Conventions

### File Naming

- **Pages**: `page.tsx` (Next.js convention)
- **Dynamic Routes**: `[id]/page.tsx`, `[type]/route.ts`
- **API Routes**: `route.ts` in endpoint folder
- **Components**: `kebab-case.tsx` (e.g., `chat-interface.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `openrouter.ts`)
- **Types**: `database.ts`, lowercase

### Code Naming

```typescript
// Components: PascalCase
export function ChatInterface() {}
export default function LoginPage() {}

// Variables & functions: camelCase
const projectId = "..."
const [loading, setLoading] = useState(false)
async function handleSubmit() {}

// Constants: UPPER_SNAKE_CASE
const CREDIT_COSTS = { ... }
const ANALYSIS_PROMPTS = { ... }

// Props interfaces: {ComponentName}Props
interface ChatInterfaceProps { ... }
interface AnalysisPanelProps { ... }

// Type aliases: PascalCase or lowercase
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'
```

### Component Structure

#### UI Components (with CVA variants)
```typescript
// Pattern: components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: { default: "...", outline: "..." },
      size: { default: "...", sm: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
```

#### Client Components (Interactive)
```typescript
"use client"

import { useState } from "react"

interface Props {
  projectId: string
}

export function ChatInterface({ projectId }: Props) {
  const [state, setState] = useState()

  const handleAction = async () => {
    // Logic here
  }

  return <div>{/* JSX */}</div>
}
```

#### Server Components (Data Fetching)
```typescript
// No "use client" directive

import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  // Fetch data at server level
  const { data } = await supabase.from("table").select()

  return <ClientComponent data={data} />
}
```

#### API Routes
```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request
    const body = await request.json()

    // Validation
    if (!body.field) {
      return NextResponse.json({ error: "Missing field" }, { status: 400 })
    }

    // Business logic
    const result = await doSomething()

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

### Styling Conventions

#### Tailwind Utility Classes
```typescript
// Use cn() utility for class merging
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className  // Allow className override
)} />
```

#### Color Palette (Pencil Design System)

The app uses CSS custom properties (defined in `globals.css`) rather than hard-coded Tailwind colours. Use the semantic tokens below:

```typescript
// Primary action colour
"bg-primary"                    // #DC2626 (red)
"text-primary-foreground"       // #FFFFFF

// Backgrounds & surfaces
"bg-background"                 // #FAFAFA (main page)
"bg-card"                       // #FFFFFF (content cards)
"bg-secondary"                  // #F5F5F5 (inputs, sub-surfaces)

// Sidebar (dark theme — always use sidebar-* tokens)
"bg-sidebar-bg"                 // #000000
"text-sidebar-foreground"       // #FAFAFA
"text-sidebar-muted"            // #999999
"border-sidebar-border"         // #222222

// Status badges
"text-success / bg-success-bg"  // Green (#22C55E / #ECFDF5) — Done
"text-info / bg-info-bg"        // Blue  (#3B82F6 / #EFF6FF) — In Progress

// Markdown renderer (dark-themed prose, used inside content cards)
// Still uses hard-coded colours for code/Mermaid blocks:
"#00d4ff"  // Cyan — code highlights, links, Mermaid primary
"#7c3aed"  // Purple — Mermaid secondary
```

### Error Handling

#### API Error Responses
```typescript
// Status codes
401 - Unauthorized (not logged in)
402 - Payment Required (insufficient credits)
404 - Not Found
400 - Bad Request (validation error)
500 - Internal Server Error

// Response format
{ error: "User-friendly error message" }
```

#### Frontend Error Handling
```typescript
try {
  const response = await fetch("/api/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Request failed")
  }

  // Handle success
} catch (err) {
  setError(err instanceof Error ? err.message : "An error occurred")
}
```

### TypeScript Patterns

```typescript
// Explicit prop types
interface ComponentProps {
  projectId: string
  onComplete?: () => void
}

// Type unions for specific values
type AnalysisType = 'competitive-analysis' | 'prd' | 'mvp-plan' | 'tech-spec'
type DocumentType = 'prompt' | 'competitive' | 'prd' | 'mvp' | 'mockups' | 'techspec' | 'deploy'

// Const assertions for immutable objects
const COSTS = {
  chat: 1,
  analysis: 5,
} as const

// Generic utility types
type Nullable<T> = T | null
```

### Path Aliases

```typescript
// tsconfig.json paths
"@/*": ["./src/*"]

// Usage
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"
```

---

## 6. Setup & Build

### Prerequisites

- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Supabase Account**: For database and auth
- **Stripe Account**: For payments (optional for dev)
- **API Keys**: Anthropic, OpenRouter

### Environment Variables

Create `.env.local` in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# AI Models
OPENROUTER_API_KEY=sk-or-xxx...
OPENROUTER_CHAT_MODEL=anthropic/claude-sonnet-4
OPENROUTER_ANALYSIS_MODEL=anthropic/claude-sonnet-4
ANTHROPIC_API_KEY=sk-ant-xxx...

# Stripe
STRIPE_SECRET_KEY=sk_secret_xxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# Perplexity (competitor research in competitive analysis)
PERPLEXITY_API_KEY=pplx-xxx...

# Tavily (URL content extraction in competitive analysis)
TAVILY_API_KEY=tvly-xxx...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd idea2app-root-v2

# Install dependencies
npm install
```

### Database Setup (Supabase)

1. Create a new Supabase project
2. Run SQL migrations to create tables:
   - `profiles` - User profiles with credit balance
   - `projects` - Business idea projects
   - `messages` - Chat message history
   - `analyses` - Competitive and gap analyses
   - `prds` - Product requirement documents
   - `mvp_plans` - MVP development plans
   - `tech_specs` - Technical specifications
   - `deployments` - Generated app deployments
   - `credits` - Credit balance tracking
   - `credits_history` - Credit transaction log
   - `plans` - Subscription plans
   - `subscriptions` - User subscriptions

3. Enable Row Level Security (RLS) on all tables
4. Create PostgreSQL stored functions:
   - `consume_credits(user_id, amount, action, description)`
   - `add_credits(user_id, amount, action, description)`
   - `get_credit_balance(user_id)`

5. Configure authentication:
   - Enable email/password auth
   - Add redirect URLs (e.g., `http://localhost:3000/callback`)
   - Configure OAuth providers (optional)

### Development

```bash
# Start development server
npm run dev

# Server runs at http://localhost:3000
# Hot module reload enabled
```

### Build & Production

```bash
# Build for production
npm run build

# Output in .next/ directory

# Start production server
npm start

# Runs at http://localhost:3000
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Testing (Not configured yet)

```bash
# Add test framework when needed
# Recommended: Jest + React Testing Library
```

### Deployment

**Recommended: Vercel**
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy automatically on push

**Alternative: Docker**
```bash
# Build Docker image
docker build -t idea2app .

# Run container
docker run -p 3000:3000 idea2app
```

### Scripts Reference

```json
{
  "dev": "next dev",           // Development server
  "build": "next build",       // Production build
  "start": "next start",       // Production server
  "lint": "eslint"             // Run linting
}
```

---

## 7. Database Schema Overview

### Core Tables

- **profiles**: User profiles, linked to Supabase Auth
  - Fields: `id`, `email`, `full_name`, `credits`, `plan_id`, `created_at`
  - RLS: Users can only read/update their own profile

- **projects**: Business idea projects
  - Fields: `id`, `user_id`, `name`, `description`, `status`, `created_at`
  - RLS: Users can only access their own projects

- **messages**: Chat message history (general chat)
  - Fields: `id`, `project_id`, `role` (user/assistant), `content`, `created_at`
  - RLS: Users can only access messages from their projects

- **prompt_chat_messages**: Prompt tab AI chat messages (NEW)
  - Fields: `id`, `project_id`, `role` (user/assistant/system), `content`, `metadata` (model, stage), `created_at`, `updated_at`
  - RLS: Users can only access messages from their projects
  - Purpose: Stores conversation for idea refinement with follow-up questions

- **analyses**: Competitive and gap analyses
  - Fields: `id`, `project_id`, `type`, `content`, `created_at`
  - RLS: Users can only access analyses from their projects

- **prds**: Product requirement documents
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access PRDs from their projects

- **mvp_plans**: MVP (Minimum Viable Product) development plans
  - Fields: `id`, `project_id`, `content`, `version`, `created_at`, `updated_at`
  - RLS: Users can only access MVP plans from their projects

- **tech_specs**: Technical specifications
  - Fields: `id`, `project_id`, `content`, `created_at`
  - RLS: Users can only access tech specs from their projects

- **deployments**: Generated applications
  - Fields: `id`, `project_id`, `app_type`, `code`, `url`, `created_at`
  - RLS: Users can only access deployments from their projects

- **credits_history**: Credit transaction log
  - Fields: `id`, `user_id`, `amount`, `balance_after`, `action`, `description`, `created_at`
  - RLS: Users can only view their own credit history

- **subscriptions**: User subscriptions
  - Fields: `id`, `user_id`, `plan_id`, `stripe_subscription_id`, `status`, `current_period_end`
  - RLS: Users can only view their own subscription

---

## 8. API Endpoints Overview

### Authentication
- **Auth flow**: Handled by Supabase (email/password, OAuth)
- **Callback**: `GET /callback` - OAuth callback handler

### Chat
- **POST /api/chat**: Send chat message, get AI response (general chat)
  - Body: `{ projectId, message }`
  - Returns: `{ id, content, role, created_at }`
  - Cost: 1 credit

- **GET /api/prompt-chat**: Get Prompt tab chat history (NEW)
  - Query: `?projectId=xxx`
  - Returns: `{ messages, stage }`
  - Used to load conversation history

- **POST /api/prompt-chat**: Send Prompt chat message with AI refinement (NEW)
  - Body: `{ projectId, message, model, isInitial }`
  - Returns: `{ messages, stage, summary? }`
  - Features: Model selection, follow-up questions, auto-summarization
  - Cost: 1 credit per message

- **POST /api/document-edit**: Inline AI document editing (NEW)
  - Body: `{ projectId, fullContent, selectedText, editPrompt }`
  - Returns: `{ suggestedEdit, creditsUsed }`
  - Uses OpenRouter API to generate context-aware edits
  - Cost: 1 credit per edit

### Projects
- **GET /api/projects/[id]**: Get project details
  - Returns: project row (owner-scoped via RLS)

- **PATCH /api/projects/[id]**: Update project fields
  - Body: `{ description?, name?, status? }` (any subset)
  - Returns: updated project row
  - Used by the workspace prompt editor to persist description changes

### Analysis
- **POST /api/analysis/[type]**: Generate analysis
  - Types: `competitive-analysis`, `prd`, `mvp-plan`, `tech-spec`
  - Body: `{ projectId, idea, name, competitiveAnalysis?, prd?, model? }`
    - `competitiveAnalysis` passed to PRD pipeline as context
    - `prd` passed to MVP plan and tech spec pipelines as context
  - Returns: `{ content, source, model, type }`
  - Cost: 5 credits (`competitive-analysis`) / 10 credits (`prd`, `mvp-plan`, `tech-spec`)
  - Route `maxDuration`: 300s
  - Uses in-house pipelines (`src/lib/analysis-pipelines.ts`):
    - Competitive: Perplexity → Tavily → OpenRouter synthesis (graceful degradation)
    - PRD/MVP/Tech Spec: Direct OpenRouter calls with detailed system prompts

- **POST /api/mockups/generate**: Generate ASCII art mockups (NEW)
  - Body: `{ projectId, mvpPlan, projectName, model? }`
    - `model` is optional; defaults to `OPENROUTER_ANALYSIS_MODEL` if not provided
  - Returns: `{ content, model, source }`
  - Cost: 15 credits
  - Uses OpenRouter directly (not N8N)
  - Route `maxDuration`: 300s (AI generation can be slow)
  - Generates ASCII art diagrams showing site map, page layouts, and user flows

- **PATCH /api/analyses/[id]**: Update analysis content
  - Body: `{ content }`
  - Returns: `{ data: updated_analysis }`
  - Used by inline document editing

- **PATCH /api/prds/[id]**: Update PRD content
  - Body: `{ content }`
  - Returns: `{ data: updated_prd }`
  - Used by inline document editing

- **PATCH /api/mvp-plans/[id]**: Update MVP plan content
  - Body: `{ content }`
  - Returns: `{ data: updated_mvp_plan }`
  - Used by inline document editing

- **PATCH /api/mockups/[id]**: Update mockup content (NEW)
  - Body: `{ content }`
  - Returns: `{ data: updated_mockup }`
  - Used by inline document editing

- **PATCH /api/tech-specs/[id]**: Update tech spec content
  - Body: `{ content }`
  - Returns: `{ data: updated_tech_spec }`
  - Used by inline document editing

### App Generation
- **POST /api/generate-app**: Generate application code
  - Body: `{ projectId, appType }`
  - Types: `static`, `dynamic`, `spa`, `pwa`
  - Returns: `{ id, code, url, created_at }`
  - Cost: 5 credits

### Stripe
- **POST /api/stripe/checkout**: Create checkout session
  - Body: `{ priceId, planId }`
  - Returns: `{ url }` (Stripe-hosted checkout page URL)
  - Creates or reuses Stripe customer (linked via `profiles.stripe_customer_id`)
  - Sets `mode: "subscription"` for recurring billing
  - Passes `supabase_user_id` and `plan_id` in session metadata

- **POST /api/stripe/portal**: Access customer portal
  - Returns: `{ url }` (Stripe billing portal URL)
  - Requires existing `stripe_customer_id` on the user's profile

- **POST /api/stripe/webhook**: Handle Stripe events
  - Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
  - Uses Supabase service role client (no user context) for database operations
  - Handled events:
    - `checkout.session.completed` — creates subscription record, adds credits via `add_credits()` RPC
    - `customer.subscription.updated` — syncs status, cancel_at_period_end, period_end
    - `customer.subscription.deleted` — marks subscription as canceled
    - `invoice.paid` (billing_reason = `subscription_cycle`) — monthly credit renewal via `add_credits()` RPC

---

## 9. Credit System

### Credit Costs

| Action | Cost |
|--------|------|
| Chat message (general) | 1 credit |
| Prompt chat message (idea refinement) | 1 credit |
| Inline document edit | 1 credit |
| Competitive Analysis | 5 credits |
| PRD Generation | 10 credits |
| MVP Plan Generation | 10 credits |
| Mockup Generation | 15 credits |
| Tech Spec Generation | 10 credits |
| App Generation (Deploy) | 5 credits |

### Credit Management

- **Consumption**: Atomic operation via `consume_credits()` stored procedure
- **Addition**: Via `add_credits()` (subscription refill, purchases)
- **Balance Check**: Real-time via `get_credit_balance()`
- **History**: All transactions logged in `credits_history`

### Subscription Plans

| Plan | Credits/Month | Price | Stripe Product ID | Stripe Price ID |
|------|--------------|-------|-------------------|-----------------|
| **Free** | 10 | $0 | — | — |
| **Starter** | 100 | $19/mo | `prod_U2GDQiAqtdQzYd` | `price_1T4BgvHkipUdBg5jpUOWPEnt` |
| **Pro** | 500 | $49/mo | `prod_U2GDpeJ8JHRfOo` | `price_1T4BhIHkipUdBg5jzuXgvaVt` |
| **Enterprise** | 2,500 | $199/mo | `prod_U2GElh8VRq2AGg` | `price_1T4BhZHkipUdBg5jumSZzNmy` |

### Stripe Integration Details

- **Account**: Nazare Sandbox (`acct_1SqyskHkipUdBg5j`) — Test Mode
- **API Version**: `2026-01-28.clover`
- **Singleton Client**: `src/lib/stripe.ts` — lazy-initialized Stripe instance via `getStripeClient()` with a `Proxy` export for ergonomic access
- **Customer Linking**: Stripe customer ID stored in `profiles.stripe_customer_id`; created on first checkout and reused thereafter
- **Checkout Flow**: Server-side redirect to Stripe-hosted checkout (no Stripe.js Elements needed)
- **Webhook Processing**: Uses `SUPABASE_SERVICE_ROLE_KEY` (service role) to bypass RLS for subscription and credit updates
- **Billing UI**: `src/app/(dashboard)/billing/page.tsx` — displays plan cards, current subscription, credit balance, and credit cost reference

---

## 10. Common Development Tasks

### Adding a New Page

```bash
# 1. Create page file
src/app/(dashboard)/new-page/page.tsx

# 2. Add to navigation (if needed)
src/components/layout/project-sidebar.tsx
```

### Adding a New API Endpoint

```bash
# 1. Create route file
src/app/api/new-endpoint/route.ts

# 2. Implement POST/GET/PUT/DELETE handlers
export async function POST(request: Request) { ... }
```

### Adding a New UI Component

```bash
# 1. Create component file
src/components/ui/new-component.tsx

# 2. Use CVA pattern for variants
const variants = cva("base", { variants: { ... } })

# 3. Export forwardRef component
```

### Adding a New Database Table

```bash
# 1. Create migration in Supabase
# 2. Add RLS policies
# 3. Update database types
npx supabase gen types typescript --project-id <id> > src/types/database.ts

# 4. Access in code
const { data } = await supabase.from("new_table").select()
```

### Modifying Credit Costs

```typescript
// Edit: src/lib/utils.ts
export const CREDIT_COSTS = {
  'chat': 1,
  'competitive-analysis': 5,
  // Update values here
}
```

---

## 11. Troubleshooting

### Common Issues

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`
- Clear `.next/` folder and rebuild

**Auth Issues**
- Verify environment variables are set correctly
- Check Supabase redirect URLs in project settings
- Ensure RLS policies allow access

**API Errors**
- Check API key validity (OpenRouter, Anthropic, Stripe)
- Verify database connection (Supabase URL/key)
- Check server logs for detailed error messages

**Credit System Issues**
- Verify `consume_credits()` function exists in database
- Check credit balance in `profiles` table
- Review `credits_history` for transaction log

**Analysis Pipeline Issues**
- Competitive analysis uses a 3-step pipeline: if Perplexity or Tavily fail, the pipeline degrades gracefully (logs warnings, continues with available data)
- Check server logs for `[CompetitiveAnalysis]` prefixed messages to trace pipeline step failures
- Ensure `PERPLEXITY_API_KEY` and `TAVILY_API_KEY` are set in environment for full competitive analysis quality

**PDF Export Issues**
- PDF export uses `html2canvas` which renders off-screen; ensure the page is not navigated away during generation
- `marked` parses Markdown to HTML client-side; ensure the content is valid Markdown

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout — loads Sora + IBM Plex Mono fonts |
| [src/app/globals.css](src/app/globals.css) | Pencil design tokens (CSS custom properties), status badge styles, scrollbar styles, Mermaid diagram styles (light/dark mode with media query) |
| [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx) | Dashboard layout — renders `ProjectSidebar` + children |
| [src/app/(dashboard)/projects/[id]/page.tsx](src/app/(dashboard)/projects/[id]/page.tsx) | Project page — fetches data server-side, passes to `ProjectWorkspace` |
| [src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) | PATCH/GET project details |
| [src/app/api/prompt-chat/route.ts](src/app/api/prompt-chat/route.ts) | **NEW** — GET/POST Prompt tab AI chat with follow-up questions |
| [src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts) | Analysis generation using in-house pipelines |
| [src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx) | Three-column workspace orchestrator |
| [src/components/layout/project-sidebar.tsx](src/components/layout/project-sidebar.tsx) | App-level dark sidebar (project list, search, sign-out) |
| [src/components/layout/document-nav.tsx](src/components/layout/document-nav.tsx) | Pipeline-step nav with status badges |
| [src/components/layout/content-editor.tsx](src/components/layout/content-editor.tsx) | Document content view — now uses PromptChatInterface for Prompt tab |
| [src/components/ui/markdown-renderer.tsx](src/components/ui/markdown-renderer.tsx) | **UPDATED** — Markdown renderer with beautiful-mermaid diagrams, syntax highlighting, and inline AI editing. Features: (1) Mermaid diagram expansion - diagrams fit within document width with an expand button (bottom-right, visible on hover) that opens a full-screen modal with margins; (2) Conditional component rendering (minimal components when no pending edit); (3) Mouseup-based selection capture to prevent interference during text selection. Mermaid diagrams are styled via globals.css with theme-appropriate colors for both light and dark modes. |
| [src/components/ui/inline-ai-editor.tsx](src/components/ui/inline-ai-editor.tsx) | **NEW** — Inline AI editing popup with diff preview and apply/reject actions |
| [src/components/ui/selection-toolbar.tsx](src/components/ui/selection-toolbar.tsx) | **NEW** — Text selection toolbar that shows "Edit with AI" button |
| [src/components/chat/chat-interface.tsx](src/components/chat/chat-interface.tsx) | General chat UI component |
| [src/components/chat/prompt-chat-interface.tsx](src/components/chat/prompt-chat-interface.tsx) | **NEW** — Prompt tab chat with model selection and follow-up questions |
| [src/app/api/document-edit/route.ts](src/app/api/document-edit/route.ts) | **NEW** — API endpoint for inline AI document editing |
| [src/app/api/analyses/[id]/route.ts](src/app/api/analyses/[id]/route.ts) | **NEW** — PATCH endpoint to update analysis content |
| [src/app/api/prds/[id]/route.ts](src/app/api/prds/[id]/route.ts) | **NEW** — PATCH endpoint to update PRD content |
| [src/app/api/mvp-plans/[id]/route.ts](src/app/api/mvp-plans/[id]/route.ts) | PATCH endpoint to update MVP plan content |
| [src/app/api/mockups/generate/route.ts](src/app/api/mockups/generate/route.ts) | **NEW** — POST endpoint to generate ASCII art mockups using OpenRouter with optional model selection |
| [src/app/api/mockups/[id]/route.ts](src/app/api/mockups/[id]/route.ts) | **NEW** — PATCH endpoint to update mockup content |
| [src/app/api/tech-specs/[id]/route.ts](src/app/api/tech-specs/[id]/route.ts) | PATCH endpoint to update tech spec content |
| [src/components/analysis/analysis-panel.tsx](src/components/analysis/analysis-panel.tsx) | Analysis UI component |
| [src/lib/analysis-pipelines.ts](src/lib/analysis-pipelines.ts) | In-house analysis orchestration (competitive, PRD, MVP, tech spec) |
| [src/lib/perplexity.ts](src/lib/perplexity.ts) | Perplexity API client for competitor search |
| [src/lib/tavily.ts](src/lib/tavily.ts) | Tavily API client for URL content extraction |
| [src/lib/pdf-utils.ts](src/lib/pdf-utils.ts) | PDF export: Markdown → HTML → canvas → jsPDF |
| [src/lib/prompt-chat-config.ts](src/lib/prompt-chat-config.ts) | **NEW** — System prompts, question strategies, and AI models for Prompt chat |
| [src/lib/supabase/server.ts](src/lib/supabase/server.ts) | Server-side Supabase client |
| [src/lib/supabase/client.ts](src/lib/supabase/client.ts) | Browser Supabase client |
| [src/lib/stripe.ts](src/lib/stripe.ts) | Stripe singleton client — lazy-initialized with Proxy export |
| [src/app/api/stripe/checkout/route.ts](src/app/api/stripe/checkout/route.ts) | POST — creates Stripe checkout session for subscription upgrade |
| [src/app/api/stripe/portal/route.ts](src/app/api/stripe/portal/route.ts) | POST — creates Stripe billing portal session for subscription management |
| [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts) | POST — handles Stripe webhook events (checkout, subscription updates, invoice payments) |
| [src/app/(dashboard)/billing/page.tsx](src/app/(dashboard)/billing/page.tsx) | Billing page — plan cards, subscription status, credit balance, upgrade flow |
| [src/lib/openrouter.ts](src/lib/openrouter.ts) | OpenRouter AI integration (fallback) |
| [src/lib/utils.ts](src/lib/utils.ts) | Utility functions & CREDIT_COSTS |
| [src/middleware.ts](src/middleware.ts) | Auth middleware |
| [src/types/database.ts](src/types/database.ts) | Database type definitions |
| [migrations/create_prompt_chat_messages.sql](migrations/create_prompt_chat_messages.sql) | Database migration for prompt_chat_messages table |
| [migrations/create_mockups_table.sql](migrations/create_mockups_table.sql) | **NEW** — Database migration for mockups table |
| [PROMPT_CHAT_SETUP.md](PROMPT_CHAT_SETUP.md) | Setup guide for Prompt tab AI chat feature |

---

**End of PROJECT_CONTEXT.md**

*This document serves as the comprehensive reference for understanding and working with the Idea2App codebase. Keep it updated as the project evolves.*
