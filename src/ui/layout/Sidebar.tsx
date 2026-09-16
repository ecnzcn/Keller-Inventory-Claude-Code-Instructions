import { NavLink } from 'react-router-dom'
import buttonStyles from '../components/Button.module.css'
import { sidebarNavItems } from './navItems'
import styles from './Sidebar.module.css'

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>Keller</div>
      <NavLink
        to="/inventory/new"
        className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.md}`}
      >
        + Gegenstand
      </NavLink>
      <nav className={styles.nav} aria-label="Hauptnavigation">
        {sidebarNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          >
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.spacer} />
    </aside>
  )
}
