<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="app-title">Remember</h1>
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>
      <el-form v-if="isLogin" :model="loginForm" :rules="rules" ref="loginFormRef">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-button" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
        <div class="form-footer">
          <el-button type="text" @click="isLogin = false">没有账号？去注册</el-button>
        </div>
      </el-form>

      <el-form v-else :model="registerForm" :rules="registerRules" ref="registerFormRef">
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="确认密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="邮箱"
            :prefix-icon="Message"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-button" @click="handleRegister">
            注册
          </el-button>
        </el-form-item>
        <div class="form-footer">
          <el-button type="text" @click="isLogin = true">已有账号？去登录</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const isLogin = ref(true)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: ''
})

const validatePass = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.value.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const validateEmail = (rule: any, value: string, callback: any) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (value === '') {
    callback(new Error('请输入邮箱'))
  } else if (!emailRegex.test(value)) {
    callback(new Error('请输入有效的邮箱地址'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate((valid, fields) => {
    if (valid) {
      request.post('/user/login', {
        name: loginForm.value.username,
        password: loginForm.value.password
      })
      .then(res => {
        if (res.data.code === 1) {
          userStore.setUserInfo({
            name: res.data.name,
            avatar: res.data.avatar ? `${process.env.NODE_ENV === 'development' ? import.meta.env.VITE_BASE_URL : ''}${res.data.avatar}` : '/remember.png',
            token: res.data.token,
            id: res.data.id,
            hobby: res.data.hobby
          })
          localStorage.setItem('token', res.data.token)
          ElMessage.success('登录成功')
          router.push('/')
        } else {
          ElMessage.error(res.data.message || '登录失败')
        }
      })
      .catch(err => {
        console.error('登录失败:', err)
        ElMessage.error('登录失败，请稍后重试')
      })
    } else {
      console.log('error submit!', fields)
    }
  })
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass, trigger: 'blur' }
  ],
  email: [
    { required: true, validator: validateEmail, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate((valid, fields) => {
    if (valid) {
      request.post('/user/register', {
        name: registerForm.value.username,
        password: registerForm.value.password,
        email: registerForm.value.email
      })
      .then(res => {
        if (res.data.code === 1) {
          userStore.setUserInfo({
            name: res.data.name,
            token: res.data.token,
            id: res.data.id,
            // 移除 email 字段，因为 UserInfo 类型中未定义该属性
            avatar: '/remember.png'
          })
          localStorage.setItem('token', res.data.token)
          ElMessage.success('注册成功')
          router.push('/')
        } else {
          ElMessage.error(res.data.message || '注册失败')
        }
      })
      .catch(err => {
        console.error('注册失败:', err)
        ElMessage.error('注册失败，请稍后重试')
      })
    } else {
      console.log('error submit!', fields)
    }
  })
}
</script>

<style lang="less" scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;

  .login-box {
    width: 400px;
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .app-title {
      text-align: center;
      margin-bottom: 20px;
      color: #409EFF;
      font-size: 2.5em;
      font-weight: 300;
      letter-spacing: 2px;
    }

    h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }

    .login-button {
      width: 100%;
    }

    .form-footer {
      text-align: center;
      margin-top: 10px;
    }
  }
}
</style>