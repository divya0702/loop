import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileUp,
  Map,
  Dumbbell,
  Code2,
  MessagesSquare,
  Network,
  LibraryBig,
  Repeat,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/materials', label: 'Materials', icon: FileUp, end: false },
  { to: '/plan', label: 'Plan', icon: Map, end: false },
  { to: '/practice', label: 'Drills', icon: Dumbbell, end: false },
  { to: '/interview', label: 'Mock Interview', icon: MessagesSquare, end: false },
  { to: '/mindmap', label: 'Mindmap', icon: Network, end: false },
  { to: '/visualizer', label: 'Visualizer', icon: Code2, end: false },
  { to: '/resources', label: 'Resources', icon: LibraryBig, end: false },
] as const

const STORAGE_KEY = 'loop:sidebar-collapsed'

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* private window or blocked storage; stay expanded */
    }
  }, [])

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* preference just won't survive a reload */
      }
      return next
    })

  return [collapsed, toggle] as const
}

export function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto p-3">
      <div
        className={`mt-3 mb-8 flex items-center gap-3 py-2 ${collapsed ? 'justify-center px-0' : 'px-2'}`}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Repeat className="size-4" />
        </div>
        {!collapsed && <span className="truncate font-serif text-xl font-medium">Loop</span>}
      </div>

      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-3 rounded-md py-3 text-xs font-semibold transition-colors ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
          }
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}

      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={`mt-auto flex items-center gap-3 rounded-md py-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            collapsed ? 'justify-center px-0' : 'px-2.5'
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0" />
          ) : (
            <PanelLeftClose className="size-4 shrink-0" />
          )}
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      )}
    </div>
  )
}

export function Sidebar() {
  const [collapsed, toggle] = useCollapsed()
  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-card/60 transition-[width] duration-200 motion-reduce:transition-none md:block ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <SidebarContent collapsed={collapsed} onToggle={toggle} />
    </aside>
  )
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute top-0 left-0 h-full w-64 bg-card shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  )
}
