import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './styles/themes.css'
import './styles/main.css'
import { initializeThemeFromCache } from './utils/theme.js'

initializeThemeFromCache()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
