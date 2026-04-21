import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { scribbldCase } from '../imports/scribbldType'
import { router } from './routes'

export default function App() {
  useEffect(() => {
    document.title = scribbldCase('SCRIBBLD')
  }, [])
  return <RouterProvider router={router} />
}
