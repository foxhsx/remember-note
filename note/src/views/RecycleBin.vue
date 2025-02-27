<template>
  <div class="recycle-bin">
    <div class="header">
      <h2>回收站</h2>
    </div>
    <div class="note-list" v-if="notes.length > 0">
      <el-table :data="notes" style="width: 100%">
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="updateTime" label="删除时间" width="200">
          <template #default="{ row }">
            {{ formatDate(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="restoreNote(row)">恢复</el-button>
            <el-button type="danger" link @click="deleteNote(row)">彻底删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    <div v-else class="empty-state">
      <el-empty description="暂无已删除的笔记" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const notes = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 获取已删除的笔记
const fetchDeletedNotes = async () => {
  try {
    const response = await request.get(`/note/recycles?pageNumber=${currentPage.value}&pageSize=${pageSize.value}`)
    if (response.data.code === 1) {
      notes.value = response.data.recycles || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('获取已删除笔记失败')
  }
}

// 处理每页数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchDeletedNotes()
}

// 处理页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchDeletedNotes()
}

// 恢复笔记
const restoreNote = async (note) => {
  try {
    const params = {
      isDelete: false
    }
    const response = await request.put(`/note/updateArticle/${note.articleId}`, params)
    if (response.data.code === 1) {
      ElMessage.success('笔记已恢复')
      await fetchDeletedNotes()
    } else {
      ElMessage.error(response.data.message || '恢复失败')
    }
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

// 彻底删除笔记
const deleteNote = async (note) => {
  try {
    await ElMessageBox.confirm('确定要彻底删除该笔记吗？此操作不可恢复', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await request.delete(`/note/deleteArticle/${note.articleId}`)
    if (response.data.code === 1) {
      ElMessage.success('笔记已彻底删除')
      await fetchDeletedNotes()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(Number(timestamp))
  return date.toLocaleString()
}

onMounted(() => {
  fetchDeletedNotes()
})
</script>

<style lang="less" scoped>
.recycle-bin {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .header {
    margin-bottom: 20px;
    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
  }

  .note-list {
    flex: 1;
    display: flex;
    flex-direction: column;

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>