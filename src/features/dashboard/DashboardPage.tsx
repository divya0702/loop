import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Map, MessagesSquare, Target } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { MODULE_META, trackForRole } from '../../lib/tracks'
import { useAuth } from '../auth/AuthProvider'
import { Card, EmptyState, Page, Spinner } from '../../components/ui'

interface SessionRow {
  id: string
  mode: string
  topic: string
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ materials: 0, plans: 0, sessions: 0 })
  const [recent, setRecent] = useState<SessionRow[]>([])
  const [targetRole, setTargetRole] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const [mats, plans, sess, sessionsCount, profile] = await Promise.all([
        supabase.from('materials').select('id', { count: 'exact', head: true }),
        supabase.from('plans').select('id', { count: 'exact', head: true }),
        supabase
          .from('sessions')
          .select('id, mode, topic, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('target_role').eq('id', user!.id).maybeSingle(),
      ])
      if (cancelled) return
      setCounts({
        materials: mats.count ?? 0,
        plans: plans.count ?? 0,
        sessions: sessionsCount.count ?? 0,
      })
      setRecent((sess.data as SessionRow[] | null) ?? [])
      setTargetRole((profile.data?.target_role as string | undefined) ?? '')
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <Page title="Dashboard">
        <Spinner />
      </Page>
    )
  }

  const track = trackForRole(targetRole)
  const cards = [
    { icon: FileUp, label: 'Materials', value: counts.materials, to: '/materials', hint: 'Notes & code' },
    { icon: Map, label: 'Prep plans', value: counts.plans, to: '/plan', hint: 'Generated plans' },
    { icon: MessagesSquare, label: 'Sessions', value: counts.sessions, to: '/practice', hint: 'Drills & interviews' },
  ]

  return (
    <Page
      title={targetRole ? `Preparing for ${targetRole}` : 'Dashboard'}
      subtitle="Your prep at a glance. Pick up where you left off."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="transition hover:border-primary/40">
              <div className="flex items-center gap-2 text-muted-foreground">
                <c.icon size={16} />
                <span className="text-sm">{c.label}</span>
              </div>
              <div className="mt-2 font-serif text-3xl font-medium">{c.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.hint} →</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="text-lg font-medium">Your track: {track.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{track.blurb}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {track.modules.map((m) => (
            <Link
              key={m}
              to={m}
              className="rounded-md border border-border px-3 py-2 transition hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="text-sm font-semibold">{MODULE_META[m]?.label ?? m}</span>
              <span className="block text-xs text-muted-foreground">{MODULE_META[m]?.blurb}</span>
            </Link>
          ))}
        </div>
        {!targetRole && (
          <p className="mt-3 text-xs text-muted-foreground">
            Set your target role on the <Link to="/materials" className="underline">Materials</Link> page
            to tune this track.
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <h2 className="text-lg font-medium">Recent sessions</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="No sessions yet. Add material, generate a plan, then run your first drill or mock interview." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                    {s.mode}
                  </span>
                  {s.topic || 'General'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}
