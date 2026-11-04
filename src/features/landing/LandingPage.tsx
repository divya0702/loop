import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'

const steps = [
  {
    n: '01',
    title: 'Bring your material',
    body: 'Paste in the notes and code you actually need to learn, so prep starts from your stuff, not a generic curriculum.',
  },
  {
    n: '02',
    title: 'Get a plan for your role',
    body: 'Muse reads your material and maps it to your target role: topics that matter, drills for each, and a day-by-day run-up.',
  },
  {
    n: '03',
    title: 'Spar, then get scored',
    body: 'Drill weak topics or run a full mock interview with an adaptive interviewer. Every round ends with scored feedback and a model answer.',
  },
]

export default function LandingPage() {
  return (
    <div className="login-layout min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-sm text-muted-foreground">
              Meta Global AI Hackathon · Indie entry · Powered by Meta Muse
            </p>
            <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
              Walk into interviews warmed&nbsp;up.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Loop is an interview simulator: it turns your own notes and code into a
              personal prep plan for your role, then spars with you: drills, mock
              interviews, mindmaps, scored feedback, until the real thing feels like
              another round.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/login">
                <Button className="px-6 py-2.5 text-base">Start preparing</Button>
              </Link>
              <span className="text-sm text-muted-foreground">Free · your data stays private</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sparring round · Systems
              </span>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                4 / 5
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              “Design a rate limiter for 100k requests per second. Start with the API, then
              defend your trade-offs.”
            </p>
            <div className="mt-4 border-t border-border pt-3 text-sm">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Coach: </span>
                Solid token-bucket start. You skipped the distributed case: what breaks when
                you add a second node?
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-primary/25 bg-accent/50 p-5">
        <h2 className="text-lg font-medium">One engine: Meta Muse</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Every step here runs live on Muse Spark through the Meta Model API: plans,
          drills, mock interviews, mindmaps, resource picks and code traces, all as
          structured outputs. No static content: your material goes in, and Muse builds
          the loop around your role.
        </p>
      </div>

      <div className="mt-14 border-t border-border">
          {steps.map((s) => (
            <div
              key={s.n}
              className="grid gap-1 border-b border-border py-5 sm:grid-cols-[3rem_14rem_1fr] sm:gap-6"
            >
              <span className="font-mono text-sm text-primary">{s.n}</span>
              <h2 className="text-lg font-medium">{s.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Built during the Meta Global AI Developer Hackathon, Nov 2026.
        </p>
      </div>
    </div>
  )
}
