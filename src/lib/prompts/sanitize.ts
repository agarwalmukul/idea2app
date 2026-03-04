/**
 * Security utilities for sanitizing user inputs before injecting them into LLM prompts.
 */

// Patterns that indicate prompt injection attempts.
// Stored as [source, flags] tuples — fresh RegExp created per call to avoid
// shared lastIndex state across concurrent requests.
const INJECTION_PATTERN_SOURCES: Array<[string, string]> = [
  ["ignore\\s+previous\\s+instructions", "gi"],
  ["ignore\\s+all\\s+previous", "gi"],
  ["ignore\\s+above\\s+instructions", "gi"],
  ["disregard\\s+previous", "gi"],
  ["you\\s+are\\s+now", "gi"],
  ["pretend\\s+you\\s+are", "gi"],
  ["act\\s+as\\s+if", "gi"],
  ["new\\s+instructions:", "gi"],
  ["override\\s+instructions", "gi"],
  ["forget\\s+everything", "gi"],
  ["<\\|im_start\\|>", "gi"],
  ["<\\|im_end\\|>", "gi"],
  ["<\\|im_sep\\|>", "gi"],
  ["<\\|endoftext\\|>", "gi"],
  ["\\[INST\\]", "gi"],
  ["\\[\\/INST\\]", "gi"],
  ["<<SYS>>", "gi"],
  ["<<\\/SYS>>", "gi"],
  ["^system:", "gim"],
  ["^user:", "gim"],
  ["^assistant:", "gim"],
  ["^human:", "gim"],
]

// Zero-width and control characters (preserve normal whitespace: \t \n \r)
const CONTROL_CHAR_PATTERN = /[\u200B-\u200F\u2028-\u202F\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

/**
 * Strips prompt injection patterns, removes zero-width/control characters,
 * and truncates to maxLength.
 */
export function sanitizeInput(input: string, maxLength: number = 5000): string {
  let sanitized = input

  // Remove zero-width and control characters
  sanitized = sanitized.replace(CONTROL_CHAR_PATTERN, "")

  // Strip prompt injection patterns (fresh regex per call to avoid lastIndex issues)
  for (const [source, flags] of INJECTION_PATTERN_SOURCES) {
    sanitized = sanitized.replace(new RegExp(source, flags), "")
  }

  // Escape XML-like tags that could break the delimiter system
  sanitized = sanitized
    .replace(/<user_input(\s|>)/gi, "&lt;user_input$1")
    .replace(/<\/user_input>/gi, "&lt;/user_input&gt;")
    .replace(/<system_instruction(\s|>)/gi, "&lt;system_instruction$1")
    .replace(/<\/system_instruction>/gi, "&lt;/system_instruction&gt;")

  // Truncate to maxLength
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}

export interface BuildSecurePromptOptions {
  maxLengths?: Record<string, number>
}

/** Escape regex metacharacters in a string for safe use in `new RegExp()`. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Replaces {{variableName}} placeholders with sanitized values wrapped in
 * <user_input name="key">value</user_input> XML delimiters.
 *
 * Throws if a placeholder has no matching variable.
 */
export function buildSecurePrompt(
  template: string,
  variables: Record<string, string>,
  options?: BuildSecurePromptOptions
): string {
  const maxLengths = options?.maxLengths ?? {}

  // Find all placeholders in the template
  const foundPlaceholders = new Set<string>()
  const scanPattern = /\{\{(\w+)\}\}/g
  let match: RegExpExecArray | null
  while ((match = scanPattern.exec(template)) !== null) {
    foundPlaceholders.add(match[1])
  }

  // Verify all placeholders have matching variables
  for (const placeholder of foundPlaceholders) {
    if (!(placeholder in variables)) {
      throw new Error(
        `Missing variable for placeholder "{{${placeholder}}}". ` +
          `Available variables: ${Object.keys(variables).join(", ")}`
      )
    }
  }

  // Replace each placeholder with sanitized, XML-delimited value
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const maxLen = maxLengths[key] ?? 5000
    const sanitized = sanitizeInput(value, maxLen)
    const wrapped = `<user_input name="${key}">${sanitized}</user_input>`
    result = result.replace(
      new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, "g"),
      wrapped
    )
  }

  return result
}
