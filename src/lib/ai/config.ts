// Anthropic (Claude) configuration — mirrors lib/maps/config.ts.

/**
 * Get the Anthropic API key used for washing machine photo recognition.
 * @returns the key, or null if not configured
 */
export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}
