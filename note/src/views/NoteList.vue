<template>
  <div class="note-list-container">
    <div class="notes-content">
      <div class="notes-header">
        <h2>我的笔记</h2>
      </div>

      <div class="notes-table" v-if="noteList.length > 0">
        <div class="table-header">
          <div class="header-title">标题</div>
          <div class="header-date">更新时间</div>
        </div>
        <div class="table-body">
          <div v-for="note in noteList" 
               :key="note.articleId" 
               class="table-row"
               @click="openNote(note)">
            <div class="row-title">
              <el-icon><Document /></el-icon>
              <span>{{ note.title }}</span>
            </div>
            <div class="row-date">{{ formatDate(note.update_time) }}</div>
          </div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <el-icon :size="48"><Document /></el-icon>
        <h3>开始创建你的第一篇笔记</h3>
        <p>点击左上角的「新建笔记」按钮，开始你的写作之旅</p>
      </div>

      <div class="pagination-container" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[25, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-list-container {
  display: flex;
  height: 100vh;
  background-color: var(--el-bg-color);
}

.notes-content {
  flex: 1;
  overflow-y: auto;
}

.notes-header {
  margin-bottom: 24px;
}

.notes-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.notes-table {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 8px 16px;
  background-color: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.table-body {
  background-color: var(--el-bg-color-overlay);
}

.table-row {
  display: flex;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: var(--el-fill-color-light);
}

.header-title,
.row-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-date,
.row-date {
  width: 120px;
  text-align: right;
  color: var(--el-text-color-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  color: var(--el-text-color-secondary);
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 500;
  margin: 16px 0 8px;
  color: var(--el-text-color-primary);
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.pagination-container {
  margin-top: 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
  padding: 0 16px;
}
</style>
```
<style lang="less" scoped>
.note-list-container {
  height: 100%;
  padding: 20px;

  .notes-content {

    .notes-header {
      margin-bottom: 24px;

      h2 {
        font-size: 24px;
        font-weight: 600;
        color: #1f2329;
        margin: 0;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 0;
      color: #8590ae;

      .el-icon {
        margin-bottom: 16px;
        color: #8590ae;
      }

      h3 {
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 8px;
        color: #1f2329;
      }

      p {
        font-size: 14px;
        margin: 0;
        color: #8590ae;
      }
    }

    .notes-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
    }

    .note-item {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
      }

      .note-item-content {
        padding: 16px;

        .note-icon {
          margin-bottom: 12px;
          color: #8590ae;
        }

        .note-info {
          h3 {
            font-size: 16px;
            font-weight: 500;
            color: #1f2329;
            margin: 0 0 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .note-preview {
            font-size: 14px;
            color: #8590ae;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
        }

        .note-date {
          font-size: 12px;
          color: #8590ae;
          margin-top: 12px;
          display: block;
        }
      }
    }

    .load-more {
      text-align: center;
      margin-top: 24px;
    }
  }
}
</style>
```
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import { useRouter } from 'vue-router'
import request from '../utils/request'

interface Note {
  knowledgeId: string
  title: string
  articleId: string
  update_time: string
  isBlog: boolean
  isDelete: boolean
  categoryId: string
  parentId: string
  sort: number
}

const userStore = useUserStore()
const noteList = ref<Note[]>([])
const currentPage = ref(1)
const pageSize = ref(25)
const total = ref(0)
const loading = ref(false)

// 获取笔记列表
const fetchNotes = async (page = 1) => {
  try {
    loading.value = true
    const response = await request.get('/note/articles', {
      params: {
        pageNumber: page,
        pageSize: pageSize.value
      }
    })
    
    noteList.value = response?.data?.articleList || []
    total.value = response?.data?.total || 0
  } catch (error) {
    console.error('获取笔记列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 处理每页显示数量变化
const handleSizeChange = async (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  await fetchNotes(1)
}

// 处理页码变化
const handleCurrentChange = async (val: number) => {
  currentPage.value = val
  await fetchNotes(val)
}

const router = useRouter()
const openNote = (note: Note) => {
  router.push(`/note/${note.articleId}`)
}

const formatDate = (date: string | number | Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

onMounted(() => {
  fetchNotes()
})
</script>