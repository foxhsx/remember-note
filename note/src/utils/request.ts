import axios from 'axios'

const request = axios.create({
    baseURL: process.env.NODE_ENV === 'development' ? import.meta.env.VITE_BASE_URL : '/api',
    timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
    config => {
        // 获取本地存储的 token
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = 'Bearer ' + token
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    response => {
        return response
    },
    error => {
        return Promise.reject(error)
    }
)

export default request