import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { generatePlan } from '../../lib/coach'
import type { PlanMaterial, PrepPlan } from '../../lib/coach'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Page,
  Select,
  Spinner,
  MuseBadge,
} from '../../components/ui'

interface SavedPlan {
  id: string
  title: string
  plan: PrepPlan
  created_at: string
}

export default function PlanPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
  const [materials, setMaterials] = useState<PlanMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [targetRole, setTargetRole] = useState('')
  const [level, setLevel] = useState('mid')
  const [plan, setPlan] = useState<PrepPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedPlan[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [mats, profile, plans] = await Promise.all([
        ids.length > 0
          ? supabase.from('materials').select('title, kind, content').in('id', ids)
          : Promise.resolve({ data: [] as PlanMaterial[] }),
        supabase.from('profiles').select('target_role').eq('id', user!.id).maybeSingle(),
        supabase.from('plans').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      if (cancelled) return
      setMaterials((mats.data as PlanMaterial[] | null) ?? [])
      setTargetRole((profile.data?.target_role as string | undefined) ?? '')
      setSaved((plans.data as SavedPlan[] | null) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function run() {
    setBusy(true)
    setError(null)
    setSavedNote(false)
    try {
      const p = await generatePlan(materials, targetRole || 'Software Engineer', level)
      setPlan(p)
      // Auto-save to the account immediately, so there is no manual Save step to forget.
      await savePlanRow(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plan generation failed')
    }
    setBusy(false)
  }

  async function savePlanRow(planToSave: PrepPlan) {
    if (!user) return
    setSaving(true)
    const { data, error: err } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        title: `${targetRole || 'Interview'} prep plan`,
        plan: planToSave,
      })
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved((prev) => [data as SavedPlan, ...prev].slice(0, 5))
    setSavedNote(true)
  }

  if (loading) {
    return (
      <Page title="Prep plan">
        <Spinner />
      </Page>
    )
  }

  return (
    <Page
      title="Prep plan"
      subtitle={
        materials.length > 0
          ? `Built from ${materials.length} selected material${materials.length > 1 ? 's' : ''}.`
          : 'Select materials first, then generate a plan from them.'
      }
      actions={
        materials.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level">
              <option value="intern">Intern / new grad</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior / staff</option>
            </Select>
            <Button onClick={() => void run()} disabled={busy}>
              {busy ? 'Generating…' : plan ? 'Regenerate' : 'Generate plan'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {materials.length === 0 ? (
        <EmptyState message="No materials selected. Go to Materials, add notes or code, select them, and generate a plan." />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {materials.map((m) => (
            <Badge key={m.title}>
              {m.kind}: {m.title}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            Target role: {targetRole || 'Software Engineer'} (
            <Link to="/materials" className="underline">
              change
            </Link>
            )
          </span>
        </div>
      )}

      {error && <ErrorBox message={error} />}
      {busy && <Spinner />}

      {plan && !busy && (
        <>
          <Card>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Summary</h2>
              <MuseBadge />
            </div>
            <p className="mt-1 text-sm leading-relaxed">{plan.summary}</p>
            <p className="mt-4 text-sm text-success">
              {saving
                ? 'Saving to your account…'
                : savedNote
                  ? 'Saved to your account. Find it anytime under Saved plans below.'
                  : ''}
            </p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {plan.topics.map((t) => (
              <Card key={t.name}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-medium">{t.name}</h3>
                  <Link to={`/practice?topic=${encodeURIComponent(t.name)}`}>
                    <Button variant="ghost" className="px-2.5 py-1 text-xs">
                      Drill →
                    </Button>
                  </Link>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t.why}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {t.drills.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="text-lg font-medium">Day-by-day run-up</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {plan.schedule.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </Card>
            <Card>
              <h3 className="text-lg font-medium">Interview focus</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.interviewFocus.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <Link to="/interview">
                <Button className="mt-4">Start mock interview →</Button>
              </Link>
            </Card>
          </div>
        </>
      )}

      {saved.length > 0 && (
        <Card>
          <h3 className="mb-2 text-lg font-medium">Saved plans</h3>
          <div className="space-y-2">
            {saved.map((s) => (
              <details key={s.id} className="rounded-md border border-border p-3 text-sm">
                <summary className="cursor-pointer font-semibold">
                  {s.title} · {new Date(s.created_at).toLocaleString()}
                </summary>
                <p className="mt-2">{s.plan.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.plan.topics.map((t) => (
                    <Link
                      key={t.name}
                      to={`/practice?topic=${encodeURIComponent(t.name)}`}
                      className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary/50"
                    >
                      Drill: {t.name}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}
    </Page>
  )
}
