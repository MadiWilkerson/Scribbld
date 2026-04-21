import { createBrowserRouter } from 'react-router'
import ProfileHubPage from '../imports/ProfileHubPage'
import Profile from '../imports/Profile'
import ProfileWelcomePage from '../imports/ProfileWelcomePage'
import HomeFeed from '../imports/HomeFeed'
import ScribblCreator from '../imports/ScribblCreator'
import Splash from '../imports/Splash'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const routes = [
  {
    path: '/',
    Component: Splash,
  },
  {
    path: '/welcome',
    Component: ProfileWelcomePage,
  },
  {
    path: '/profile',
    Component: ProfileHubPage,
  },
  {
    path: '/profile/create',
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
]

export const router = createBrowserRouter(routes, {
  basename: basename || undefined,
})
