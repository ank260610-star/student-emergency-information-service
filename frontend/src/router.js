import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

const siteTitle = '南开大学新生生活指北'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: siteTitle } },
    { path: '/orientation-guide', name: 'orientation-guide', component: () => import('./views/OrientationGuideView.vue'), meta: { title: `报到指南 | ${siteTitle}` } },
    { path: '/contacts', name: 'contacts', component: () => import('./views/ContactsView.vue'), meta: { title: `紧急联络人 | ${siteTitle}` } },
    { path: '/campus-map', name: 'campus-map', component: () => import('./views/CampusMapView.vue'), meta: { title: `校园地图 | ${siteTitle}` } },
    { path: '/nearby', name: 'nearby', component: () => import('./views/NearbyInfoView.vue'), meta: { title: `周边信息 | ${siteTitle}` } },
    { path: '/contribute', name: 'contribute', component: () => import('./views/ContributeView.vue'), meta: { title: `参与贡献 | ${siteTitle}` } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.meta.title || siteTitle
})

export default router
