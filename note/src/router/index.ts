import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import NoteList from '@/views/NoteList.vue'
import { useUserStore } from '@/store/user'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            component: () => import('@/views/Login.vue')
        },
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '',
                    component: NoteList
                },
                {
                    path: 'note/:id',
                    component: () => import('@/views/NoteEditor.vue')
                },
                {
                    path: 'recycleBin',
                    component: () => import('@/views/RecycleBin.vue')
                }
            ]
        }
    ]
})

// 全局导航守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = userStore.isLoggedIn

  // 如果用户未登录且访问的不是登录页面，则重定向到登录页
  if (!isLoggedIn && to.path !== '/login') {
    next('/login')
  } else {
    next()
  }
})

export default router