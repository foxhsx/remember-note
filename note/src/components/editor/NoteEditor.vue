<template>
  <div class="editor-container">
    <div class="editor-main">
      <div class="title-input">
        <el-input
          v-model="title"
          placeholder="请输入标题..."
          :prefix-icon="Document"
        />
        <div class="title-actions">
          <el-button type="primary" size="small" class="affine-style-btn publish-btn" @click="dialogVisible = true">发布</el-button>
          <el-button type="danger" size="small" class="affine-style-btn delete-btn" @click="handleDelete">删除</el-button>
        </div>
      </div>
      <VditorEditor
        v-model="content"
        @update:modelValue="handleContentChange"
      />
    </div>
    <el-dialog v-model="dialogVisible" title="发布文章" width="30%">
      <el-form :model="ruleForm">
        <el-form-item label="标签" prop="tags">
          <el-input v-model="ruleForm.tags" placeholder="请输入标签，多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="描述" prop="summary">
          <div class="summary-input">
            <el-input v-model="ruleForm.summary" type="textarea" placeholder="请输入文章描述" />
            <el-button
              type="primary"
              :icon="Edit"
              class="generate-btn"
              :loading="generating"
              @click="handleGenerateSummary"
            >
              AI 生成
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handlePublish">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { Document, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import VditorEditor from './VditorEditor.vue'
import request from '@/utils/request'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()

// 编辑器内容
const content = ref('')
const title = ref('')
const loading = ref(false)

// 自动保存相关
const autoSaveTimer = ref<ReturnType<typeof setInterval> | null>(null)
const AUTOSAVE_DELAY = 30000 // 30秒自动保存
const LOCAL_STORAGE_KEY = 'editor_draft'

// 保存笔记
const saveNote = async () => {
  const articleId = route.params.id as string
  if (!articleId) return

  try {
    loading.value = true
    await request.put(`/note/updateArticle/${articleId}`, {
      title: title.value,
      content: content.value
    })
    ElMessage.success('保存成功')
    // 保存成功后清除本地缓存
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error('保存笔记失败:', error)
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 自动保存到本地
const saveToLocal = () => {
  const articleId = route.params.id as string
  if (!articleId) return

  const draft = {
    articleId,
    title: title.value,
    content: content.value,
    timestamp: Date.now()
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft))
}

// 从本地恢复草稿
const restoreFromLocal = () => {
  const articleId = route.params.id as string
  if (!articleId) return

  const draftStr = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!draftStr) return

  try {
    const draft = JSON.parse(draftStr)
    if (draft.articleId === articleId && draft.timestamp) {
      content.value = draft.content
      title.value = draft.title
      ElMessage.info('已恢复未保存的草稿')
    }
  } catch (error) {
    console.error('恢复草稿失败:', error)
  }
}

// 监听快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveNote()
  }
}

// 设置自动保存
const setupAutoSave = () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
  autoSaveTimer.value = setInterval(() => {
    saveToLocal()
  }, AUTOSAVE_DELAY)
}

// 监听内容变化
watch([content, title], () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
  setupAutoSave()
  saveToLocal()
})

// 组件挂载时
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  setupAutoSave()
  restoreFromLocal()
})

// 组件卸载时
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
})

// 获取笔记详情
const fetchNoteDetail = async () => {
  const articleId = route.params.id as string
  if (!articleId) return
  
  try {
    loading.value = true
    const { data } = await request.get(`/note/getArticle`, {
      params: {
        articleId
      }
    })
    if (data?.article) {
      content.value = data.article.content || ''
      title.value = data.article.title || ''
    }
  } catch (error) {
    console.error('获取笔记详情失败:', error)
    ElMessage.error('获取笔记详情失败')
  } finally {
    loading.value = false
  }
}

// 处理编辑器内容变化
const handleContentChange = (newContent: string) => {
  content.value = newContent
}

// 监听路由参数变化
watch(() => route.params.id, () => {
  if (route.params.id) {
    fetchNoteDetail()
  }
}, { immediate: true })
// 在 script setup 中添加
const dialogVisible = ref(false)
const router = useRouter()
const ruleForm = reactive({
  tags: '',
  summary: ''
})

