/**
 * Metrics Tracking Utility
 *
 * Provides functions for tracking API request metrics without blocking API responses.
 * All tracking is asynchronous (fire-and-forget) to minimize performance impact.
 *
 * Usage:
 * ```typescript
 * import { trackAPIMetrics, MetricsTimer } from "@/lib/metrics-tracker"
 *
 * export async function POST(request: Request) {
 *   const timer = new MetricsTimer()
 *   let statusCode = 200
 *   let errorType, errorMessage
 *
 *   try {
 *     // ... API logic ...
 *   } catch (error) {
 *     statusCode = 500
 *     errorType = 'server_error'
 *     errorMessage = error.message
 *   } finally {
 *     trackAPIMetrics({
 *       endpoint: '/api/chat',
 *       method: 'POST',
 *       featureType: 'chat',
 *       userId: user.id,
 *       projectId,
 *       statusCode,
 *       responseTimeMs: timer.getElapsedMs(),
 *       creditsConsumed: 1,
 *       modelUsed: 'anthropic/claude-sonnet-4',
 *       aiSource: 'openrouter',
 *       errorType,
 *       errorMessage,
 *     })
 *   }
 * }
 * ```
 */

import { createServiceClient } from "@/lib/supabase/service"

/**
 * Feature types for categorizing API endpoints
 */
export type FeatureType =
  | "chat"
  | "prompt-chat"
  | "document-edit"
  | "analysis"
  | "app-generation"
  | "project-management"
  | "mockup"
  | "other"

/**
 * AI source providers
 */
export type AISource = "openrouter" | "anthropic" | "n8n" | "inhouse"

/**
 * Common error types for categorization
 */
export type ErrorType =
  | "unauthorized"
  | "insufficient_credits"
  | "validation_error"
  | "not_found"
  | "api_timeout"
  | "ai_model_error"
  | "server_error"
  | "unknown_error"

/**
 * Data structure for API metrics
 */
export interface MetricsData {
  /** Full API endpoint path (e.g., '/api/chat', '/api/analysis/prd') */
  endpoint: string

  /** HTTP method */
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

  /** High-level feature category */
  featureType: FeatureType

  /** User ID making the request */
  userId: string

  /** Project ID (if applicable) */
  projectId?: string | null

  /** HTTP status code (200, 402, 500, etc.) */
  statusCode: number

  /** API response time in milliseconds */
  responseTimeMs: number

  /** Number of credits consumed (0 for non-credit operations) */
  creditsConsumed?: number

  /** AI model used (e.g., 'anthropic/claude-sonnet-4') */
  modelUsed?: string

  /** AI service provider */
  aiSource?: AISource

  /** Error type (if error occurred) */
  errorType?: ErrorType | string

  /** Error message (if error occurred) */
  errorMessage?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Track API request metrics asynchronously (fire and forget)
 *
 * This function will not throw errors and will not block the API response.
 * Tracking failures are logged but do not affect the API operation.
 *
 * @param data - Metrics data to track
 */
export async function trackAPIMetrics(data: MetricsData): Promise<void> {
  // Run asynchronously without blocking the response
  Promise.resolve()
    .then(async () => {
      try {
        const supabase = createServiceClient()

        // Insert metrics record
        const { error } = await supabase.from("api_request_metrics").insert({
          user_id: data.userId,
          project_id: data.projectId || null,
          endpoint: data.endpoint,
          method: data.method,
          feature_type: data.featureType,
          response_time_ms: data.responseTimeMs,
          status_code: data.statusCode,
          credits_consumed: data.creditsConsumed || 0,
          model_used: data.modelUsed || null,
          ai_source: data.aiSource || null,
          error_type: data.errorType || null,
          error_message: data.errorMessage || null,
          metadata: data.metadata || {},
        })

        if (error) {
          // Log error but don't throw - metrics tracking should never break the app
          console.error("[MetricsTracker] Failed to track metrics:", error.message)
        }
      } catch (error) {
        // Catch any unexpected errors and log them
        console.error(
          "[MetricsTracker] Unexpected error tracking metrics:",
          error instanceof Error ? error.message : "Unknown error"
        )
      }
    })
    .catch((error) => {
      // Final catch to ensure tracking errors never escape
      console.error("[MetricsTracker] Promise rejection:", error)
    })
}

/**
 * Helper class to measure execution time
 *
 * Usage:
 * ```typescript
 * const timer = new MetricsTimer()
 * // ... do work ...
 * const elapsed = timer.getElapsedMs()  // Returns time in milliseconds
 * ```
 */
export class MetricsTimer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get elapsed time since timer creation in milliseconds
   * @returns Elapsed time in milliseconds
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime
  }

  /**
   * Get elapsed time since timer creation in seconds
   * @returns Elapsed time in seconds (rounded to 2 decimals)
   */
  getElapsedSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 10) / 100
  }

  /**
   * Reset the timer to the current time
   */
  reset(): void {
    this.startTime = Date.now()
  }
}

/**
 * Helper function to determine error type from status code
 *
 * @param statusCode - HTTP status code
 * @param error - Optional error object
 * @returns Categorized error type
 */
export function getErrorType(statusCode: number, error?: Error | unknown): ErrorType {
  if (statusCode >= 200 && statusCode < 300) {
    return "unknown_error" // Should not be called for success codes
  }

  if (statusCode === 401) return "unauthorized"
  if (statusCode === 402) return "insufficient_credits"
  if (statusCode === 404) return "not_found"
  if (statusCode === 400) return "validation_error"
  if (statusCode === 504 || statusCode === 408) return "api_timeout"

  // Check error message for specific error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("timeout")) return "api_timeout"
    if (message.includes("unauthorized") || message.includes("auth")) return "unauthorized"
    if (message.includes("credits")) return "insufficient_credits"
    if (message.includes("not found")) return "not_found"
    if (message.includes("validation")) return "validation_error"
    if (message.includes("model") || message.includes("ai")) return "ai_model_error"
  }

  return "server_error"
}

/**
 * Helper function to safely extract error message
 *
 * @param error - Error object or unknown type
 * @param maxLength - Maximum message length (default 500)
 * @returns Formatted error message
 */
export function getErrorMessage(error: Error | unknown, maxLength = 500): string {
  if (error instanceof Error) {
    return error.message.substring(0, maxLength)
  }

  if (typeof error === "string") {
    return error.substring(0, maxLength)
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message).substring(0, maxLength)
  }

  return "Unknown error"
}

/**
 * Helper to determine feature type from endpoint path
 *
 * @param endpoint - API endpoint path
 * @returns Feature type
 */
export function getFeatureTypeFromEndpoint(endpoint: string): FeatureType {
  if (endpoint.includes("/chat")) return "chat"
  if (endpoint.includes("/prompt-chat")) return "prompt-chat"
  if (endpoint.includes("/document-edit")) return "document-edit"
  if (endpoint.includes("/analysis")) return "analysis"
  if (endpoint.includes("/generate-app")) return "app-generation"
  if (endpoint.includes("/projects")) return "project-management"
  return "other"
}
