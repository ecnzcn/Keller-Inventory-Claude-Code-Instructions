export interface NavItem {
  to: string
  label: string
  icon: string
}

/** Full navigation, used by the desktop sidebar. */
export const sidebarNavItems: NavItem[] = [
  { to: '/', label: 'Start', icon: '\u{1F3E0}' },
  { to: '/inventory', label: 'Inventar', icon: '\u{1F4E6}' },
  { to: '/locations', label: 'Orte', icon: '\u{1F4CD}' },
  { to: '/categories', label: 'Kategorien', icon: '\u{1F3F7}️' },
  { to: '/settings', label: 'Einstellungen', icon: '\u{2699}️' },
]

/**
 * A trimmed set for the mobile bottom nav (5 slots max, with the middle
 * slot reserved for the prominent "Add item" action). Categories stays
 * one tap away via the segmented control on the Locations screen instead
 * of crowding a sixth tab.
 */
export const bottomNavItems: NavItem[] = [
  { to: '/', label: 'Start', icon: '\u{1F3E0}' },
  { to: '/inventory', label: 'Inventar', icon: '\u{1F4E6}' },
  { to: '/locations', label: 'Orte', icon: '\u{1F4CD}' },
  { to: '/settings', label: 'Einstellungen', icon: '\u{2699}️' },
]
