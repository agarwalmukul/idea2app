import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog"

// Type assertion needed: @json-render/shadcn uses zod 4 types internally,
// but our project uses zod 3.25. The runtime is compatible — only types mismatch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defs = shadcnComponentDefinitions as Record<string, any>

/**
 * Component catalog for AI mockup generation.
 * Defines which UI components the LLM is allowed to generate.
 * Uses the shadcn preset for components that match our design system.
 */
export const mockupCatalog = defineCatalog(schema, {
  components: {
    // Layout
    Stack: defs.Stack,
    Grid: defs.Grid,
    Separator: defs.Separator,

    // Containers
    Card: defs.Card,
    Tabs: defs.Tabs,
    Accordion: defs.Accordion,
    Collapsible: defs.Collapsible,

    // Typography
    Heading: defs.Heading,
    Text: defs.Text,

    // Data display
    Table: defs.Table,
    Badge: defs.Badge,
    Avatar: defs.Avatar,
    Progress: defs.Progress,
    Alert: defs.Alert,

    // Form elements
    Input: defs.Input,
    Textarea: defs.Textarea,
    Select: defs.Select,
    Checkbox: defs.Checkbox,
    Radio: defs.Radio,
    Switch: defs.Switch,
    Slider: defs.Slider,

    // Actions
    Button: defs.Button,
    Link: defs.Link,
    DropdownMenu: defs.DropdownMenu,
    ButtonGroup: defs.ButtonGroup,

    // Navigation
    Pagination: defs.Pagination,

    // Media
    Image: defs.Image,

    // Feedback
    Skeleton: defs.Skeleton,
    Spinner: defs.Spinner,
    Tooltip: defs.Tooltip,
  },
  actions: {},
})

/**
 * Generate the system prompt for mockup generation.
 * Includes the full component catalog so the LLM knows what's available.
 */
export function getMockupSystemPrompt(projectName: string): string {
  return mockupCatalog.prompt({
    system: [
      `You are a UI/UX wireframe designer creating low-fidelity wireframes for "${projectName}".`,
      "Generate JSON specs that show PAGE STRUCTURE and LAYOUT — not detailed content.",
      "Think like a whiteboard sketch: show where things go, not what they say.",
      "Your wireframes should look like real app layouts — full-width sections, multi-column grids, proper visual hierarchy.",
    ].join(" "),
    customRules: [
      // Layout fundamentals
      "CRITICAL LAYOUT RULE: Every page must use FULL-WIDTH layouts. Never leave components floating narrow — all sections should span the full container width",
      "Use Stack with direction='vertical' as the root layout for each page — this is the full-page wrapper",
      "Use Stack with direction='horizontal' and align='center' for navigation bars, toolbars, and horizontal sections that span full width",
      "Use Grid with columns=2 or columns=3 for side-by-side layouts (e.g., sidebar + content, feature cards, profile + settings)",
      "For multiple options, make each option structurally distinct (e.g., different hierarchy, different primary layout primitive, different navigation pattern)",
      "DESIGN PRINCIPLE: Group related items into Cards, then arrange Cards in a Grid — never stack narrow Cards vertically when they belong side by side",
      "Use Separator between major page sections for visual structure",

      // Visual hierarchy
      "VISUAL HIERARCHY: Pages should have clear sections — a top nav bar, then hero/header area, then content sections, then footer. Each section spans full width",
      "Navigation bars: Use a horizontal Stack with logo on the left, nav links in the middle, and action buttons on the right",
      "Dashboard layouts: Use a Grid with columns=3 or columns=4 for stat cards at the top, then a Grid with columns=2 for main content + sidebar below",
      "Content sections: Wrap each section in a Card that spans full width, with a Heading and relevant content inside",

      // Component usage
      "WIREFRAME STYLE: Use short labels (1-3 words), not paragraphs of text",
      "All content and labels should be specific and non-placeholder; avoid generic filler text",
      "Use Heading for section titles only — keep them brief (e.g., 'Features', 'Pricing')",
      "Use Text sparingly — short descriptions of what content goes there (e.g., 'Product description')",
      "Use Skeleton to represent images, banners, and media placeholders — set height props for visual weight",
      "Use Input/Select/Textarea for form wireframes with short placeholder labels",
      "Use Button with short labels ('Submit', 'Sign Up', 'Learn More')",
      "Use Badge for status labels ('New', 'Pro', 'Active')",
      "Use Table with 3-4 columns for data-heavy sections — tables should be inside full-width Cards",
      "Keep pages focused: 15-30 elements per page — enough to show a realistic layout, not a skeleton",
    ],
  })
}
