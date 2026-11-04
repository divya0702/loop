import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronsDownUp, ChevronsUpDown, Maximize, Minus, Plus, Search } from 'lucide-react'
import type { MindmapDoc, MindmapNode } from '../../lib/coach'
import { Button, Card, TextInput } from '../../components/ui'

/**
 * A spatial mindmap: labels on a canvas, prose in a reader pane.
 *
 * Data comes from Muse (a title tree with recall points per node); this file owns
 * layout and interaction only, a left-to-right tidy tree at real pixel sizes,
 * laid out wider rather than shrunk to fit, so labels stay readable. Expand and
 * collapse at any level (alt-click opens or closes a whole branch), search jumps
 * to a concept, and the reader explains the selected node and links the next action.
 */

const ROW = 32
const CHAR_W = 7.1
const PAD_X = 20
const PAD_Y = 16

interface Placed {
  id: string
  node: MindmapNode
  depth: number
  x: number
  y: number
  parentId: string | null
  hasChildren: boolean
  hiddenCount: number
  w: number
}

function buildIds(children: MindmapNode[], prefix = ''): Array<{ id: string; node: MindmapNode; parent: string | null }> {
  const out: Array<{ id: string; node: MindmapNode; parent: string | null }> = []
  children.forEach((node, i) => {
    const id = prefix === '' ? String(i) : `${prefix}.${i}`
    out.push({ id, node, parent: prefix === '' ? null : prefix })
    if (node.children?.length) out.push(...buildIds(node.children, id))
  })
  return out
}

function countDesc(node: MindmapNode): number {
  if (!node.children?.length) return 0
  return node.children.reduce((sum, c) => sum + 1 + countDesc(c), 0)
}

function ancestorsOf(id: string): string[] {
  const parts = id.split('.')
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join('.'))
  return out
}

function subtreeIds(node: MindmapNode, id: string): string[] {
  const out = [id]
  node.children?.forEach((c, i) => out.push(...subtreeIds(c, `${id}.${i}`)))
  return out
}

function branchColor(depth: number, branchIndex: number): string {
  const palette = ['#873b60', '#3e7a52', '#9a6a2f', '#4a6fa5', '#7a4a8c', '#2f7a7a', '#8c3b3b', '#5a6e2f']
  if (depth === 0) return 'var(--foreground)'
  return palette[branchIndex % palette.length]
}

function layout(children: MindmapNode[], expanded: Set<string>): { placed: Placed[]; width: number; height: number } {
  const placed: Placed[] = []
  const widest: number[] = []
  let row = 0

  function walk(node: MindmapNode, id: string, depth: number, parentId: string | null): number {
    const hasChildren = !!node.children?.length
    const open = expanded.has(id)
    const labelW = node.title.length * CHAR_W + (hasChildren && !open ? 44 : 16)
    widest[depth] = Math.max(widest[depth] ?? 0, labelW)

    if (!hasChildren || !open) {
      const y = row * ROW + PAD_Y
      row += 1
      placed.push({ id, node, depth, x: 0, y, parentId, hasChildren, hiddenCount: hasChildren ? countDesc(node) : 0, w: node.title.length * CHAR_W + 16 })
      return y
    }
    const firstY = walkChildren(node, id, depth)
    const lastChildY = placed[placed.length - 1].y
    const midY = Math.round((firstY + lastChildY) / 2)
    placed.push({ id, node, depth, x: 0, y: midY, parentId, hasChildren, hiddenCount: 0, w: node.title.length * CHAR_W + 16 })
    return midY
  }

  function walkChildren(node: MindmapNode, id: string, depth: number): number {
    let first = -1
    node.children!.forEach((child, i) => {
      const y = walk(child, `${id}.${i}`, depth + 1, id)
      if (first < 0) first = y
    })
    return first
  }

  children.forEach((node, i) => walk(node, String(i), 0, null))

  const offsets: number[] = [PAD_X]
  for (let d = 0; ; d++) {
    if (widest[d] === undefined && widest[d + 1] === undefined) break
    offsets.push((offsets[d] ?? PAD_X) + Math.min(320, Math.max(150, (widest[d] ?? 160) + 56)))
  }
  for (const p of placed) p.x = offsets[p.depth]
  const width = (offsets[offsets.length - 1] ?? PAD_X) + (widest[widest.length - 1] ?? 160) + PAD_X * 2
  const height = Math.max(ROW, row * ROW) + PAD_Y * 2
  return { placed, width, height }
}

