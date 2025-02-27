import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './styles/editor.css'
import App from './App.vue'
import router from './router'

// 引入 Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入 Element Plus 图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'


const app = createApp(App)

// 注册 Element Plus
app.use(ElementPlus)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// 创建并使用 Pinia
const pinia = createPinia()
app.use(pinia)

app.use(router)
app.mount('#app')
