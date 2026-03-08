"use client"

import React from "react"
import { Renderer, JSONUIProvider } from "@json-render/react"
import { mockupRegistry } from "@/lib/json-render/registry"
import type { Spec } from "@json-render/core"
import { Monitor, Smartphone, Tablet, Layers } from "lucide-react"

interface MockupRendererProps {
  content: string
  className?: string
}

// ---- JSON-render mockup types and parsing ----

interface MockupPage {
  title: string
  description: string
  spec: Spec
}

/**
 * Detect whether content is in the new json-render format.
 * JSON-render content contains "root" and "elements" keys within JSON blocks.
 */
function isJsonRenderContent(content: string): boolean {
  return content.includes('"root"') && content.includes('"elements"')
}

/**
 * Extract a human-readable page title from a json-render spec.
 * Looks at the root element's title prop, its element ID, or the first Heading child.
 */
function extractPageTitle(spec: Spec, fallbackIndex: number): string {
  const elements = spec.elements as Record<string, { type?: string; props?: Record<string, unknown>; children?: string[] }>
  const rootId = spec.root as string
  const rootEl = elements[rootId]

  if (!rootEl) return `Page ${fallbackIndex}`

  // 1. Check root element's title prop (e.g. Card with title)
  const titleProp = rootEl.props?.title as string | undefined
  if (titleProp) return titleProp

  // 2. Look for a Heading in immediate children
  for (const childId of rootEl.children || []) {
    const child = elements[childId]
    if (child?.type === "Heading" && child.props) {
      const text = (child.props as Record<string, unknown>).text as string
      if (text) return text
    }
  }

  // 3. Look deeper — check grandchildren for a Heading (e.g. Stack > Card > Heading)
  for (const childId of rootEl.children || []) {
    const child = elements[childId]
    for (const grandchildId of child?.children || []) {
      const grandchild = elements[grandchildId]
      if (grandchild?.type === "Heading" && grandchild.props) {
        const text = (grandchild.props as Record<string, unknown>).text as string
        if (text) return text
      }
    }
  }

  // 4. Try to derive from the root element ID (e.g. "dashboard-root" → "Dashboard")
  if (rootId && rootId !== "root") {
    return rootId
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  return `Page ${fallbackIndex}`
}

/**
 * Parse markdown content containing json-render specs.
 * Expected format: markdown headers (## or ###) followed by ```json blocks.
 */
function parseJsonRenderPages(raw: string): MockupPage[] {
  const pages: MockupPage[] = []
  const lines = raw.split("\n")
  let currentTitle = ""
  let currentDescription: string[] = []
  let inCodeFence = false
  let codeBlock: string[] = []

  const flushPage = () => {
    if (codeBlock.length === 0) return
    const jsonStr = codeBlock.join("\n").trim()
    try {
      const spec = JSON.parse(jsonStr) as Spec
      if (spec.root && spec.elements) {
        const title = currentTitle || extractPageTitle(spec, pages.length + 1)
        pages.push({
          title,
          description: currentDescription.join("\n").trim(),
          spec,
        })
      }
    } catch {
      // Invalid JSON — skip this block
      console.warn(`[MockupRenderer] Failed to parse json-render spec for "${currentTitle}"`)
    }
    codeBlock = []
    currentDescription = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Handle code fences
    if (trimmed.startsWith("```")) {
      if (inCodeFence) {
        flushPage()
        inCodeFence = false
      } else {
        inCodeFence = true
      }
      continue
    }

    if (inCodeFence) {
      codeBlock.push(line)
      continue
    }

    // Detect markdown headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      currentTitle = headerMatch[2]
      currentDescription = []
      continue
    }

    // Collect description text between header and code block
    if (trimmed) {
      currentDescription.push(trimmed)
    }
  }

  // Flush any remaining content
  flushPage()

  return pages
}

// ---- JSON Patch format detection and parsing ----

/**
 * Detect whether content is in JSON Patch format (streaming patches).
 * Some models output json-render specs as a series of {"op":"add",...} operations.
 */
function isJsonPatchContent(content: string): boolean {
  return content.trimStart().startsWith('{"op":')
}

/**
 * Split a string containing multiple concatenated JSON objects into individual strings.
 * Handles nested objects and quoted strings with escaped characters correctly.
 */
