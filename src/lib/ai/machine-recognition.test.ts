import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const parse = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(status: number | undefined, error: unknown, message: string | undefined) {
      super(message);
      this.status = status;
    }
  }
  class Anthropic {
    static APIError = APIError;
    messages = { parse };
  }
  return { default: Anthropic };
});

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn(() => ({ type: 'json_schema', schema: {} })),
}));

import Anthropic from '@anthropic-ai/sdk';
import { recognizeWashingMachine } from './machine-recognition';

const IMAGE = { data: 'aGVsbG8=', mediaType: 'image/jpeg' as const };

const okResponse = (parsed_output: unknown, stop_reason = 'end_turn') => ({
  stop_reason,
  parsed_output,
  content: [],
});

describe('recognizeWashingMachine', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    parse.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('returns unavailable without calling the API when the key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'unavailable' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('returns unavailable without calling the API for an oversized payload', async () => {
    const result = await recognizeWashingMachine({ ...IMAGE, data: 'a'.repeat(900_001) });

    expect(result).toEqual({ status: 'unavailable' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('sends the image as a base64 block to claude-opus-5 and maps the suggestion', async () => {
    parse.mockResolvedValue(
      okResponse({
        is_washing_machine: true,
        brand_model: '  Miele W1 WCD 120  ',
        capacity_kg: 8,
        year: 2021,
        condition: 'very_good',
      })
    );

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({
      status: 'ok',
      suggestion: { brandModel: 'Miele W1 WCD 120', capacityKg: 8, year: 2021, condition: 'very_good' },
    });
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'aGVsbG8=' } },
              expect.objectContaining({ type: 'text' }),
            ],
          },
        ],
      })
    );
  });

  it('nulls out-of-range values instead of passing them to the form', async () => {
    const nextYear = new Date().getFullYear() + 1;
    parse.mockResolvedValue(
      okResponse({
        is_washing_machine: true,
        brand_model: '',
        capacity_kg: 0,
        year: nextYear,
        condition: null,
      })
    );

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({
      status: 'ok',
      suggestion: { brandModel: null, capacityKg: null, year: null, condition: null },
    });
  });

  it('caps the brand/model at 100 characters (cleaners.machine_brand)', async () => {
    parse.mockResolvedValue(
      okResponse({
        is_washing_machine: true,
        brand_model: 'B'.repeat(150),
        capacity_kg: null,
        year: null,
        condition: null,
      })
    );

    const result = await recognizeWashingMachine(IMAGE);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.suggestion.brandModel).toHaveLength(100);
    }
  });

  it('reports no_machine when the model says the photo is not a washing machine', async () => {
    parse.mockResolvedValue(
      okResponse({
        is_washing_machine: false,
        brand_model: null,
        capacity_kg: null,
        year: null,
        condition: null,
      })
    );

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'no_machine' });
  });

  it('returns unavailable on a refusal stop reason', async () => {
    parse.mockResolvedValue(okResponse(null, 'refusal'));

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'unavailable' });
  });

  it('returns unavailable when the structured output could not be parsed', async () => {
    parse.mockResolvedValue(okResponse(null));

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'unavailable' });
  });

  it('returns unavailable on an API error', async () => {
    parse.mockRejectedValue(new Anthropic.APIError(429, undefined, 'rate limited', undefined));

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'unavailable' });
    expect(console.error).toHaveBeenCalled();
  });

  it('returns unavailable when the request throws a non-API error', async () => {
    parse.mockRejectedValue(new Error('network down'));

    const result = await recognizeWashingMachine(IMAGE);

    expect(result).toEqual({ status: 'unavailable' });
  });
});
