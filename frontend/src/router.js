import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ContactsView from './views/ContactsView.vue'
import CampusMapView from './views/CampusMapView.vue'
import OrientationGuideView from './views/OrientationGuideView.vue'
import ContributeView from './views/ContributeView.vue'
import NearbyInfoView from './views/NearbyInfoView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/orientation-guide', name: 'orientation-guide', component: OrientationGuideView },
    { path: '/contacts', name: 'contacts', component: ContactsView },
    { path: '/campus-map', name: 'campus-map', component: CampusMapView },
    { path: '/nearby', name: 'nearby', component: NearbyInfoView },
    { path: '/contribute', name: 'contribute', component: ContributeView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
