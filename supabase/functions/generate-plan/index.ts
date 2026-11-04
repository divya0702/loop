// generate-plan: turns a candidate's own materials into a role-specific prep plan.
// POST { materials: [{title, kind, content}], targetRole, level } -> PrepPlan JSON

import { callMeta, corsHeaders, parseJSONLoose } from '../_shared/meta.ts'

interface PlanMaterial {
  title: string
  kind: string
  content: string
}

const SYSTEM = `You are Loop's expert interview coach, a senior hiring manager who has run hundreds of interview loops. Build a focused, realistic prep plan from the candidate's own materials.

Rules:
- Ground every topic in the materials provided. Be specific: name concrete sub-skills, not platitudes.
- Each drill must be actionable in one sitting (under 30 minutes).
- The schedule assumes about 90 minutes of prep per day.
- Calibrate difficulty to the candidate's level.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { materials, targetRole, level } = (await req.json()) as {
      materials: PlanMaterial[]
      targetRole: string
      level: string
    }
    if (!materials?.length) throw new Error('No materials provided')

    const clipped = materials.slice(0, 6).map((m) => ({
      title: m.title,
      kind: m.kind,
      content: String(m.content ?? '').slice(0, 6000),
    }))

    const user = `Target role: ${targetRole || 'Software Engineer'}
Level: ${level || 'mid'}

Candidate materials:
${JSON.stringify(clipped)}

Respond with ONLY a JSON object of exactly this shape:
{
  "summary": "2-3 sentence assessment of readiness plus the overall strategy",
  "topics": [
    { "name": "topic name", "why": "one sentence on why it matters for THIS role", "drills": ["drill 1", "drill 2", "drill 3"] }
  ],
  "schedule": ["Day 1: ...", "Day 2: ...", "Day 3: ...", "Day 4: ...", "Day 5: ..."],
  "interviewFocus": ["likely interview angle 1", "likely interview angle 2", "likely interview angle 3"]
}

4-6 topics. No markdown, no commentary, JSON only.`

    const text = await callMeta({ system: SYSTEM, user, jsonMode: true, maxTokens: 8000 })
    const plan = parseJSONLoose(text)
    return Response.json(plan, { headers: corsHeaders })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 400, headers: corsHeaders },
    )
  }
})
