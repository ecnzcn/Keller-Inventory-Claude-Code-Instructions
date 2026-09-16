import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.content}>
        <div className={styles.mobileTopBar}>Keller</div>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
