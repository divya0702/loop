// Shared Meta Model API client for Loop edge functions.
// The API is OpenAI-compatible: POST {base}/chat/completions with a Bearer key.
//
// Secrets (supabase secrets set):
//   MODEL_API_KEY  required — your Meta Model API key
//   META_MODEL     optional — defaults to muse-spark-1.3
//   META_API_BASE  optional — defaults to https://api.meta.ai/v1

export interface MetaCallOptions {
  system?: string
  user: string
  jsonMode?: boolean
  maxTokens?: number
}

const BASE = Deno.env.get('META_API_BASE') ?? 'https://api.meta.ai/v1'
const MODEL = Deno.env.get('META_MODEL') ?? 'muse-spark-1.3'
const TIMEOUT_MS = 45_000

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function withTimeout(promise: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Meta Model API request timed out')), ms),
    ),
  ])
}

export async function callMeta(opts: MetaCallOptions): Promise<string> {
  const apiKey = Deno.env.get('MODEL_API_KEY')
  if (!apiKey) throw new Error('MODEL_API_KEY is not configured on this function')

  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.user },
  ]

  const res = await withTimeout(
    fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: opts.maxTokens ?? 4000,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    }),
    TIMEOUT_MS,
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Meta Model API error ${res.status}: ${errText.slice(0, 400)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  // Content is usually a string, but some models return an array of text blocks.
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .map((block) => (block && typeof block.text === 'string' ? block.text : ''))
            .join('')
        : ''
  if (!text) {
    const choice = data?.choices?.[0]
    const refusal = choice?.message?.refusal
    const finish = choice?.finish_reason
    const raw = JSON.stringify(data ?? null).slice(0, 500)
    throw new Error(
      `Meta Model API returned no text${finish ? ` (finish_reason: ${finish})` : ''}${refusal ? ` (refusal: ${refusal})` : ''}. Raw: ${raw}`,
    )
  }
  return text
}

/** Parses model output as JSON, tolerating fences and stray commentary. */
export function parseJSONLoose<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fence) {
      try {
        return JSON.parse(fence[1]) as T
      } catch {
        // fall through
      }
    }
    const obj = text.match(/\{[\s\S]*\}/)
    if (obj) {
      try {
        return JSON.parse(obj[0]) as T
      } catch {
        // fall through
      }
    }
    throw new Error('Could not parse model response as JSON')
  }
}
