<template>
  <div class="layout-container">
    <div class="layout-left" :class="{ 'collapsed': leftCollapsed }">
      <div class="toggle-btn left" @click="toggleLeft">
        <el-icon><arrow-right v-if="leftCollapsed" /><arrow-left v-else /></el-icon>
      </div>
      <div class="user-profile">
        <div class="app-title">Remember</div>
        <el-avatar :size="64" @click="goToHome" :src="userStore.avatar" />
        <div class="user-info">
          <div class="user-name">{{ userStore.name }}</div>
          <div class="user-actions">
            <el-icon class="edit-icon" @click="showEditDialog"><Edit /></el-icon>
            <el-icon class="logout-btn" @click="handleLogout"><SwitchButton /></el-icon>
          </div>
        </div>
      </div>
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索笔记..."
          :prefix-icon="Search"
          @input="debouncedSearch"
          @focus="showSearchResults = true"
          @blur="handleSearchBlur"
        />
        <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="search-result-item"
            @mousedown="handleResultClick(result)"
          >
            {{ result.title }}
          </div>
        </div>
      </div>
      <div class="menu-container">
        <note-menu />
      </div>
    </div>
    <div class="layout-main">
      <router-view></router-view>
    </div>
    <user-edit-dialog ref="userEditDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, ArrowLeft, ArrowRight, Edit, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'
import { findNote } from '@/service/note'

// 组件引入
import NoteMenu from '@/components/menu/NoteMenu.vue'
import UserEditDialog from '@/components/dialog/UserEditDialog.vue'

// 状态管理
const userStore = useUserStore()

// 路由
const router = useRouter()

// 搜索相关
const searchKeyword = ref('')
const searchResults = ref([])
const showSearchResults = ref(false)

// 防抖函数
let searchTimeout: NodeJS.Timeout | null = null
const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(async () => {
    if (searchKeyword.value) {
      try {
        const res = await findNote(searchKeyword.value)
        if (res.data && res.data.code === 1) {
          searchResults.value = res.data.data
        }
      } catch (error) {
        console.error('搜索失败：', error)
      }
    } else {
      searchResults.value = []
    }
  }, 300)
}

// 处理搜索结果点击
const handleResultClick = (result: { id: string; title: string }) => {
  // 从原始 id 中提取数字 id
  const numericId = result.id.split('/').filter(Boolean)[1]
  // 构建新的路由路径
  const routePath = `/note/${numericId}`
  router.push(routePath)
  searchKeyword.value = ''
  searchResults.value = []
  showSearchResults.value = false
}

// 处理搜索框失焦
const handleSearchBlur = () => {
  // 使用setTimeout来确保点击事件在失焦事件之后执行
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

// 折叠控制
const leftCollapsed = ref(false)

const toggleLeft = () => {
  leftCollapsed.value = !leftCollapsed.value
}

// 在 script setup 部分添加 goToHome 函数
const goToHome = () => {
  router.push('/')
}

// 用户编辑对话框
const userEditDialogRef = ref()
const showEditDialog = () => {
  userEditDialogRef.value.dialogVisible = true
}

// 处理登出
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style lang="less" scoped>
.layout-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;

  .layout-left {
    position: relative;
    width: 260px;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    background-color: #fafafa;
    transition: all 0.3s ease;
    overflow: hidden;
    z-index: 1;

    &.collapsed {
      width: 0;
      padding: 0;
      border-right: none;
      overflow: hidden;

      .user-profile,
      .search-box,
      .menu-container {
        opacity: 0;
        visibility: hidden;
      }

      .toggle-btn {
        z-index: 2;
        left: -12px;
      }
      &:hover {
        .toggle-btn {
          left: 0;
        }
      }
    }

    .toggle-btn {
      position: fixed;
      left: 248px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      &:hover {
        background-color: #f5f5f5;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
    }
    .user-profile {
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e0e0e0;

      .app-title {
        text-align: center;
        color: #409EFF;
        font-size: 1.8em;
        font-weight: 300;
        letter-spacing: 2px;
        margin: 15px 0;
        transition: all 0.3s;
      }

      .user-info {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .user-name {
          font-size: 16px;
        }

        .edit-icon {
          cursor: pointer;
          color: #909399;
          font-size: 14px;
          
          &:hover {
            color: var(--el-color-primary);
          }
        }
      }
    }

    .search-box {
      padding: 16px;
      position: relative;

      .search-results {
        position: absolute;
        top: calc(100% - 8px);
        left: 16px;
        right: 16px;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        max-height: 300px;
        overflow-y: auto;
        z-index: 9999;

        .search-result-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
          line-height: 1.5;

          &:hover {
            background-color: #f5f5f5;
          }

          &:not(:last-child) {
            border-bottom: 1px solid #f0f0f0;
          }
        }
      }
    }
  }

  .layout-main {
    flex: 1;
    overflow: hidden;
  }

  .layout-right {
    width: 260px;
    border-left: 1px solid #e0e0e0;
    background-color: #fafafa;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &.collapsed {
      width: 0;
      padding: 0;
      border-left: none;
      overflow: hidden;

      .toc-container {
        opacity: 0;
        visibility: hidden;
      }

      .toggle-btn {
        z-index: 2;
        right: -12px;
      }
      &:hover {
       .toggle-btn {
          right: 0;
        }
      }
    }
    .toggle-btn {
      position: fixed;
      right: 248px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      &:hover {
        background-color: #f5f5f5;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
    }
  }
}
.user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logout-btn {
  cursor: pointer;
  color: var(--el-text-color-regular);
  font-size: 14px;

  &:hover {
    color: var(--el-color-primary);
  }
}
</style>