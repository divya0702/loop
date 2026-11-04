import { useEffect, useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { findResources } from '../../lib/coach'
import type { FoundResource } from '../../lib/coach'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  MuseBadge,
  Page,
  Select,
  Spinner,
  TextInput,
} from '../../components/ui'

interface SavedResource extends FoundResource {
  id: string
  topic: string
  done: boolean
}

export default function ResourcesPage() {
  const { user } = useAuth()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('mid')
  const [role, setRole] = useState('')
  const [results, setResults] = useState<FoundResource[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedResource[]>([])
  const [missingTable, setMissingTable] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [profile, res] = await Promise.all([
        supabase.from('profiles').select('target_role').eq('id', user!.id).maybeSingle(),
        supabase.from('saved_resources').select('*').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setRole((profile.data?.target_role as string | undefined) ?? '')
      if (res.error) {
        if (res.error.message.includes('does not exist') || res.error.code === '42P01') {
          setMissingTable(true)
        }
      } else {
        setSaved((res.data as SavedResource[] | null) ?? [])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  async function find() {
    if (!topic.trim()) {
      setError('Enter a topic first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await findResources(topic.trim(), role || 'Software Engineer', level)
      setResults(r.resources ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resource search failed')
    }
    setBusy(false)
  }

  async function saveMany(items: FoundResource[]) {
    if (!user || items.length === 0) return
    const rows = items.map((r) => ({
      user_id: user.id,
      topic: topic.trim(),
      title: r.title,
      url: r.url,
      description: r.description,
      kind: r.kind,
    }))
    const { data, error: err } = await supabase.from('saved_resources').insert(rows).select()
    if (err) {
      setError(err.message)
      return
    }
    setSaved((prev) => [...((data as SavedResource[] | null) ?? []), ...prev])
    setResults((prev) => prev.filter((p) => !items.some((i) => i.url === p.url)))
  }

  async function toggleDone(id: string, done: boolean) {
    await supabase.from('saved_resources').update({ done }).eq('id', id)
    setSaved((prev) => prev.map((s) => (s.id === id ? { ...s, done } : s)))
  }

  async function removeSaved(id: string) {
    await supabase.from('saved_resources').delete().eq('id', id)
    setSaved((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Page
      title="Resources"
      subtitle="Muse finds well-known, genuinely useful reading for your gaps, and you keep what matters."
    >
      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <Field label="Topic">
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. System design, behavioral stories, SQL window functions"
            />
          </Field>
          <Field label="Level">
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="intern">Intern</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button onClick={() => void find()} disabled={busy}>
              {busy ? 'Searching…' : 'Find resources'}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tuned for {role || 'your role'} · free resources preferred · links checked against
          well-known sources.
        </p>
      </Card>

      {error && <ErrorBox message={error} />}
      {busy && <Spinner />}

      {results.length > 0 && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Suggestions</h2>
              <MuseBadge />
            </div>
            <Button variant="ghost" onClick={() => void saveMany(results)}>
              Save all
            </Button>
          </div>
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.url} className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary"
                  >
                    {r.title}
                    <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                  </a>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
                <Badge>{r.kind}</Badge>
                <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => void saveMany([r])}>
                  Save
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-medium">Your shelf ({saved.filter((s) => s.done).length}/{saved.length} done)</h2>
        {missingTable ? (
          <ErrorBox message="Run supabase/migrations/0002_saved_resources.sql in your Supabase SQL editor to enable the shelf." />
        ) : saved.length === 0 ? (
          <EmptyState message="Nothing saved yet. Find resources above and keep the ones worth your time." />
        ) : (
          <ul className="space-y-2.5">
            {saved.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) => void toggleDone(s.id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                  aria-label={`Mark ${s.title} done`}
                />
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary ${s.done ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {s.title}
                    <ExternalLink size={12} className="shrink-0 text-muted-foreground" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {s.topic && `${s.topic} · `}{s.description}
                  </p>
                </div>
                <Badge>{s.kind}</Badge>
                <Button variant="danger" onClick={() => void removeSaved(s.id)} className="px-2.5 py-1" aria-label={`Remove ${s.title}`}>
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}
