import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { Sidebar, MobileSidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Spinner } from './components/ui'
import AuthPage from './features/auth/AuthPage'
import LandingPage from './features/landing/LandingPage'
import DashboardPage from './features/dashboard/DashboardPage'
import MaterialsPage from './features/materials/MaterialsPage'
import PlanPage from './features/plan/PlanPage'
import PracticePage from './features/practice/PracticePage'
import InterviewPage from './features/interview/InterviewPage'
import MindmapPage from './features/mindmap/MindmapPage'
import ResourcesPage from './features/resources/ResourcesPage'
import VisualizerPage from './features/visualizer/VisualizerPage'

function Shell() {
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="workspace-content flex-1 px-5 py-8 sm:px-8 lg:px-12">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/mindmap" element={<MindmapPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/visualizer" element={<VisualizerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function HomeOrShell() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4">
        <Spinner />
      </div>
    )
  }
  if (!user) return <LandingPage />
  return <Shell />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/*" element={<HomeOrShell />} />
      </Routes>
    </AuthProvider>
  )
}
