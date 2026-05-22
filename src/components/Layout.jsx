import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#0D1117] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0D1117]">
        <Outlet />
      </main>
    </div>
  )
}
