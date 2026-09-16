import type { RouteObject } from 'react-router-dom'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { ItemDetailPage } from '../features/item-detail/ItemDetailPage'
import { ItemFormPage } from '../features/item-form/ItemFormPage'
import { LocationsPage } from '../features/locations/LocationsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AppShell } from '../ui/layout/AppShell'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'inventory/new', element: <ItemFormPage /> },
      { path: 'inventory/:itemId', element: <ItemDetailPage /> },
      { path: 'inventory/:itemId/edit', element: <ItemFormPage /> },
      { path: 'locations', element: <LocationsPage /> },
      { path: 'locations/:locationId', element: <LocationsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'categories/:categoryId', element: <CategoriesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]
