import { NextResponse } from "next/server"
import puppeteer from "puppeteer"
import { marked } from "marked"
import { renderMermaid } from "beautiful-mermaid"

export const maxDuration = 300 // 5 minutes for large PDFs

export async function POST(request: Request) {
  try {
    const { content, filename, projectName, analysisType } = await request.json()

    if (!content || !filename || !projectName || !analysisType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Convert markdown to HTML with mermaid support
    const htmlContent = await renderMarkdownToHTML(content)

    // Generate HTML template with styling
    const html = generateHTMLTemplate(htmlContent, projectName, analysisType)

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Set content and wait for rendering
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    })

    // Generate PDF with proper margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
      printBackground: true,
      preferCSSPageSize: false,
    })

    await browser.close()

    // Return PDF as downloadable file (convert Uint8Array to Buffer)
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}

// Helper function to convert markdown to HTML with mermaid support
async function renderMarkdownToHTML(markdown: string): Promise<string> {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  // First, render markdown to HTML
  let html = marked(markdown) as string

  // Extract and render mermaid diagrams
  const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g
  const mermaidMatches = [...html.matchAll(mermaidRegex)]

  // Define theme for mermaid diagrams with high contrast
  const mermaidTheme = {
    bg: "#FFFFFF",
    fg: "#000000",
    line: "#1F2937",
    accent: "#DC2626",
    muted: "#F5F5F5",
    font: "ui-monospace, 'IBM Plex Mono', monospace",

    // Text colors - all black
    textColor: "#000000",
    primaryTextColor: "#000000",
    secondaryTextColor: "#000000",
    tertiaryTextColor: "#000000",
    nodeTextColor: "#000000",
    labelTextColor: "#000000",
    edgeLabelText: "#000000",
    clusterTextColor: "#000000",
    darkTextColor: "#000000",
    mainContrastColor: "#000000",

    // Shape background colors - dark for contrast with white text
    primaryColor: "#1E3A8A",
    primaryBorderColor: "#1E40AF",
    secondaryColor: "#374151",
    secondaryBorderColor: "#1F2937",
    tertiaryColor: "#0F766E",
    tertiaryBorderColor: "#115E59",

    mainBkg: "#1E3A8A",
    secondBkg: "#374151",
    tertiaryBkg: "#0F766E",
    clusterBkg: "#1F2937",
    clusterBorder: "#374151",

    lineColor: "#1F2937",
    arrowheadColor: "#1F2937",

    nodeBorder: "#1F2937",
    defaultLinkColor: "#1F2937",

    // Sequence diagram colors
    actorBorder: "#1E40AF",
    actorBkg: "#1E3A8A",
    actorTextColor: "#000000",
    actorLineColor: "#1E40AF",
    signalColor: "#1F2937",
    signalTextColor: "#000000",
    labelBoxBkgColor: "#FFFFFF",
    labelBoxBorderColor: "#1F2937",
    loopTextColor: "#000000",
    activationBorderColor: "#1E40AF",
    activationBkgColor: "#1E3A8A",
    sequenceNumberColor: "#000000",

    // State diagram colors
    stateBkg: "#1E3A8A",
    stateBorder: "#1E40AF",
    stateTextColor: "#000000",

    // Class diagram colors
    classText: "#000000",

    // ER diagram colors
    entityBkg: "#1E3A8A",
    entityBorder: "#1E40AF",
    relationshipLineColor: "#1F2937",
    relationshipLabelBackground: "#FFFFFF",
    relationshipLabelColor: "#000000",
    attributeBackgroundColorOdd: "#F9FAFB",
    attributeBackgroundColorEven: "#FFFFFF",

    gridColor: "#D1D5DB",
    todayLineColor: "#DC2626",

    // Git diagram colors
    git0: "#1E3A8A",
    git1: "#991B1B",
    git2: "#854D0E",
    git3: "#065F46",
    git4: "#5B21B6",
    git5: "#9F1239",
    git6: "#9A3412",
    git7: "#0C4A6E",

    gitBranchLabel0: "#000000",
    gitBranchLabel1: "#000000",
    gitBranchLabel2: "#000000",
    gitBranchLabel3: "#000000",
    gitBranchLabel4: "#000000",
    gitBranchLabel5: "#000000",
    gitBranchLabel6: "#000000",
    gitBranchLabel7: "#000000",

    commitLabelColor: "#000000",
    commitLabelBackground: "#374151",

    // Pie chart colors
    pie1: "#1E3A8A",
    pie2: "#991B1B",
    pie3: "#854D0E",
    pie4: "#065F46",
    pie5: "#5B21B6",
    pie6: "#9F1239",
    pie7: "#9A3412",
    pie8: "#0C4A6E",
    pie9: "#4C1D95",
    pie10: "#831843",
    pie11: "#713F12",
    pie12: "#064E3B",

    pieTitleTextSize: "25px",
    pieTitleTextColor: "#000000",
    pieSectionTextSize: "17px",
    pieSectionTextColor: "#000000",
    pieLegendTextSize: "17px",
    pieLegendTextColor: "#000000",
    pieStrokeColor: "#FFFFFF",
    pieStrokeWidth: "2px",
    pieOpacity: "0.9",
  }

  // Process each mermaid diagram
  for (const match of mermaidMatches) {
    try {
      const mermaidCode = match[1].trim()
      // Decode HTML entities
      const decodedCode = mermaidCode
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

      // Render mermaid diagram to SVG
      const svg = await renderMermaid(decodedCode, mermaidTheme)

      // Replace the code block with the rendered SVG in a wrapper
      const svgWrapper = `<div class="mermaid-diagram-wrapper">${svg}</div>`
      html = html.replace(match[0], svgWrapper)
    } catch (error) {
      console.error("Error rendering mermaid diagram:", error)
      // Keep the original code block if rendering fails
    }
  }

  return html
}

