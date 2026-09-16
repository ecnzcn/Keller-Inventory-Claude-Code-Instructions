import { NavLink } from 'react-router-dom'
import { bottomNavItems } from './navItems'
import styles from './BottomNav.module.css'

const [home, inventory, ...rest] = bottomNavItems

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Navigation">
      <NavLink
        to={home.to}
        end
        className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
      >
        <span className={styles.icon} aria-hidden="true">
          {home.icon}
        </span>
        {home.label}
      </NavLink>
      <NavLink
        to={inventory.to}
        className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
      >
        <span className={styles.icon} aria-hidden="true">
          {inventory.icon}
        </span>
        {inventory.label}
      </NavLink>
      <NavLink to="/inventory/new" className={styles.addButton} aria-label="Gegenstand hinzufügen">
        <span aria-hidden="true">+</span>
      </NavLink>
      {rest.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
        >
          <span className={styles.icon} aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