function splitJsonObjects(content: string): string[] {
  const objects: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\" && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === "{") {
      if (depth === 0) start = i
      depth++
    } else if (char === "}") {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(content.slice(start, i + 1))
        start = -1
      }
    }
  }

  return objects
}

/**
 * Set a nested value in an object using a JSON Pointer path (e.g. "/elements/app").
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
) {
  const parts = path.split("/").filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Apply JSON Patch "add" operations to reconstruct a complete json-render spec.
 * Returns null if the result doesn't contain the required root + elements.
 */
function applyJsonPatches(content: string): Spec | null {
  const jsonStrings = splitJsonObjects(content)
  if (jsonStrings.length === 0) return null

  const result: Record<string, unknown> = {}

  for (const jsonStr of jsonStrings) {
    try {
      const patch = JSON.parse(jsonStr) as {
        op: string
        path: string
        value: unknown
      }
      if (patch.op === "add" && patch.path && patch.value !== undefined) {
        setNestedValue(result, patch.path, patch.value)
      }
    } catch {
      // Skip malformed JSON patches — the content may be truncated
    }
  }

  if (result.root && result.elements) {
    return result as unknown as Spec
  }

  return null
}

// ---- Legacy ASCII art types and parsing ----

interface Section {
  type: "header" | "code" | "text"
  content: string
  level?: number
}

/**
 * Parses legacy mockup markdown content into structured sections.
 * Handles code fences, headers, and auto-detects unfenced ASCII art.
 */
function parseMockupContent(raw: string): Section[] {
  const lines = raw.split("\n")
  const sections: Section[] = []
  let inCodeFence = false
  let codeBlock: string[] = []
  let textBlock: string[] = []

  const hasBoxChars = (line: string) =>
    /[┌┐└┘├┤┬┴┼─│═║╔╗╚╝╠╣╦╩╬]/.test(line)

  const isAsciiArtLine = (line: string) => {
    const t = line.trim()
    if (!t) return false
    return (
      hasBoxChars(t) ||
      /^\+[-+]+\+$/.test(t) ||
      (/^\|/.test(t) && /\|$/.test(t))
    )
  }

  const flushText = () => {
    if (textBlock.length === 0) return
    const text = textBlock.join("\n").trim()
    if (text) {
      sections.push({ type: "text", content: text })
    }
    textBlock = []
  }

  const flushCode = () => {
    if (codeBlock.length === 0) return
    while (codeBlock.length > 0 && !codeBlock[codeBlock.length - 1].trim()) {
      codeBlock.pop()
    }
    if (codeBlock.length > 0) {
      sections.push({ type: "code", content: codeBlock.join("\n") })
    }
    codeBlock = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith("```")) {
      if (inCodeFence) {
        flushCode()
        inCodeFence = false
      } else {
        flushText()
        inCodeFence = true
      }
      continue
    }

    if (inCodeFence) {
      codeBlock.push(line)
      continue
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      flushText()
      flushCode()
      sections.push({
        type: "header",
        content: headerMatch[2],
        level: headerMatch[1].length,
      })
      continue
    }

    if (isAsciiArtLine(line)) {
      flushText()
      codeBlock.push(line)
      continue
    }

    if (codeBlock.length > 0) {
      if (!trimmed) {
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line)
        } else {
          flushCode()
          textBlock.push(line)
        }
      } else {
        let moreArt = false
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (isAsciiArtLine(lines[j])) {
            moreArt = true
            break
          }
          if (lines[j].trim().match(/^#{1,6}\s/)) break
        }
        if (moreArt) {
          codeBlock.push(line)
        } else {
          flushCode()
          textBlock.push(line)
        }
      }
      continue
    }

    textBlock.push(line)
  }

  flushText()
  flushCode()

  return sections
}

// ---- Viewport presets ----

type Viewport = "desktop" | "tablet" | "mobile"

const viewportConfig: Record<Viewport, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
}

// ---- Error boundary for Renderer ----

