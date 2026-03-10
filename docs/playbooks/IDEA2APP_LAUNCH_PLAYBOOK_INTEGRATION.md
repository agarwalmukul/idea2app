# Idea2App × Startup Launch Playbook: Integration Plan

## Imported Assets

- Zip saved at:
  - `docs/playbooks/startup-launch-playbook-souls/startup-launch-playbook-souls---f9f6c2d1-f21e-4fc2-9fb5-7f675dd84865.zip`
- Extracted to:
  - `docs/playbooks/startup-launch-playbook-souls/`
- Main entrypoint:
  - `docs/playbooks/startup-launch-playbook-souls/SKILL.md`
- Platform intel files:
  - `docs/playbooks/startup-launch-playbook-souls/references/platforms/*.md`

## What this gives Idea2App

A ready-made launch-ops knowledge base for:
- 56 launch/distribution platforms
- platform-specific submission rules
- launch sequencing and timing
- copy/asset requirements
- per-platform strategy and rejection pitfalls

This can become Idea2App’s **Launch Copilot** feature.

---

## High-impact ways to improve Idea2App

## 1) Add a “Launch Planner” step in project flow

Add a new step after build/MVP:
- Inputs:
  - one-line product description
  - audience
  - stage (pre-launch/launched)
  - budget
  - open-source flag
- Outputs:
  - recommended platform list (Immediate / Scheduled / Premium / Revenue / Skip)
  - launch sequence calendar

Use the extracted platform markdown files as source-of-truth.

## 2) Auto-generate platform-ready copy packs

From one product brief, generate:
- short tagline (PH/launcher formats)
- short/medium/long descriptions
- maker comment / founder story
- Show HN variant

Store in project-specific files so users can copy/paste quickly.

## 3) Add “Launch Tracker” inside Idea2App

Create a tracker per product with statuses:
- Not Started
- Drafting
- Submitted
- Pending Review
- Approved
- Live
- Rejected
- Skipped

Track:
- submission date
- live date
- listing URL
- notes
- next action date

This turns launch from a one-off task into an execution pipeline.

## 4) Asset checklist automation

Add a preflight checker for:
- logo (square)
- screenshots
- OG image
- demo video

Show missing assets before user starts submissions.

## 5) Timing assistant for high-leverage platforms

Add smart reminders for:
- Product Hunt daily reset timing
- Peerlist weekly cadence
- Hacker News best posting windows

This will increase launch outcomes without changing the product itself.

---

## Suggested implementation order (fastest ROI)

1. **Read-only integration**: expose platform recommendations in UI
2. **Copy pack generation**: create platform-ready text blocks
3. **Tracker persistence**: save launch statuses in DB
4. **Timing/reminder automation**
5. **1-click integrations/APIs (later)**

---

## Minimal technical architecture

- Keep imported playbook files in `docs/playbooks/startup-launch-playbook-souls/` (versioned content)
- Build a normalization layer:
  - parse markdown → structured JSON (platform name, category, cost, cadence, requirements)
- Serve this JSON to Launch Planner UI
- Persist per-project launch records in DB

### Candidate schema

- `launch_projects`
  - `id`, `project_id`, `brief_json`, `created_at`
- `launch_platforms`
  - `slug`, `name`, `category`, `cost_model`, `cadence`, `source_path`
- `launch_submissions`
  - `id`, `launch_project_id`, `platform_slug`, `status`, `submitted_at`, `live_at`, `listing_url`, `notes`

---

## Product positioning upgrade for Idea2App

Current value: “idea to app.”

Upgraded value: **“idea to app to distribution.”**

This is a strong differentiation because most builders stop at shipping; this adds go-to-market execution.

---

## Next concrete task

Implement an MVP endpoint:
- Input: product brief JSON
- Output: ranked platform list + generated copy pack + tracker skeleton

Then surface it as a new tab: **Launch**.
