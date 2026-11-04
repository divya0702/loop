import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Field,
  Page,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from '../../components/ui'

interface MaterialRow {
  id: string
  title: string
  kind: string
  content: string
  created_at: string
}

export default function MaterialsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('note')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [targetRole, setTargetRole] = useState('')
  const [roleSaving, setRoleSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [mats, profile] = await Promise.all([
        supabase.from('materials').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('target_role').eq('id', user!.id).maybeSingle(),
      ])
      if (cancelled) return
      if (mats.data) setMaterials(mats.data as MaterialRow[])
      setTargetRole((profile.data?.target_role as string | undefined) ?? '')
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  async function saveRole() {
    if (!user) return
    setRoleSaving(true)
    await supabase.from('profiles').update({ target_role: targetRole }).eq('id', user.id)
    setRoleSaving(false)
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setContent(text.slice(0, 20000))
    if (!title.trim()) setTitle(file.name)
    e.target.value = ''
  }

  async function save() {
    if (!user || !content.trim()) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        title: title.trim() || 'Untitled',
        kind,
        content: content.slice(0, 20000),
      })
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setMaterials((prev) => [data as MaterialRow, ...(prev ?? [])])
    setTitle('')
    setContent('')
  }

  async function remove(id: string) {
    await supabase.from('materials').delete().eq('id', id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    setSelected((prev) => prev.filter((s) => s !== id))
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  if (loading) {
    return (
      <Page title="Materials">
        <Spinner />
      </Page>
    )
  }

  return (
    <Page
      title="Your materials"
      subtitle="Paste your notes and code, or upload files. Select items, then generate a plan from them."
      actions={
        <Button
          disabled={selected.length === 0}
          onClick={() => navigate(`/plan?ids=${selected.join(',')}`)}
        >
          Generate plan from {selected.length || ''} selected
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <Field label="Target role (tunes your track, plans and interviews)">
              <TextInput
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Backend Engineer, SDE-2"
              />
            </Field>
          </div>
          <Button variant="ghost" onClick={() => void saveRole()} disabled={roleSaving}>
            {roleSaving ? 'Saving…' : 'Save role'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Field label="Title">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System design notes, auth-service code"
            />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="note">Note</option>
              <option value="code">Code</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Content">
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste here, or upload a text file below."
              className="min-h-36 font-mono text-xs"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving || !content.trim()}>
            {saving ? 'Saving…' : 'Save material'}
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Upload file
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.markdown,.py,.js,.ts,.tsx,.java,.go,.rs,.sql,.json,.yaml,.yml"
            onChange={(e) => void onFile(e)}
          />
        </div>
        {error && (
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        )}
      </Card>

      {materials.length === 0 ? (
        <EmptyState message="Nothing saved yet. Add your first note or code sample above." />
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id}>
              <Card className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 accent-primary"
                  aria-label={`Select ${m.title}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{m.title}</span>
                    <Badge>{m.kind}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.content.length.toLocaleString()} chars ·{' '}
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
                <Button variant="danger" onClick={() => void remove(m.id)} className="px-2.5">
                  <Trash2 size={15} />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
