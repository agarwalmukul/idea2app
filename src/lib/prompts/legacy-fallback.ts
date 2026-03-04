import { buildSecurePrompt } from "./sanitize"

const COMPETITIVE_ANALYSIS_TEMPLATE = `You are an expert business analyst. Perform a comprehensive competitive analysis for the following business idea.

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

const GAP_ANALYSIS_TEMPLATE = `You are an expert business strategist. Perform a comprehensive gap analysis for the following business idea.

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

const PRD_TEMPLATE = `You are an expert product manager. Create a comprehensive Product Requirements Document (PRD) for the following business idea.

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

const TECH_SPEC_TEMPLATE = `You are a senior software architect. Create a comprehensive Technical Specification document for the following product.

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

export const LEGACY_ANALYSIS_PROMPTS: Readonly<Record<string, (idea: string, name: string) => string>> = Object.freeze({
  "competitive-analysis": (idea: string, name: string) =>
    buildSecurePrompt(COMPETITIVE_ANALYSIS_TEMPLATE, { idea, name }),

  "gap-analysis": (idea: string, name: string) =>
    buildSecurePrompt(GAP_ANALYSIS_TEMPLATE, { idea, name }),

  "prd": (idea: string, name: string) =>
    buildSecurePrompt(PRD_TEMPLATE, { idea, name }),

  "tech-spec": (idea: string, name: string) =>
    buildSecurePrompt(TECH_SPEC_TEMPLATE, { idea, name }),
})
