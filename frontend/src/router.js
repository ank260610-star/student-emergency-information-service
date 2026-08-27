import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ContactsView from './views/ContactsView.vue'
import CampusMapView from './views/CampusMapView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/contacts', name: 'contacts', component: ContactsView },
    { path: '/campus-map', name: 'campus-map', component: CampusMapView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
