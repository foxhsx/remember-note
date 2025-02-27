<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUserStore } from '@/store/user'
import { onMounted } from 'vue'

const userStore = useUserStore()

onMounted(() => {
  userStore.initUserInfo()
})
</script>

<template>
  <RouterView />
</template>

<style>
#app {
  height: 100vh;
  background-color: #f5f5f5;
}
</style>
