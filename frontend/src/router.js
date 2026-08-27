import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

const siteTitle = '学生骨干应急信息服务'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: siteTitle } },
    { path: '/contacts', name: 'contacts', component: () => import('./views/ContactsView.vue'), meta: { title: `紧急联络人 | ${siteTitle}` } },
    { path: '/campus-map', name: 'campus-map', component: () => import('./views/CampusMapView.vue'), meta: { title: `校园地图 | ${siteTitle}` } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.meta.title || siteTitle
})

export default router