// AI 生成描述
const generating = ref(false)
const handleGenerateSummary = async () => {
  if (!content.value) {
    ElMessage.warning('请先输入文章内容')
    return
  }

  try {
    generating.value = true
    const { data } = await request.post('/note/generateSummary', {
      content: content.value
    })
    if (data?.summary) {
      ruleForm.summary = data.summary
      ElMessage.success('生成描述成功')
    }
    if (data.code === 0) {
      ElMessage.error(data.message)
    }
  } catch (error) {
    console.error('生成描述失败:', error)
    ElMessage.error('生成描述失败')
  } finally {
    generating.value = false
  }
}

const handleDelete = () => {
  ElMessageBox.confirm('确认删除这篇笔记吗？', '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    const articleId = route.params.id as string
    if (!articleId) return

    try {
      await request.delete(`/note/deleteArticle/${articleId}`)
      ElMessage.success('删除成功')
      router.push('/')
    } catch (error) {
      console.error('删除笔记失败:', error)
      ElMessage.error('删除失败')
    }
  })
}

// TODO 需要测试
const handlePublish = async () => {
  const articleId = route.params.id as string
  if (!articleId) return

  try {
    const result = await request.put(`/note/updateArticle/${articleId}`, {
      title: title.value,
      content: content.value,
      tags: ruleForm.tags,
      summary: ruleForm.summary,
      isBlog: true,
      isRelease: true,
    })
    if (result.data.code === 0) {
      ElMessage.error(result.data.message);
    } else {
      ElMessage.success(result.data.message)
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error('发布失败')
  }
}
</script>

<style lang="less" scoped>
.editor-container {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;

  .editor-main {
    flex: 1;
    overflow: auto;

    .title-input {
      height: 42px;
      padding: 8px 16px 0 16px;
      border-bottom: 1px solid #e0e0e0;

      :deep(.el-input__wrapper) {
        background-color: transparent;
        box-shadow: none;
        padding-left: 0;

        &.is-focus {
          box-shadow: none;
        }
      }

      :deep(.el-input__inner) {
        font-size: 22px;
        font-weight: 500;
        color: #333;

        &::placeholder {
          color: #999;
        }
      }
    }
  }

  :deep(.vditor-outline__content) {
    font-size: 14px;
    line-height: 1.6;
    padding: 12px;

    :deep(.vditor-outline) {
      padding: 0;

      .vditor-outline__item {
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      }
    }
  }

  .editor-toc {
    width: 260px;
    border-left: 1px solid #e0e0e0;
    background-color: #fafafa;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.6;
    padding: 12px;

    :deep(.vditor-outline) {
      padding: 0;

      .vditor-outline__item {
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      }
    }

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
// 在 style 中添加
.title-input {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .summary-input {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  
    .el-input {
      flex: 1;
  
      :deep(.el-textarea__inner) {
        min-height: 80px;
        padding: 12px;
        border-radius: 8px;
        resize: vertical;
        font-size: 14px;
        line-height: 1.6;
        background-color: #f9f9f9;
        border: 1px solid #e0e0e0;
        transition: all 0.3s ease;
  
        &:hover {
          border-color: #c0c4cc;
        }
  
        &:focus {
          background-color: #fff;
          border-color: #3370ff;
          box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
        }
      }
    }
  
    .generate-btn {
      align-self: flex-start;
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      font-weight: 500;
      background-color: #3370ff;
      border: none;
      transition: all 0.2s ease;
  
      &:hover {
        background-color: #1e5eff;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
  
      &:active {
        transform: translateY(0);
      }
  
      .el-icon {
        margin-right: 4px;
      }
    }
  }

  .title-actions {
    display: flex;
    gap: 8px;

    .affine-style-btn {
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s ease;
      border: none;
      padding: 6px 12px;
    
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    
      &.publish-btn {
        background-color: #3370ff;
        
        &:hover {
          background-color: #1e5eff;
        }
      }
    
      &.delete-btn {
        background-color: #eb4d4d;
        
        &:hover {
          background-color: #e63939;
        }
      }
    }
  }
}
</style>