# Codex Project Instructions

## Primary Context Source
**IMPORTANT:** Before beginning any task, planning any feature, or answering questions about the architecture, YOU MUST READ `PROJECT_CONTEXT.md`.
- This file contains the source of truth for the tech stack and architecture.
- Do not scan all project files to "get an idea" of the project; trust `PROJECT_CONTEXT.md` first.
- Only read specific source files if the task directly requires editing them.

## Rules

- Always explain what you're doing before you do it
- Ask me before deleting or overwriting any existing files
- Never hardcode passwords or API keys use environment variables
- Keep code simple and well-commented so I can learn from it
- If something breaks, explain what went wrong in plain English
- If you make architectural changes or add new dependencies, you must update `PROJECT_CONTEXT.md` to keep it current.

## How I Want You To Work

- Think step by step before writing code
- Build one feature at a time and confirm it works before moving on, don't jump ahead
- After making changes, give me suggestions on what to do next (what to run, where to look, etc.)
- If I ask for something that doesn't make sense, tell me — don't just do it

## Available Skills

Skills extend Codex's capabilities with specialized workflows. Invoke them using slash commands (e.g., `/deploy`, `/code-review`).

### Development & Deployment

#### `/deploy` - Deploy to Vercel
Deploy the current project to Vercel. Use when you need to push to production or create preview deployments.
- Example: "Deploy to Vercel" or "Push to production"

#### `/logs` - View Vercel Logs
View deployment logs from Vercel. Useful for debugging deployment issues.
- Example: "Show deployment logs" or "What went wrong with the deployment?"

#### `/setup` - Vercel Setup
Set up Vercel CLI and configure the project for deployment.
- Example: "Set up Vercel" or "Link this project to Vercel"

#### `/stripe-integration` - Stripe Payments
Implement Stripe payment processing including checkout, subscriptions, and webhooks.
- Example: "Add Stripe checkout" or "Implement subscription billing"

#### `/frontend-design` - UI Design
Create distinctive, production-grade frontend interfaces with high design quality.
- Example: "Build a landing page" or "Create a dashboard UI"

### Code Quality & Review

#### `/code-review` - PR Review
Review a pull request for code quality, best practices, and potential issues.
- Example: "Review PR #123" or "Code review this pull request"

### n8n Workflow Development

#### `/n8n-code-javascript` - n8n JavaScript
Write JavaScript code in n8n Code nodes with proper syntax ($input, $json, $node).
- Example: "Write n8n JavaScript to process webhook data"

#### `/n8n-code-python` - n8n Python
Write Python code in n8n Code nodes with proper syntax (_input, _json, _node).
- Example: "Write n8n Python to analyze data"

#### `/n8n-expression-syntax` - n8n Expressions
Validate and fix n8n expression syntax ({{}} syntax, $json, $node).
- Example: "Fix this n8n expression error"

#### `/n8n-mcp-tools-expert` - n8n Tools Expert
Expert guidance on using n8n-mcp MCP tools effectively.
- Example: "Help me configure this n8n workflow"

#### `/n8n-node-configuration` - n8n Node Config
Get operation-aware guidance for configuring n8n nodes.
- Example: "How do I configure this n8n HTTP node?"

#### `/n8n-validation-expert` - n8n Validation
Interpret and fix n8n validation errors and warnings.
- Example: "Why is my n8n workflow validation failing?"

#### `/n8n-workflow-patterns` - n8n Patterns
Learn proven workflow architectural patterns for n8n.
- Example: "Show me webhook processing patterns in n8n"

### Business & Content

#### `/content-research-writer` - Content Writing
Assists with writing high-quality content through research, citations, and real-time feedback.
- Example: "Help me write a blog post about Next.js"

#### `/domain-name-brainstormer` - Domain Names
Generate creative domain name ideas and check availability across multiple TLDs.
- Example: "Brainstorm domain names for my SaaS app"

#### `/lead-research-assistant` - Lead Research
Identify high-quality leads for your product by analyzing your business and target market.
- Example: "Find potential customers for my B2B tool"

### Configuration & Customization

#### `/keybindings-help` - Keyboard Shortcuts
Customize keyboard shortcuts and rebind keys in Codex.
- Example: "Rebind Ctrl+S" or "Add a chord shortcut"

#### `/configure` - HUD Configuration
Configure HUD display options (layout, presets, display elements).
- Example: "Configure my HUD layout"

#### `/setup` - HUD Setup (Note: Same command as Vercel, context-dependent)
Configure Codex-hud as your statusline.
- Example: "Set up HUD in my statusline"

#### `/brand-guidelines` - Anthropic Branding
Apply Anthropic's official brand colors and typography to artifacts.
- Example: "Apply Anthropic brand styling to this component"

#### `/skill-creator` - Create Skills
Guide for creating new skills that extend Codex's capabilities.
- Example: "Help me create a custom skill for API testing"

### Usage Tips

1. **Invoke with slash commands**: Type `/skill-name` (e.g., `/deploy`)
2. **Or describe what you need**: Say "Deploy to Vercel" instead of memorizing commands
3. **Context matters**: Some skills work best with specific file types or project setups
4. **Combine skills**: Use multiple skills in sequence (e.g., `/frontend-design` then `/deploy`)


<!-- TOKEN_EFFICIENCY_START -->

## Token Efficiency Protocol

These repo-local rules are intentionally portable for Claude Code, Codex, and other coding agents. They combine the useful parts of code-review-graph, Token Savior Recall, Caveman, and claude-token-efficient without depending on one machine's global config.

### Default workflow

1. Read `PROJECT_CONTEXT.md` or the smallest relevant context file first when present. Do not scan the whole repo to orient.
2. Before broad code review or multi-file edits, use structural tools first:
   - `code-review-graph`: build/query the repo graph and ask for affected files / review context.
   - `token-savior-recall`: use symbol, dependency, and memory lookup before opening full files.
3. Read only files required by the task. Avoid opening generated/build/vendor folders and avoid files over 100KB unless the task specifically needs them.
4. Prefer symbol-level lookup, grep/ripgrep, and targeted excerpts over full-file reads.
5. Keep responses concise: no sycophantic opener, no closing fluff, no long summaries unless asked. Report only changed files, verification, blockers, and next actions.
6. For review: inspect changed files plus graph blast radius, not the entire repository.
7. For edits: make the smallest safe change, then run the narrowest meaningful verification.

### Recommended local install on a new machine

```bash
# one-time prerequisites
brew install uv || true

# from this repo
./scripts/setup-agent-token-tools.sh
```

The setup script uses `uvx` so the repo does not vendor Python packages. If an agent cannot use MCP, still follow the workflow above manually.

<!-- TOKEN_EFFICIENCY_END -->