class RendererErrorBoundary extends React.Component<
  { children: React.ReactNode; specJson?: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; specJson?: string }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 border border-dashed border-red-300 rounded-md bg-red-50 text-sm">
          <p className="font-medium text-red-700 mb-2">Failed to render mockup</p>
          <p className="text-red-500 text-xs mb-2">{this.state.error.message}</p>
          {this.props.specJson && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">Raw spec</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-48 text-[10px]">
                {this.props.specJson}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// ---- JSON-render page renderer (single page) ----

/**
 * Wrapper that detects when the Renderer produces empty/null output
 * and shows a diagnostic fallback with the raw spec.
 */
function RendererWithFallback({ spec, specJson }: { spec: Spec; specJson: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = React.useState(false)

  React.useEffect(() => {
    // Check after render if the container has visible child content
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const hasContent = containerRef.current.querySelector('[data-slot], h1, h2, h3, h4, p, button, input, table')
        if (!hasContent) {
          console.warn(`[MockupRenderer] Renderer produced no visible DOM elements. Spec:`, spec)
          setIsEmpty(true)
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [spec])

  return (
    <>
      <div ref={containerRef} style={{ display: isEmpty ? 'none' : undefined }}>
        <JSONUIProvider registry={mockupRegistry}>
          <Renderer
            spec={spec}
            registry={mockupRegistry}
            fallback={() => (
              <div className="p-3 border border-dashed border-gray-300 rounded-md text-xs text-gray-400 bg-gray-50">
                [Component placeholder]
              </div>
            )}
          />
        </JSONUIProvider>
      </div>
      {isEmpty && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Wireframe could not be rendered
          </div>
          <p className="text-xs text-gray-500">The json-render spec may have an incompatible structure. Try regenerating the mockup.</p>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">View raw spec</summary>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-auto max-h-64 text-[10px] font-mono leading-relaxed">
              {specJson}
            </pre>
          </details>
        </div>
      )}
    </>
  )
}

function JsonRenderPage({ page }: { page: MockupPage }) {
  const specJson = React.useMemo(() => {
    try {
      return JSON.stringify(page.spec, null, 2)
    } catch {
      return "Unable to serialize spec"
    }
  }, [page.spec])

  return (
    <div className="wireframe-layer rounded-lg min-h-[400px] overflow-hidden w-full max-w-full bg-white [&>div]:w-full [&>div>div]:w-full">
      <RendererErrorBoundary specJson={specJson}>
        <RendererWithFallback spec={page.spec} specJson={specJson} />
      </RendererErrorBoundary>
    </div>
  )
}

// ---- Multi-page interactive mockup viewer ----

function MockupViewer({ pages }: { pages: MockupPage[] }) {
  return (
    <div className="space-y-6">
      {pages.map((page, index) => (
        <div key={`${page.title}-${index}`} className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground border-l-2 border-primary pl-2">
            Option {index + 1}: {page.title}
          </div>
          <SinglePageViewer page={page} />
        </div>
      ))}
    </div>
  )
}

// ---- Single-page viewer (for JSON Patch results) ----

function SinglePageViewer({ page }: { page: MockupPage }) {
  const [viewport, setViewport] = React.useState<Viewport>("desktop")
  const vp = viewportConfig[viewport]

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between border border-border rounded-t-xl bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{page.title}</span>
          {page.description && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              — {page.description}
            </span>
          )}
        </div>

        {/* Viewport toggles */}
        <div className="flex items-center bg-background rounded-md border border-border p-0.5">
          {(Object.entries(viewportConfig) as [Viewport, typeof vp][]).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                onClick={() => setViewport(key)}
                title={config.label}
                className={`
                  p-1 rounded transition-colors
                  ${key === viewport
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Browser chrome */}
      <div className="border-x border-border bg-muted/20">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 flex items-center gap-1.5 bg-background rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground font-mono">
            <span className="text-green-600">●</span>
            <span>app.example.com</span>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="border-x border-b border-border rounded-b-xl bg-muted/10 overflow-hidden">
        <div className="flex justify-center bg-[repeating-conic-gradient(rgb(0_0_0/0.02)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          <div
            className="w-full transition-all duration-300 ease-out bg-white"
            style={{ maxWidth: vp.width, minHeight: "500px" }}
          >
            <div className="p-4">
              <JsonRenderPage page={page} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Legacy ASCII renderer ----

function AsciiMockupContent({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, i) => {
        switch (section.type) {
          case "header": {
            const level = Math.min(section.level || 2, 6)
            const sizeClass =
              level === 1
                ? "text-2xl font-bold"
                : level === 2
                  ? "text-xl font-bold"
                  : level === 3
                    ? "text-lg font-semibold"
                    : "text-base font-semibold"
            return (
              <div key={i} className={`${sizeClass} text-foreground pt-2`}>
                {section.content}
              </div>
            )
          }
          case "code":
            return (
              <pre
                key={i}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 overflow-x-auto"
              >
                <code className="font-mono text-[13px] leading-[1.6] text-emerald-400 whitespace-pre block">
                  {section.content}
                </code>
              </pre>
            )
          case "text":
            return (
              <p
                key={i}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {section.content}
              </p>
            )
          default:
            return null
        }
      })}
    </>
  )
}

// ---- Split a single spec into pages ----

/**
 * Attempts to split a single large json-render spec into multiple pages.
 * Looks at the root element's children: if each child is a self-contained
 * section (e.g., a page-level Stack or Card), extract them as separate pages.
 */
function splitSpecIntoPages(spec: Spec): MockupPage[] {
  const elements = spec.elements as Record<string, { type?: string; props?: Record<string, unknown>; children?: string[] }>
  const rootEl = elements[spec.root as string]

  if (!rootEl || !rootEl.children || rootEl.children.length <= 1) {
    return [] // Not splittable
  }

  // Check if root's children look like individual pages
  // (each child is a Stack or Card with its own subtree)
  const childElements = rootEl.children
    .map((id: string) => ({ id, el: elements[id] }))
    .filter(({ el }) => el && (el.type === "Stack" || el.type === "Card"))

  // Only split if ALL children are Stacks/Cards (page-level containers)
  if (childElements.length !== rootEl.children.length || childElements.length < 2) {
    return []
  }

  // Extract each child as a separate page spec
  const pages: MockupPage[] = []
  for (const { id, el } of childElements) {
    // Collect all elements reachable from this child
    const reachable = new Set<string>()
    const queue = [id]
    while (queue.length > 0) {
      const current = queue.pop()!
      if (reachable.has(current)) continue
      reachable.add(current)
      const node = elements[current]
      if (node?.children) {
        for (const childId of node.children) {
          queue.push(childId)
        }
      }
    }

    // Build a sub-spec with only reachable elements
    const subElements: Record<string, unknown> = {}
    for (const key of reachable) {
      subElements[key] = elements[key]
    }

    const subSpec = { root: id, elements: subElements } as unknown as Spec
    const title = extractPageTitle(subSpec, pages.length + 1)

    pages.push({
      title,
      description: "",
      spec: subSpec,
    })
  }

  return pages
}

// ---- Main component ----

/**
 * Renders mockup content — either as interactive json-render components (new)
 * or as ASCII art wireframes (legacy). Auto-detects the format.
 */
export function MockupRenderer({ content, className = "" }: MockupRendererProps) {
  // Memoize format detection and parsing to avoid re-parsing on every render
  const patchSpec = React.useMemo(() => {
    if (isJsonPatchContent(content)) {
      return applyJsonPatches(content)
    }
    return null
  }, [content])

  const isJsonRender = React.useMemo(
    () => !patchSpec && isJsonRenderContent(content),
    [content, patchSpec]
  )

  // JSON Patch format — reconstruct spec from streaming patches
  if (patchSpec) {
    // Try to split the assembled spec into multiple pages.
    // If the root element is a top-level container whose children are each self-contained
    // page specs (Cards or Stacks), treat them as separate pages.
    const pages = splitSpecIntoPages(patchSpec)

    if (pages.length > 1) {
      return (
        <div className={className}>
          <MockupViewer pages={pages} />
        </div>
      )
    }

    return (
      <div className={className}>
        <SinglePageViewer
          page={{
            title: "Wireframe",
            description: "Layout wireframe generated from the MVP plan",
            spec: patchSpec,
          }}
        />
      </div>
    )
  }

  // Standard json-render format — markdown headers + JSON code blocks
  if (isJsonRender) {
    const pages = parseJsonRenderPages(content)

    if (pages.length === 0) {
      // Fallback: couldn't parse any valid specs — render as ASCII
      const sections = parseMockupContent(content)
      return (
        <div className={`space-y-5 ${className}`}>
          <AsciiMockupContent sections={sections} />
        </div>
      )
    }

    // Multi-page: show all options in linear order
    if (pages.length > 1) {
      return (
        <div className={className}>
          <MockupViewer pages={pages} />
        </div>
      )
    }

    // Single page
    return (
      <div className={className}>
        <SinglePageViewer page={pages[0]} />
      </div>
    )
  }

  // Legacy ASCII art rendering
  const sections = parseMockupContent(content)
  return (
    <div className={`space-y-5 ${className}`}>
      <AsciiMockupContent sections={sections} />
    </div>
  )
}
