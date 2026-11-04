import { supabase } from './supabaseClient'

export interface PlanTopic {
  name: string
  why: string
  drills: string[]
}

export interface PrepPlan {
  summary: string
  topics: PlanTopic[]
  schedule: string[]
  interviewFocus: string[]
}

export interface DrillQuestion {
  question: string
  hints: string[]
}

export interface DrillFeedback {
  verdict: 'strong' | 'ok' | 'weak'
  score: number
  feedback: string
  modelAnswer: string
  followUp: string
}

export interface ChatTurn {
  role: 'interviewer' | 'candidate'
  text: string
}

export interface InterviewScore {
  overall: number
  technical: number
  communication: number
  depth: number
  strengths: string[]
  improvements: string[]
  hireSignal: string
}

export interface PlanMaterial {
  title: string
  kind: string
  content: string
}

export interface MindmapNode {
  title: string
  points?: string[]
  children?: MindmapNode[]
}

export interface MindmapDoc {
  title: string
  summary: string
  children: MindmapNode[]
}

export interface FoundResource {
  title: string
  url: string
  description: string
  kind: string
}

export interface TraceStep {
  line: number
  code: string
  note: string
  state: Record<string, string>
}

export interface CodeTrace {
  summary: string
  steps: TraceStep[]
  gotchas: string[]
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) throw new Error(`${fn} failed: ${error.message}`)
  return data as T
}

export function generatePlan(materials: PlanMaterial[], targetRole: string, level: string) {
  return invoke<PrepPlan>('generate-plan', { materials, targetRole, level })
}

export function drillQuestion(topic: string, level: string, history: string[], style = 'technical') {
  return invoke<DrillQuestion>('coach', { action: 'drill-question', topic, level, history, style })
}

export function drillFeedback(topic: string, question: string, answer: string, style = 'technical') {
  return invoke<DrillFeedback>('coach', { action: 'drill-feedback', topic, question, answer, style })
}

export function interviewNext(role: string, focus: string, transcript: ChatTurn[]) {
  return invoke<{ question: string }>('coach', { action: 'interview-next', role, focus, transcript })
}

export function interviewScore(role: string, transcript: ChatTurn[]) {
  return invoke<InterviewScore>('coach', { action: 'interview-score', role, transcript })
}

export function generateMindmap(materials: PlanMaterial[], targetRole: string) {
  return invoke<MindmapDoc>('coach', { action: 'mindmap', materials, targetRole })
}

export function findResources(topic: string, targetRole: string, level: string) {
  return invoke<{ resources: FoundResource[] }>('coach', {
    action: 'find-resources',
    topic,
    targetRole,
    level,
  })
}

export function traceCode(code: string, language: string, input: string) {
  return invoke<CodeTrace>('coach', { action: 'trace-code', code, language, input })
}
