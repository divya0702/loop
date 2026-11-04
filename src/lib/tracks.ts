// Role tracks: not everyone preps the same way. A backend engineer gets drills,
// system-design-heavy interviews and the code visualizer; an EM gets behavioral
// weight and no visualizer. Matching is keyword-based so free-text roles work.

export interface RoleTrack {
  id: string
  label: string
  blurb: string
  match: string[]
  modules: string[]
}

export const MODULE_META: Record<string, { label: string; blurb: string }> = {
  '/materials': { label: 'Materials', blurb: 'Your notes and code, in one place' },
  '/plan': { label: 'Plan', blurb: 'A prep plan built for your role' },
  '/practice': { label: 'Drills', blurb: 'One question at a time, scored' },
  '/interview': { label: 'Mock Interview', blurb: 'A full loop with a scorecard' },
  '/mindmap': { label: 'Mindmap', blurb: 'Your notes as a concept tree' },
  '/resources': { label: 'Resources', blurb: 'Hand-picked reading for your gaps' },
  '/visualizer': { label: 'Code Visualizer', blurb: 'Step through any code' },
}

const ALL = Object.keys(MODULE_META)
const NO_VIZ = ALL.filter((m) => m !== '/visualizer')

export const ROLE_TRACKS: RoleTrack[] = [
  {
    id: 'frontend',
    label: 'Frontend / Mobile',
    blurb: 'UI depth, browser and app internals, coding rounds with live tracing.',
    match: ['front', 'ui', 'ux', 'web', 'react', 'angular', 'vue', 'mobile', 'ios', 'android', 'flutter'],
    modules: ALL,
  },
  {
    id: 'backend',
    label: 'Backend / Full-stack',
    blurb: 'APIs, data modeling, system design and coding rounds with live tracing.',
    match: ['back', 'full', 'software', 'sde', 'swe', 'server', 'api', 'node', 'python', 'java', 'go '],
    modules: ALL,
  },
  {
    id: 'data',
    label: 'Data / ML',
    blurb: 'SQL and modeling depth, ML fundamentals, coding with live tracing.',
    match: ['data', 'ml', 'ai', 'scien', 'analy', 'model'],
    modules: ALL,
  },
  {
    id: 'cloud',
    label: 'DevOps / Cloud',
    blurb: 'Infrastructure judgment, failure modes, automation coding with tracing.',
    match: ['devops', 'cloud', 'sre', 'infra', 'platform', 'terraform', 'aws', 'kuber', 'docker'],
    modules: ALL,
  },
  {
    id: 'manager',
    label: 'Manager / Product',
    blurb: 'Behavioral depth, judgment and communication. No coding visualizer.',
    match: ['manager', 'lead', 'director', 'principal', 'staff', 'em', 'pm', 'product', 'tpm'],
    modules: NO_VIZ,
  },
  {
    id: 'general',
    label: 'General Prep',
    blurb: 'A balanced loop across notes, drills and interviews. Tell us your role for more.',
    match: [],
    modules: NO_VIZ,
  },
]

export function trackForRole(role: string): RoleTrack {
  const hay = role.toLowerCase()
  if (!hay.trim()) return ROLE_TRACKS[ROLE_TRACKS.length - 1]
  for (const track of ROLE_TRACKS) {
    if (track.match.some((k) => hay.includes(k))) return track
  }
  return ROLE_TRACKS[ROLE_TRACKS.length - 1]
}
