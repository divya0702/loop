import { useEffect, useState } from 'react'
import { Pause, Play, StepBack, StepForward } from 'lucide-react'
import { trackForRole } from '../../lib/tracks'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { traceCode } from '../../lib/coach'
import type { CodeTrace } from '../../lib/coach'
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

const EXAMPLE = `def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9], 7))`;

export default function VisualizerPage() {
  const { user } = useAuth()
  const [language, setLanguage] = useState('Python')
  const [code, setCode] = useState(EXAMPLE)
  const [input, setInput] = useState('')
  const [trace, setTrace] = useState<CodeTrace | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onTrack, setOnTrack] = useState(true)

  useEffect(() => {
    if (!user) return
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('target_role')
          .eq('id', user.id)
          .maybeSingle()
        const track = trackForRole((data?.target_role as string | undefined) ?? '')
        setOnTrack(track.modules.includes('/visualizer'))
      } catch {
        // track banner is best-effort
      }
    })()
  }, [user])

  useEffect(() => {
    if (!playing || !trace || stepIndex >= trace.steps.length - 1) {
      if (trace && stepIndex >= trace.steps.length - 1) setPlaying(false)
      return
    }
    const timer = setTimeout(() => setStepIndex((i) => i + 1), 900)
    return () => clearTimeout(timer)
  }, [playing, trace, stepIndex])

  async function run() {
    if (!code.trim()) {
      setError('Paste some code first.')
      return
    }
    setBusy(true)
    setError(null)
    setPlaying(false)
    try {
      const t = await traceCode(code.slice(0, 4000), language, input.slice(0, 500))
      setTrace(t)
      setStepIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tracing failed')
    }
    setBusy(false)
  }

  const step = trace?.steps[stepIndex]
  const lines = code.split('\n')
  const lastIndex = Math.max(0, (trace?.steps.length ?? 1) - 1)

  return (
    <Page
      title="Code visualizer"
      subtitle="Muse executes your code on paper: step through it line by line."
      actions={<MuseBadge label="Traced by Muse Spark" />}
    >
      {!onTrack && (
        <Card className="border-primary/30 bg-accent/50 text-sm">
          Your role track de-emphasizes coding rounds, but tracing is here whenever you want it.
        </Card>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
          <Field label="Language">
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>Python</option>
              <option>JavaScript</option>
              <option>TypeScript</option>
              <option>Java</option>
              <option>Go</option>
            </Select>
          </Field>
          <Field label="Program input (optional)">
            <TextInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="stdin, if the program reads any"
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={() => void run()} disabled={busy}>
              {busy ? 'Tracing…' : 'Trace execution'}
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <Field label="Code">
            <TextArea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-44 font-mono text-xs"
              spellCheck={false}
            />
          </Field>
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {busy && <Spinner />}

      {trace && !busy && step && (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setStepIndex(0)} disabled={stepIndex === 0} aria-label="First step">
                <StepBack size={15} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
              >
                Prev
              </Button>
              <Button variant="ghost" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStepIndex((i) => Math.min(lastIndex, i + 1))}
                disabled={stepIndex >= lastIndex}
              >
                Next
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStepIndex(lastIndex)}
                disabled={stepIndex >= lastIndex}
                aria-label="Last step"
              >
                <StepForward size={15} />
              </Button>
              <span className="ml-auto text-sm text-muted-foreground">
                Step {stepIndex + 1} of {trace.steps.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((stepIndex + 1) / trace.steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed">{step.note}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Code</h3>
              <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                {lines.map((ln, i) => (
                  <div
                    key={i}
                    className={i + 1 === step.line ? 'bg-accent font-bold text-accent-foreground' : ''}
                  >
                    <span className="mr-3 inline-block w-6 text-right text-muted-foreground select-none">
                      {i + 1}
                    </span>
                    {ln || ' '}
                  </div>
                ))}
              </pre>
            </Card>
            <Card>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Variables at this step
              </h3>
              {Object.keys(step.state).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracked variables on this line.</p>
              ) : (
                <table className="w-full border-collapse font-mono text-xs">
                  <tbody>
                    {Object.entries(step.state).map(([k, v]) => (
                      <tr key={k} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-3 font-bold whitespace-nowrap">{k}</td>
                        <td className="py-1.5 break-all">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {trace.gotchas.length > 0 && (
                <>
                  <h3 className="mt-4 mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Gotchas to remember
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 font-sans text-sm">
                    {trace.gotchas.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-medium">Summary</h3>
            <p className="mt-1 text-sm">{trace.summary}</p>
          </Card>
        </>
      )}
    </Page>
  )
}
