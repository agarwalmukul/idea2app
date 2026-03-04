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
  return buildSecurePrompt(
    DOCUMENT_EDIT_USER_TEMPLATE,
    { fullContent, selectedText, editPrompt },
    { maxLengths: { fullContent: 50000, selectedText: 10000, editPrompt: 2000 } }
  )
}