function elbow(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`
}

export function InteractiveMindmap({ doc }: { doc: MindmapDoc }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(doc.children.slice(0, 2).map((_, i) => String(i))))
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState({ x: 24, y: 12, k: 1 })
  const [search, setSearch] = useState('')
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null)

  const flat = useMemo(() => buildIds(doc.children), [doc])
  const byId = useMemo(() => new Map(flat.map((f) => [f.id, f.node])), [flat])
  const parentOf = useMemo(() => new Map(flat.map((f) => [f.id, f.parent])), [flat])
  const { placed, width, height } = useMemo(() => layout(doc.children, expanded), [doc, expanded])
  const placedById = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed])

  const selectedNode: MindmapNode | null = selected ? (byId.get(selected) ?? null) : null
  const breadcrumb = selected
    ? [...ancestorsOf(selected).map((a) => byId.get(a)?.title).filter(Boolean) as string[]]
    : []

  function toggleBranch(id: string, openAll: boolean, wholeSubtree: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev)
      const node = byId.get(id)
      if (!node) return next
      const ids = wholeSubtree ? subtreeIds(node, id) : [id]
      for (const target of ids) {
        if (openAll) next.add(target)
        else next.delete(target)
      }
      return next
    })
  }

  function jumpTo(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const a of ancestorsOf(id)) next.add(a)
      next.add(id)
      return next
    })
    setSelected(id)
    const p = placedById.get(id)
    const frame = frameRef.current
    if (p && frame) {
      const fx = frame.clientWidth * 0.35 - p.x * view.k
      const fy = frame.clientHeight / 2 - p.y * view.k
      setView((v) => ({ ...v, x: fx, y: fy }))
    }
  }

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return flat.filter((f) => f.node.title.toLowerCase().includes(q)).slice(0, 8)
  }, [search, flat])

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a, input')) return
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    setView((v) => ({ ...v, x: drag.current!.vx + (e.clientX - drag.current!.sx), y: drag.current!.vy + (e.clientY - drag.current!.sy) }))
  }
  function onPointerUp() {
    drag.current = null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concepts…"
              className="pl-8"
              aria-label="Search concepts"
            />
          </div>
          <Button variant="ghost" className="px-2" onClick={() => setExpanded(new Set(flat.filter((f) => f.node.children?.length).map((f) => f.id)))}>
            <ChevronsUpDown size={14} className="mr-1" /> All
          </Button>
          <Button variant="ghost" className="px-2" onClick={() => setExpanded(new Set())}>
            <ChevronsDownUp size={14} className="mr-1" /> Top
          </Button>
          <Button variant="ghost" className="px-2" onClick={() => setView((v) => ({ ...v, k: Math.min(1.6, v.k + 0.15) }))} aria-label="Zoom in">
            <Plus size={14} />
          </Button>
          <Button variant="ghost" className="px-2" onClick={() => setView((v) => ({ ...v, k: Math.max(0.5, v.k - 0.15) }))} aria-label="Zoom out">
            <Minus size={14} />
          </Button>
          <Button variant="ghost" className="px-2" onClick={() => setView({ x: 24, y: 12, k: 1 })} aria-label="Reset view">
            <Maximize size={14} />
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(r.id)}
                  className="rounded-full border border-primary/40 bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                >
                  {r.node.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          ref={frameRef}
          className="relative h-[480px] cursor-grab overflow-hidden rounded-lg border border-border bg-background select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
          >
            <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
              {placed.map((p) => {
                if (!p.parentId) return null
                const parent = placedById.get(p.parentId)
                if (!parent) return null
                const branchIndex = Number(p.id.split('.')[0])
                return (
                  <path
                    key={p.id}
                    d={elbow(parent.x + parent.w + 8, parent.y + 6, p.x, p.y + 6)}
                    fill="none"
                    stroke={branchColor(1, branchIndex)}
                    strokeOpacity={0.45}
                    strokeWidth={1.5}
                  />
                )
              })}
            </svg>
            {placed.map((p) => {
              const branchIndex = Number(p.id.split('.')[0])
              const isSel = selected === p.id
              const open = expanded.has(p.id)
              return (
                <div key={p.id} className="absolute flex items-center gap-1" style={{ left: p.x, top: p.y - 4 }}>
                  {p.hasChildren && (
                    <button
                      type="button"
                      aria-label={open ? `Collapse ${p.node.title}` : `Expand ${p.node.title}`}
                      aria-expanded={open}
                      title="Click to toggle · Alt-click toggles the whole branch"
                      onClick={(e) => {
                        setSelected(p.id)
                        toggleBranch(p.id, !open, e.altKey)
                      }}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      {open ? '−' : '+'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (e.altKey && p.hasChildren) toggleBranch(p.id, !open, true)
                      setSelected(p.id)
                    }}
                    className={`whitespace-nowrap transition-colors ${isSel ? 'font-bold text-primary' : 'font-medium'} ${p.depth === 0 ? 'text-[15px]' : 'text-[13px]'}`}
                    style={{ color: isSel ? undefined : branchColor(p.depth, branchIndex) }}
                  >
                    {p.node.title}
                    {p.hasChildren && !open && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
                        +{p.hiddenCount}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted-foreground">
            Click a concept to read it · drag to pan · +/− to zoom
          </p>
        </div>
      </Card>

      <Card className="h-fit lg:sticky lg:top-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reader</p>
        {!selectedNode ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {doc.summary} Pick any concept on the map to see its key points and drill it.
          </p>
        ) : (
          <>
            {breadcrumb.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">{breadcrumb.join(' › ')}</p>
            )}
            <h3 className="mt-1 text-lg leading-snug font-medium">{selectedNode.title}</h3>
            {selectedNode.points?.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                {selectedNode.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No detail points yet, open the branch or drill it for depth.</p>
            )}
            {selectedNode.children?.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {selectedNode.children.length} sub-concept{selectedNode.children.length === 1 ? '' : 's'} inside
              </p>
            ) : null}
            <Link to={`/practice?topic=${encodeURIComponent(selectedNode.title)}`}>
              <Button className="mt-4 w-full">Drill this concept →</Button>
            </Link>
            <Link to="/resources">
              <Button variant="ghost" className="mt-2 w-full">
                Find reading for this
              </Button>
            </Link>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Parent: {selected && parentOf.get(selected) ? (byId.get(parentOf.get(selected)!)?.title ?? 'top level') : 'top level'} · from your material
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
