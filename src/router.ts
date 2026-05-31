import { createHashHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import Home from './pages/Home'
import OffsetView from './pages/offset/View'

const rootRoute = createRootRoute()
const getParentRoute = () => rootRoute

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute,
    path: '/',
    component: Home
  }),
  createRoute({
    getParentRoute,
    path: '/offset',
    component: OffsetView
  }),
])

const hashHistory = createHashHistory()

export const router = createRouter({ routeTree, history: hashHistory })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
