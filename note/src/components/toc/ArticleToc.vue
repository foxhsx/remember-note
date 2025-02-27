<template>
  <div class="article-toc">
    <div class="toc-header">
      <el-icon><Document /></el-icon>
      <span>文章目录</span>
    </div>
    <div class="toc-content">
      <template v-if="tocItems.length > 0">
        <div
          v-for="item in tocItems"
          :key="item.id"
          class="toc-item"
          :class="{
            'is-active': currentHeading === item.id,
            [`level-${item.level}`]: true
          }"
          @click="scrollToHeading(item.id)"
        >
          {{ item.text }}
        </div>
      </template>
      <div v-else class="empty-toc">
        暂无目录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'

interface TocItem {
  id: string
  level: number
  text: string
}

// 通过 props 接收目录数据
const props = defineProps<{
  tocItems: TocItem[]
}>()

const currentHeading = ref('')

// 滚动到指定标题
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    currentHeading.value = id
  }
}
</script>

<style lang="less" scoped>
.article-toc {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 14px;

  .toc-header {
    padding: 16px;
    font-weight: 500;
    color: #333;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toc-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;

    .toc-item {
      padding: 4px 16px;
      cursor: pointer;
      color: #666;
      line-height: 1.6;
      transition: all 0.2s;

      &:hover {
        color: #333;
        background-color: #f5f5f5;
      }

      &.is-active {
        color: #409eff;
        background-color: #ecf5ff;
      }

      &.level-1 {
        padding-left: 16px;
      }

      &.level-2 {
        padding-left: 32px;
      }

      &.level-3 {
        padding-left: 48px;
      }

      &.level-4 {
        padding-left: 64px;
      }
    }

    .empty-toc {
      padding: 16px;
      text-align: center;
      color: #999;
    }
  }
}
</style>