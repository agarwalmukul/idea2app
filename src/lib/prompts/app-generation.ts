import { buildSecurePrompt } from "./sanitize"

export const APP_TYPE_PROMPTS: Readonly<Record<string, string>> = Object.freeze({
  static: "a simple static website using HTML, CSS, and vanilla JavaScript. Include a modern responsive design with a header, hero section, features, and footer.",
  dynamic: "a dynamic website using Next.js with TypeScript and Tailwind CSS. Include API routes, a database-connected feature, and server-side rendering.",
  spa: "a single page application using React with TypeScript, Vite, and Tailwind CSS. Include state management with React Context, client-side routing, and a responsive UI.",
  pwa: "a progressive web app using Next.js with TypeScript. Include a service worker for offline support, a web manifest, and push notification capability.",
})

const APP_GENERATION_TEMPLATE = `Generate {{appTypePrompt}}

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
  const appTypePrompt = APP_TYPE_PROMPTS[appType]
  if (!appTypePrompt) {
    throw new Error(
      `Unknown app type: "${appType}". Valid types: ${Object.keys(APP_TYPE_PROMPTS).join(", ")}`
    )
  }

  return buildSecurePrompt(
    APP_GENERATION_TEMPLATE,
    { appTypePrompt, name, idea, context },
    { maxLengths: { context: 10000, idea: 5000 } }
  )
}
