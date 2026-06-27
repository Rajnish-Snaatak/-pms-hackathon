import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import TopNav from './components/TopNav'

import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import ManagerDashboard from './pages/dashboard/ManagerDashboard'
import HRDashboard from './pages/dashboard/HRDashboard'
import GoalsPage from './pages/GoalsPage'
import TimelinePage from './pages/TimelinePage'
import ReviewPage from './pages/ReviewPage'
import TeamsPage from './pages/TeamsPage'
import PeoplePage from './pages/PeoplePage'
import LoginPage from './pages/LoginPage'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-muted">
      <span className="h-8 w-8 rounded-full border-[3px] border-line border-t-brand animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

function RoleDashboard() {
  const role = useStore((s) => s.currentRole)
  if (role === 'manager') return <ManagerDashboard />
  if (role === 'hr') return <HRDashboard />
  return <EmployeeDashboard />
}

// Employees have no Teams page — bounce them back to the dashboard.
function ManagerOrHR({ children }) {
  const role = useStore((s) => s.currentRole)
  if (role === 'employee') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const loadAll = useStore((s) => s.loadAll)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const currentUser = useStore((s) => s.currentUser)
  const location = useLocation()

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen">
        <Spinner label="Loading PerfTrail…" />
      </div>
    )
  }

  // Not signed in — show the login screen.
  if (!currentUser) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      {error && (
        <div className="mx-auto max-w-6xl px-4 mt-3">
          <div className="card border-l-[3px] border-l-danger bg-[#fce8e6] p-3 text-sm text-[#c5221f]">
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RoleDashboard />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route
            path="/teams"
            element={
              <ManagerOrHR>
                <TeamsPage />
              </ManagerOrHR>
            }
          />
          <Route
            path="/people"
            element={
              <ManagerOrHR>
                <PeoplePage />
              </ManagerOrHR>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
