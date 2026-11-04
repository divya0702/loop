// coach: the sparring engine behind drills and mock interviews.
// POST { action, ...params } where action is one of:
//   drill-question  { topic, level, history }       -> { question, hints }
//   drill-feedback  { topic, question, answer }     -> { verdict, score, feedback, modelAnswer, followUp }
//   interview-next  { role, focus, transcript }     -> { question }
//   interview-score { role, transcript }            -> InterviewScore

import { callMeta, corsHeaders, parseJSONLoose } from '../_shared/meta.ts'

interface ChatTurn {
  role: 'interviewer' | 'candidate'
  text: string
}

function formatTranscript(transcript: ChatTurn[]): string {
  return transcript
    .map((t) => `${t.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.text}`)
    .join('\n')
}

const DRILL_SYSTEMS: Record<string, string> = {
  technical:
    'You write sharp interview drill questions. One question per response, calibrated to the level. No preamble, no commentary.',
  behavioral:
    'You are a behavioral interviewer. Ask story-probing questions that demand STAR answers (Situation, Task, Action, Result): ownership, conflict, failure, ambiguity, influence without authority. One question per response, calibrated to the level.',
  leadership:
    'You are an executive interviewer probing judgment and communication: prioritization, stakeholder conflict, hiring, delivery under pressure, saying no. One scenario-style question per response, calibrated to the level.',
}

async function drillQuestion(topic: string, level: string, history: string[], style: string) {
  const text = await callMeta({
    system: DRILL_SYSTEMS[style] ?? DRILL_SYSTEMS.technical,
    user: `Topic: ${topic}\nLevel: ${level}\nAlready asked (do not repeat): ${JSON.stringify(history.slice(-10))}\n\nRespond with ONLY JSON: { "question": "...", "hints": ["hint 1", "hint 2"] }`,
    jsonMode: true,
    maxTokens: 4000,
  })
  return parseJSONLoose(text)
}

async function drillFeedback(topic: string, question: string, answer: string, style: string) {
  const rubric =
    style === 'behavioral'
      ? 'Grade on STAR structure (name which parts are present or missing), specificity, ownership language, and quantified outcomes. Vague stories earn low scores.'
      : style === 'leadership'
        ? 'Grade on judgment, ownership, stakeholder awareness, and clarity of communication. Reward concrete examples over abstractions.'
        : 'Grade on correctness, depth, and clarity. Never be sycophantic; a vague answer earns a low score.'
  const text = await callMeta({
    system: `You are a strict but fair interview coach grading a candidate answer. Be specific: quote or paraphrase what was good or missing. ${rubric}`,
    user: `Topic: ${topic}\nQuestion: ${question}\nCandidate answer: ${answer}\n\nRespond with ONLY JSON: { "verdict": "strong" | "ok" | "weak", "score": 1-5, "feedback": "2-4 sentences of specific feedback", "modelAnswer": "a concise strong answer", "followUp": "one probing follow-up question" }\n\nVerdict mapping: 5 or 4 -> strong, 3 -> ok, 2 or 1 -> weak.`,
    jsonMode: true,
    maxTokens: 5000,
  })
  return parseJSONLoose(text)
}

async function interviewNext(role: string, focus: string, transcript: ChatTurn[]) {
  const system = `You are a senior hiring manager running a real interview for a ${role} role (${focus} focus). Stay in character as the interviewer.

Rules:
- Ask exactly ONE question per response.
- Start at medium difficulty, then adapt: a strong answer earns a harder or deeper follow-up; a weak answer earns a probe of fundamentals.
- A brief acknowledgment of the previous answer is fine, but never lecture or reveal answers.
- Vary the angles; do not ask two questions about the same sub-topic in a row.`

  const user =
    transcript.length === 0
      ? 'The interview is starting. Ask the opening question. Respond with ONLY JSON: { "question": "..." }'
      : `Transcript so far:\n${formatTranscript(transcript)}\n\nAsk the next question. Respond with ONLY JSON: { "question": "..." }`

  const text = await callMeta({ system, user, jsonMode: true, maxTokens: 4000 })
  return parseJSONLoose(text)
}

async function interviewScore(role: string, transcript: ChatTurn[]) {
  const text = await callMeta({
    system:
      'You are a hiring-committee reviewer scoring a mock interview. Calibrate like a real loop: most candidates land 55-75 overall; reserve 85+ for exceptional performances. Be honest and specific.',
    user: `Role: ${role}\nTranscript:\n${formatTranscript(transcript)}\n\nRespond with ONLY JSON: { "overall": 0-100, "technical": 1-5, "communication": 1-5, "depth": 1-5, "strengths": ["...", "...", "..."], "improvements": ["specific actionable item", "...", "..."], "hireSignal": "Strong yes" | "Yes" | "Lean no" | "No" }`,
    jsonMode: true,
    maxTokens: 5000,
  })
  return parseJSONLoose(text)
}

