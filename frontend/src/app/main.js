import { createApp } from 'vue'

// 组件由 unplugin-vue-components 按需引入，这里只手动带两个"函数式"组件的样式
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'

import './../styles/base.css'
import './styles/theme.css'
import './styles/app.css'

import App from './App.vue'
import { router } from './router.js'

createApp(App).use(router).mount('#app')
