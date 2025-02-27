<template>
  <div class="note-editor-view">
    <NoteEditor
      v-model="noteContent"
      @update:modelValue="handleContentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NoteEditor from '@/components/editor/NoteEditor.vue'

const route = useRoute()
const noteContent = ref('')

// 获取笔记内容
const fetchNoteContent = async () => {
  const noteId = route.params.id
  try {
    // TODO: 从后端API获取笔记内容
    // const response = await fetch(`/api/notes/${noteId}`)
    // const data = await response.json()
    // noteContent.value = data.content
    noteContent.value = '# 测试笔记\n这是一个测试笔记的内容。'
  } catch (error) {
    console.error('获取笔记内容失败:', error)
  }
}

// 处理内容变化
const handleContentChange = async (newContent: string) => {
  const noteId = route.params.id
  try {
    // TODO: 保存笔记内容到后端
    // await fetch(`/api/notes/${noteId}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ content: newContent })
    // })
    console.log('保存笔记内容:', newContent)
  } catch (error) {
    console.error('保存笔记内容失败:', error)
  }
}

onMounted(() => {
  fetchNoteContent()
})
</script>

<style lang="less" scoped>
.note-editor-view {
  height: 100%;
  width: 100%;
  background-color: #fff;
}
</style>