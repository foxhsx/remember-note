import { defineStore } from 'pinia'

interface UserInfo {
    name: string;
    avatar: string;
    token: string;
    id: string;
    hobby?: string[];
}

export const useUserStore = defineStore('user', {
    state: () => ({
        name: '未登录用户',
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
        token: '',
        id: '',
        hobby: []
    }),

    getters: {
        isLoggedIn(): boolean {
            return localStorage.getItem('token') !== null
        }
    },

    actions: {
        setUserInfo({ name, avatar, token, id, hobby }: UserInfo) {
            this.name = name
            this.avatar = avatar
            this.token = token
            this.id = id
            this.hobby = hobby || []

            // 将用户信息保存到本地存储
            localStorage.setItem('userInfo', JSON.stringify({ name, avatar, token, id, hobby }))
        },

        initUserInfo() {
            const token = localStorage.getItem('token')
            if (token) {
                const userInfo = localStorage.getItem('userInfo')
                if (userInfo) {
                    const parsedInfo = JSON.parse(userInfo)
                    this.setUserInfo(parsedInfo)
                }
            }
        },

        logout() {
            // 清除本地存储
            localStorage.removeItem('userInfo')
            localStorage.removeItem('token')

            // 重置状态
            this.name = '未登录用户'
            this.avatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
            this.token = ''
            this.id = ''
            this.hobby = []
        }
    }
})