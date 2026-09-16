import { createHashRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '../ui/theme/ThemeContext'
import { routes } from './routes'

const router = createHashRouter(routes)

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
