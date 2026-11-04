import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { interviewNext, interviewScore } from '../../lib/coach'
import type { ChatTurn, InterviewScore } from '../../lib/coach'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Page,
  Select,
  Spinner,
  TextArea,
  TextInput,
  MuseBadge,
} from '../../components/ui'

type Phase = 'setup' | 'live' | 'scored'

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function InterviewPage() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('setup')
  const [role, setRole] = useState('')
  const [focus, setFocus] = useState('Mixed')
  const [transcript, setTranscript] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [score, setScore] = useState<InterviewScore | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('target_role')
          .eq('id', user.id)
          .maybeSingle()
        if (data?.target_role) setRole(data.target_role as string)
      } catch {
        // role prefill is best-effort
      }
    })()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const candidateTurns = transcript.filter((t) => t.role === 'candidate').length

  async function start() {
    if (!role.trim()) {
      setError('Enter the role you are interviewing for.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const first = await interviewNext(role.trim(), focus, [])
      setTranscript([{ role: 'interviewer', text: first.question }])
      setPhase('live')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start the interview')
    }
    setBusy(false)
  }

  async function send() {
    if (!input.trim() || busy) return
    const next: ChatTurn[] = [...transcript, { role: 'candidate' as const, text: input.trim() }]
    setTranscript(next)
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const reply = await interviewNext(role.trim(), focus, next)
      setTranscript([...next, { role: 'interviewer', text: reply.question }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The interviewer went quiet. Try again.')
    }
    setBusy(false)
  }

  async function finish() {
    if (!user || candidateTurns === 0) return
    setBusy(true)
    setError(null)
    try {
      const s = await interviewScore(role.trim(), transcript)
      setScore(s)
      setPhase('scored')
      await supabase.from('sessions').insert({
        user_id: user.id,
        mode: 'interview',
        topic: `${role.trim()} · ${focus}`,
        transcript,
        score: s,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed')
    }
    setBusy(false)
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const SR = getSpeechRecognition()
    if (!SR) {
      setError('Voice input needs Chrome or Edge. Typing works everywhere.')
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript
      if (t) setInput((prev) => (prev ? `${prev} ${t}` : t))
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function reset() {
    setPhase('setup')
    setTranscript([])
    setScore(null)
    setInput('')
    setError(null)
  }

  return (
    <Page title="Mock interview" subtitle="An adaptive interviewer, then a full scorecard.">
      {phase === 'setup' && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <Field label="Role you are interviewing for">
              <TextInput
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend Engineer, SDE-2"
              />
            </Field>
            <Field label="Focus">
              <Select value={focus} onChange={(e) => setFocus(e.target.value)}>
                <option>Mixed</option>
                <option>Technical</option>
                <option>Behavioral</option>
                <option>System design</option>
              </Select>
            </Field>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Answer like the real thing, think out loud. Aim for 4–6 exchanges, then end for
            your scorecard.
          </p>
          <Button onClick={() => void start()} disabled={busy} className="mt-3">
            {busy ? 'Starting…' : 'Start interview'}
          </Button>
          {error && (
            <div className="mt-3">
              <ErrorBox message={error} />
            </div>
          )}
        </Card>
      )}

      {phase !== 'setup' && (
        <Card>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {role} · {focus}
            </span>
            <span className="text-muted-foreground">{candidateTurns} answer{candidateTurns === 1 ? '' : 's'}</span>
          </div>
          <div className="chat-scroll max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  t.role === 'interviewer' ? 'bg-muted' : 'ml-auto bg-accent text-accent-foreground'
                }`}
              >
                <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {t.role === 'interviewer' ? 'Interviewer' : 'You'}
                </span>
                {t.text}
              </div>
            ))}
            {busy && phase === 'live' && (
              <p className="text-sm text-muted-foreground">Interviewer is thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>

          {phase === 'live' && (
            <div className="mt-3">
              <div className="flex gap-2">
                <TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Your answer… (Enter to send, Shift+Enter for a new line)"
                  className="min-h-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={toggleMic}
                  title="Voice input (Chrome/Edge)"
                  className={listening ? 'border-destructive/50 text-destructive' : ''}
                >
                  <Mic size={16} />
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                <Button onClick={() => void send()} disabled={busy || !input.trim()}>
                  Send
                </Button>
                <Button variant="ghost" onClick={() => void finish()} disabled={busy || candidateTurns === 0}>
                  End & score me
                </Button>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-3">
              <ErrorBox message={error} />
            </div>
          )}
        </Card>
      )}

      {busy && phase !== 'live' && <Spinner />}

      {phase === 'scored' && score && (
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-serif text-4xl font-medium text-primary">{score.overall}</div>
            <div>
              <div className="flex items-center gap-2">
                <div className="font-bold">Overall score</div>
                <MuseBadge />
              </div>
              <div className="text-sm text-muted-foreground">Signal: {score.hireSignal}</div>
            </div>
            <div className="flex gap-4 text-sm">
              <span>Technical <b>{score.technical}/5</b></span>
              <span>Communication <b>{score.communication}/5</b></span>
              <span>Depth <b>{score.depth}/5</b></span>
            </div>
            <Button variant="ghost" onClick={reset} className="ml-auto">
              New interview
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Strengths</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {score.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Work on</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {score.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </Page>
  )
}
