import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '../imports/authContext'
import { scribbldCase } from '../imports/scribbldType'
import { router } from './routes'

export default function App() {
  useEffect(() => {
    document.title = scribbldCase('SCRIBBLD')
  }, [])
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
