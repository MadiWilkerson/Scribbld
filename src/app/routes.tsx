import { createBrowserRouter } from 'react-router'
import ProfileInputPage from '../imports/ProfileInputPage'
import Profile from '../imports/Profile'
import HomeFeed from '../imports/HomeFeed'
import ScribblCreator from '../imports/ScribblCreator'
import Splash from '../imports/Splash'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ProfileInputPage,
  },
  {
    path: '/profile',
    Component: Profile,
  },
  {
    path: '/home',
    Component: HomeFeed,
  },
  {
    path: '/create',
    Component: ScribblCreator,
  },
  {
    path: '/splash',
    Component: Splash,
  },
])