// Generate complete HTML template with styling
function generateHTMLTemplate(
  content: string,
  projectName: string,
  analysisType: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - ${analysisType}</title>
  <style>
    :root {
      --font-weight-bold: 700;
      --font-weight-semibold: 600;
      --accent-color: #00d4ff;
      --text-primary: #1a1a1a;
      --text-secondary: #666;
      --text-muted: #999;
    }

    @page {
      margin: 20mm;
      size: A4;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      background: #ffffff;
    }

    /* Header */
    .header {
      margin-bottom: 30px;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 20px;
    }

    .header h1 {
      margin: 0 0 10px 0;
      font-size: 26px;
      color: var(--text-primary);
    }

    .header .analysis-type {
      margin: 0;
      font-size: 15px;
      color: #666;
      text-transform: capitalize;
    }

    .header .date {
      margin: 10px 0 0 0;
      font-size: 11px;
      color: #999;
    }

    /* Content */
    .content h1 {
      font-size: 24px;
      margin: 30px 0 15px 0;
      color: #1a1a1a;
      font-weight: var(--font-weight-bold);
      page-break-after: avoid;
    }

    .content h2 {
      font-size: 20px;
      margin: 25px 0 12px 0;
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);
      page-break-after: avoid;
    }

    .content h3 {
      font-size: 18px;
      margin: 20px 0 10px 0;
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);
      page-break-after: avoid;
    }

    .content h4 {
      font-size: 16px;
      margin: 15px 0 8px 0;
      color: var(--text-primary);
      font-weight: var(--font-weight-semibold);
      page-break-after: avoid;
    }

    .content p {
      margin: 12px 0;
      color: #333;
    }

    .content ul,
    .content ol {
      margin: 12px 0;
      padding-left: 25px;
      color: #333;
    }

    .content li {
      margin: 6px 0;
    }

    .content strong {
      color: #000;
      font-weight: var(--font-weight-semibold);
    }

    .content code {
      background: #f5f5f5;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Courier New', Consolas, monospace;
      font-size: 12px;
      color: var(--text-primary);
      border: 1px solid #e0e0e0;
    }

    .content pre {
      background: #f8f9fa;
      padding: 16px 20px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 20px 0;
      border: 1px solid #e0e0e0;
      page-break-inside: avoid;
    }

    .content pre code {
      background: none;
      padding: 0;
      border: none;
      color: #1a1a1a;
      display: block;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .content blockquote {
      border-left: 4px solid var(--accent-color);
      padding-left: 15px;
      margin: 15px 0;
      color: #555;
      font-style: italic;
    }

    .content table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      page-break-inside: avoid;
    }

    .content th,
    .content td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }

    .content th {
      background: #f5f5f5;
      font-weight: var(--font-weight-semibold);
    }

    .content a {
      color: var(--accent-color);
      text-decoration: none;
    }

    /* Mermaid diagrams */
    .mermaid-diagram-wrapper {
      margin: 15px 0;
      padding: 15px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      page-break-inside: avoid;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mermaid-diagram-wrapper svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${projectName}</h1>
    <p class="analysis-type">${analysisType.replace(/-/g, ' ')}</p>
    <p class="date">${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}</p>
  </div>

  <div class="content">
    ${content}
  </div>
</body>
</html>
  `.trim()
}
