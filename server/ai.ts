import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";
export const MOCK_MODE = !process.env.ANTHROPIC_API_KEY?.trim();

/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]);

const client = MOCK_MODE ? null : new Anthropic();

/** An error safe to show to the client. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Pulls the first JSON object out of a model reply, tolerating stray code fences or prose. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SyntaxError("No JSON object found in model reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callModel(system: string, prompt: string): Promise<string> {
  if (!client) throw new AiError("AI client is not configured", 500);

  const useFallback = FALLBACK_MODELS.has(MODEL);
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: prompt }],
    ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });

  if (response.stop_reason === "refusal") {
    throw new AiError("The AI declined this request. Try rewording the business description.", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiError("The AI response was cut off. Please try again.", 502);
  }

  return response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}

/**
 * Calls the model and validates its JSON reply against `schema`.
 * Retries once on malformed or invalid JSON before giving up.
 */
export async function generateJson<T>(system: string, prompt: string, schema: ZodType<T>): Promise<T> {
  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote = attempt > 0 ? `\n\nYour previous reply was not valid (${lastIssue}). Reply again with only the JSON object.` : "";
    try {
      const text = await callModel(system, prompt + retryNote);
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastIssue = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
        .join("; ");
      console.warn(`[ai] schema validation failed (attempt ${attempt + 1}): ${lastIssue}`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        lastIssue = "it was not parseable JSON";
        console.warn(`[ai] JSON parse failed (attempt ${attempt + 1}): ${err.message}`);
        continue;
      }
      throw toAiError(err);
    }
  }
  throw new AiError("The AI returned an unexpected format. Please try again.", 502);
}

function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.", 500);
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new AiError(`Model "${MODEL}" was not found. Check ANTHROPIC_MODEL in .env.`, 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiError("The AI service is busy (rate limited). Wait a moment and try again.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AiError(`The AI request was rejected: ${err.message}`, 400);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiError("Could not reach the AI service. Check your internet connection.", 503);
  }
  if (err instanceof Anthropic.APIError) {
    return new AiError("The AI service returned an error. Please try again.", 502);
  }
  console.error("[ai] unexpected error", err);
  return new AiError("Something went wrong while generating. Please try again.", 500);
}
