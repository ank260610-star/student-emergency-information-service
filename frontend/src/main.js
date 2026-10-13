import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setupMobileViewport } from './utils/mobileViewport'
import 'leaflet/dist/leaflet.css'
import './style.css'

const stopMobileViewport = setupMobileViewport()
createApp(App).use(router).mount('#app')

if (import.meta.hot) import.meta.hot.dispose(stopMobileViewport)
