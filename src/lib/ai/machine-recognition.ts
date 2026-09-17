// Washing machine photo recognition (server-side only)
//
// Sends a photo to Claude and asks for the machine's brand/model, capacity,
// model year and visible condition as structured JSON. Used by the cleaner
// onboarding equipment step to pre-fill the form; the cleaner can edit or
// override every field. The photo is never stored.
//
// Never throws. Returns { status: 'unavailable' } when the API key is missing,
// the request fails, the model refuses or the output can't be parsed, and
// { status: 'no_machine' } when the photo doesn't show a washing machine.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { getAnthropicApiKey } from './config';
import type { CleanerMachineCondition } from '@/types/database';

const MODEL = 'claude-opus-5';
const REQUEST_TIMEOUT_MS = 30_000;

/** Longest side the client resizes to; anything larger is rejected server-side. */
export const MAX_IMAGE_BASE64_LENGTH = 900_000;

export type MachineImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface MachineImage {
  /** Raw base64 (no `data:` prefix). */
  data: string;
  mediaType: MachineImageMediaType;
}

/** What the form pre-fills. Every field is null when the photo doesn't show it. */
export interface MachineSuggestion {
  brandModel: string | null;
  capacityKg: number | null;
  year: number | null;
  condition: CleanerMachineCondition | null;
}

export type MachineRecognitionResult =
  | { status: 'ok'; suggestion: MachineSuggestion }
  | { status: 'no_machine' }
  | { status: 'unavailable' };

// Keep this schema flat and free of min/max constraints — structured outputs
// only support a JSON Schema subset; ranges are enforced in normalise() below.
const MachineSchema = z.object({
  is_washing_machine: z.boolean(),
  brand_model: z.string().nullable(),
  capacity_kg: z.number().int().nullable(),
  year: z.number().int().nullable(),
  condition: z.enum(['excellent', 'very_good', 'good', 'fair']).nullable(),
});

const SYSTEM_PROMPT = `You identify household washing machines from a single photo for a laundry platform's onboarding form.

Return:
- is_washing_machine: true only if the photo clearly shows a washing machine (front-loader or top-loader). A washer-dryer combo counts. A tumble dryer alone, a dishwasher, or an unrelated photo is false.
- brand_model: brand plus model name/series exactly as visible on the machine or badge, e.g. "Miele W1 WCD 120", "Bosch Serie 6", "Samsung WW90T". Brand only if the model isn't readable. null if no brand is visible.
- capacity_kg: the drum capacity in whole kilograms if printed on the machine or a label, or if it is well known for the identified model. Otherwise null. Never guess from size alone.
- year: the production/model year only if a rating plate, sticker or date is readable, or if the identified model was sold in a single known year. Otherwise null.
- condition: visible wear on the scale excellent (looks new), very_good (minimal wear), good (normal wear), fair (clearly visible wear, scratches, rust or discolouration). null if the machine is not visible enough to judge.

When is_washing_machine is false, set every other field to null. Prefer null over a guess.`;

const CONDITIONS: readonly CleanerMachineCondition[] = ['excellent', 'very_good', 'good', 'fair'];

/** Clamp the model's output to what the form and the DB accept. */
function normalise(raw: z.infer<typeof MachineSchema>): MachineSuggestion {
  const currentYear = new Date().getFullYear();

  const brandModel = raw.brand_model?.trim().slice(0, 100) || null; // cleaners.machine_brand max 100

  const capacityKg =
    raw.capacity_kg !== null && Number.isInteger(raw.capacity_kg) && raw.capacity_kg >= 1 && raw.capacity_kg <= 99
      ? raw.capacity_kg
      : null;

  const year =
    raw.year !== null && Number.isInteger(raw.year) && raw.year >= 1900 && raw.year <= currentYear
      ? raw.year
      : null;

  const condition =
    raw.condition !== null && CONDITIONS.includes(raw.condition) ? raw.condition : null;

  return { brandModel, capacityKg, year, condition };
}

/**
 * Ask Claude what washing machine is in the photo.
 *
 * Never throws — see the header comment for the degraded results.
 */
export async function recognizeWashingMachine(image: MachineImage): Promise<MachineRecognitionResult> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    console.warn('[MachineRecognition] ANTHROPIC_API_KEY not configured, skipping recognition');
    return { status: 'unavailable' };
  }

  if (!image.data || image.data.length > MAX_IMAGE_BASE64_LENGTH) {
    console.warn(`[MachineRecognition] Rejected image payload of ${image.data.length} chars`);
    return { status: 'unavailable' };
  }

  const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'medium', format: zodOutputFormat(MachineSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: image.mediaType, data: image.data },
            },
            { type: 'text', text: 'Identify the washing machine in this photo.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      console.warn(`[MachineRecognition] No usable result (stop_reason: ${response.stop_reason})`);
      return { status: 'unavailable' };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      console.warn('[MachineRecognition] Could not parse structured output');
      return { status: 'unavailable' };
    }

    if (!parsed.is_washing_machine) {
      return { status: 'no_machine' };
    }

    return { status: 'ok', suggestion: normalise(parsed) };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[MachineRecognition] API error ${error.status}:`, error.message);
    } else {
      console.error('[MachineRecognition] Request failed:', error);
    }
    return { status: 'unavailable' };
  }
}
