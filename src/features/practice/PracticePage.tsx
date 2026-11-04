import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { drillFeedback, drillQuestion } from '../../lib/coach'
import type { DrillFeedback, DrillQuestion } from '../../lib/coach'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  MuseBadge,
  Page,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from '../../components/ui'

const verdictStyle: Record<string, string> = {
  strong: 'bg-success/10 text-success border-success/30',
  ok: 'bg-accent text-accent-foreground border-primary/25',
  weak: 'bg-destructive/10 text-destructive border-destructive/30',
}

export default function PracticePage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [topic, setTopic] = useState(params.get('topic') ?? '')
  const [level, setLevel] = useState('mid')
  const [style, setStyle] = useState('technical')
  const [history, setHistory] = useState<string[]>([])
  const [q, setQ] = useState<DrillQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<DrillFeedback | null>(null)
  const [busyQ, setBusyQ] = useState(false)
  const [busyF, setBusyF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rounds, setRounds] = useState(0)

  async function newDrill() {
    if (!topic.trim()) {
      setError('Enter a topic first.')
      return
    }
    setBusyQ(true)
    setError(null)
    setFeedback(null)
    setAnswer('')
    try {
      const next = await drillQuestion(topic.trim(), level, history, style)
      setQ(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load a drill')
    }
    setBusyQ(false)
  }

  async function submit() {
    if (!user || !q || !answer.trim()) return
    setBusyF(true)
    setError(null)
    try {
      const fb = await drillFeedback(topic.trim(), q.question, answer.trim(), style)
      setFeedback(fb)
      setHistory((h) => [...h, q.question])
      setRounds((r) => r + 1)
      await supabase.from('sessions').insert({
        user_id: user.id,
        mode: 'drill',
        topic: topic.trim(),
        transcript: [
          { role: 'interviewer', text: q.question },
          { role: 'candidate', text: answer.trim() },
        ],
        score: { score: fb.score, verdict: fb.verdict, style },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback failed')
    }
    setBusyF(false)
  }

  return (
    <Page title="Topic drills" subtitle="One question at a time, scored with a model answer.">
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem_auto]">
          <Field label="Topic">
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Rate limiting, SQL joins, STAR stories"
            />
          </Field>
          <Field label="Skill">
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral (STAR)</option>
              <option value="leadership">Leadership</option>
            </Select>
          </Field>
          <Field label="Level">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="intern">Intern</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button onClick={() => void newDrill()} disabled={busyQ}>
              {busyQ ? 'Loading…' : q ? 'New drill' : 'Start drills'}
            </Button>
          </div>
        </div>
        {rounds > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {rounds} round{rounds > 1 ? 's' : ''} on this topic this session
          </p>
        )}
      </Card>

      {error && <ErrorBox message={error} />}
      {busyQ && <Spinner />}

      {q && !busyQ && (
        <Card>
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Question</h2>
          <p className="mt-1 leading-relaxed font-medium">{q.question}</p>
          {q.hints.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Need a hint?</summary>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {q.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </details>
          )}
          {!feedback && (
            <div className="mt-3">
              <TextArea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer. Explain your reasoning, not just the result."
                className="min-h-28"
              />
              <Button onClick={() => void submit()} disabled={busyF || !answer.trim()} className="mt-2">
                {busyF ? 'Scoring…' : 'Submit for feedback'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {busyF && <Spinner />}

      {feedback && !busyF && (
        <Card>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-bold ${verdictStyle[feedback.verdict] ?? verdictStyle.ok}`}
            >
              {feedback.score} / 5 · {feedback.verdict}
            </span>
            <MuseBadge />
            <Button variant="ghost" onClick={() => void newDrill()}>
              Next drill →
            </Button>
          </div>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Feedback</h3>
          <p className="mt-1 text-sm leading-relaxed">{feedback.feedback}</p>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Model answer</h3>
          <p className="mt-1 text-sm leading-relaxed">{feedback.modelAnswer}</p>
          {feedback.followUp && (
            <>
              <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Follow-up to consider</h3>
              <p className="mt-1 text-sm leading-relaxed">{feedback.followUp}</p>
            </>
          )}
        </Card>
      )}
    </Page>
  )
}