async function mindmap(
  materials: Array<{ title: string; kind: string; content: string }>,
  targetRole: string,
) {
  const clipped = materials.slice(0, 6).map((m) => ({
    title: m.title,
    kind: m.kind,
    content: String(m.content ?? '').slice(0, 5000),
  }))
  const text = await callMeta({
    system:
      'You reorganize messy personal notes into a clean concept tree for interview prep. Merge duplicates ruthlessly: each concept appears ONCE even if several pages taught it. Favor the concepts that actually get asked in interviews.',
    user: `Target role: ${targetRole}\nMaterials:\n${JSON.stringify(clipped)}\n\nRespond with ONLY JSON: { "title": "mindmap title", "summary": "two sentences on what matters most", "children": [ { "title": "branch", "points": ["key fact 1", "up to 4"], "children": [ { "title": "...", "points": [...], "children": [...] } ] } ] }\n\n4-8 top branches, at most 3 levels deep. No markdown, JSON only.`,
    jsonMode: true,
    maxTokens: 6000,
  })
  return parseJSONLoose(text)
}

async function findResources(topic: string, targetRole: string, level: string) {
  const text = await callMeta({
    system:
      'You are a curator of interview-prep resources. Recommend ONLY resources you are confident really exist — official docs, well-known courses, famous articles and books, established newsletters and practice sites. Never invent URLs; when unsure of a deep link, use the publisher homepage.',
    user: `Topic: ${topic}\nRole: ${targetRole}\nLevel: ${level}\n\nRespond with ONLY JSON: { "resources": [ { "title": "...", "url": "https://...", "description": "one line on why this one", "kind": "article" | "video" | "course" | "docs" | "book" | "newsletter" | "practice" } ] }\n\n6-8 items, free preferred, a mix of kinds, ordered by value for THIS role and level.`,
    jsonMode: true,
    maxTokens: 5000,
  })
  return parseJSONLoose(text)
}

async function traceCode(code: string, language: string, input: string) {
  const text = await callMeta({
    system:
      'You are a precise code-tracing engine. Simulate execution exactly: track every variable, follow every branch. Line numbers must match the code given.',
    user: `Language: ${language}\nProgram input (stdin): ${input || '(none)'}\nCode:\n${code.slice(0, 4000)}\n\nSimulate execution. Respond with ONLY JSON: { "summary": "what the program does plus its final output", "steps": [ { "line": 1, "code": "exact line text", "note": "what happens on this line", "state": { "variable": "value" } } ], "gotchas": ["interview trap 1", "up to 3"] }\n\nAt most 25 steps; compress long loops (first, one middle, last iteration). State lists ALL live variables at each step.`,
    jsonMode: true,
    maxTokens: 6000,
  })
  return parseJSONLoose(text)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = (await req.json()) as Record<string, unknown>
    const action = body.action as string
    let result: unknown
    switch (action) {
      case 'drill-question':
        result = await drillQuestion(
          body.topic as string,
          (body.level as string) || 'mid',
          (body.history as string[]) ?? [],
          (body.style as string) || 'technical',
        )
        break
      case 'drill-feedback':
        result = await drillFeedback(
          body.topic as string,
          body.question as string,
          body.answer as string,
          (body.style as string) || 'technical',
        )
        break
      case 'mindmap':
        result = await mindmap(
          (body.materials as Array<{ title: string; kind: string; content: string }>) ?? [],
          (body.targetRole as string) || 'Software Engineer',
        )
        break
      case 'find-resources':
        result = await findResources(
          body.topic as string,
          (body.targetRole as string) || 'Software Engineer',
          (body.level as string) || 'mid',
        )
        break
      case 'trace-code':
        result = await traceCode(
          body.code as string,
          (body.language as string) || 'Python',
          (body.input as string) || '',
        )
        break
      case 'interview-next':
        result = await interviewNext(
          body.role as string,
          (body.focus as string) || 'Mixed',
          (body.transcript as ChatTurn[]) ?? [],
        )
        break
      case 'interview-score':
        result = await interviewScore(body.role as string, (body.transcript as ChatTurn[]) ?? [])
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    return Response.json(result, { headers: corsHeaders })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 400, headers: corsHeaders },
    )
  }
})
