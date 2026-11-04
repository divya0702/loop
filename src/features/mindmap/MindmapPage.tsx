import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import { generateMindmap } from '../../lib/coach'
import type { MindmapDoc, PlanMaterial } from '../../lib/coach'
import { InteractiveMindmap } from './InteractiveMindmap'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  MuseBadge,
  Page,
  Spinner,
} from '../../components/ui'

interface MaterialRow extends PlanMaterial {
  id: string
}

interface SavedMindmap {
  id: string
  title: string
  doc: MindmapDoc
  created_at: string
}

export default function MindmapPage() {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [targetRole, setTargetRole] = useState('')
  const [doc, setDoc] = useState<MindmapDoc | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMaps, setSavedMaps] = useState<SavedMindmap[]>([])
  const [missingTable, setMissingTable] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [mats, profile, maps] = await Promise.all([
        supabase.from('materials').select('id, title, kind, content').order('created_at', { ascending: false }),
        supabase.from('profiles').select('target_role').eq('id', user!.id).maybeSingle(),
        supabase.from('mindmaps').select('id, title, doc, created_at').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      const rows = (mats.data as MaterialRow[] | null) ?? []
      setMaterials(rows)
      setSelected(rows.map((r) => r.id))
      setTargetRole((profile.data?.target_role as string | undefined) ?? '')
      if (maps.error) {
        if (maps.error.message.includes('does not exist') || maps.error.code === '42P01') {
          setMissingTable(true)
        }
      } else {
        setSavedMaps((maps.data as SavedMindmap[] | null) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  async function persist(d: MindmapDoc) {
    if (!user || missingTable) return
    const { data, error: err } = await supabase
      .from('mindmaps')
      .insert({ user_id: user.id, title: d.title, doc: d })
      .select('id, title, doc, created_at')
      .single()
    if (err) return
    setSavedMaps((prev) => [data as SavedMindmap, ...prev])
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 4000)
  }

  async function run() {
    const chosen = materials.filter((m) => selected.includes(m.id))
    if (chosen.length === 0) {
      setError('Select at least one material.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const d = await generateMindmap(
        chosen.map((m) => ({ title: m.title, kind: m.kind, content: m.content })),
        targetRole || 'Software Engineer',
      )
      setDoc(d)
      // Auto-save the nodes to the account, like plans.
      await persist(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mindmap generation failed')
    }
    setBusy(false)
  }

  async function removeSaved(id: string) {
    await supabase.from('mindmaps').delete().eq('id', id)
    setSavedMaps((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) {
    return (
      <Page title="Mindmap">
        <Spinner />
      </Page>
    )
  }

  return (
    <Page
      title="Mindmap"
      subtitle="Your notes reorganized by subject, generated fresh, then saved to your account."
      actions={
        <Button onClick={() => void run()} disabled={busy || selected.length === 0}>
          {busy ? 'Generating…' : doc ? 'Regenerate (saves a copy)' : 'Generate mindmap'}
        </Button>
      }
    >
      {materials.length === 0 ? (
        <EmptyState message="Add notes or code on the Materials page first, since the mindmap is built from them." />
      ) : (
        <Card>
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => (
              <label
                key={m.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  selected.includes(m.id)
                    ? 'border-primary/40 bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="accent-primary"
                />
                {m.kind}: {m.title}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Badge>Muse organizes by concept</Badge>. The same idea appears once even if it was
            in five pages. Tuned for {targetRole || 'your role'}.
          </p>
          {savedFlash && (
            <p className="mt-2 text-sm text-success">Saved to your account. See Saved mindmaps below.</p>
          )}
        </Card>
      )}

      {missingTable && (
        <ErrorBox message="Run supabase/migrations/0003_mindmaps.sql in your Supabase SQL editor so mindmaps can be saved." />
      )}
      {error && <ErrorBox message={error} />}
      {busy && <Spinner />}

      {doc && !busy && (
        <>
          <div className="flex flex-wrap items-center gap-2 px-1">
            <h2 className="text-xl font-medium">{doc.title}</h2>
            <MuseBadge />
          </div>
          <InteractiveMindmap key={doc.title} doc={doc} />
        </>
      )}

      {savedMaps.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-medium">Saved mindmaps</h2>
          <ul className="divide-y divide-border text-sm">
            {savedMaps.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <button onClick={() => setDoc(s.doc)} className="flex-1 truncate text-left font-semibold hover:text-primary">
                  {s.title}
                </button>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()}
                </span>
                <Button variant="danger" onClick={() => void removeSaved(s.id)} className="px-2.5 py-1" aria-label={`Delete ${s.title}`}>
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  )
}
