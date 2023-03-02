import { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [{ path: '', name: 'map', component: () => import('@/pages/MapPage.vue') }],
  },
  {
    path: '/:catchAll(.*)*',
    name: '404',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
