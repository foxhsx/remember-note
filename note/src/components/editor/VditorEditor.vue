<template>
  <div class="vditor-editor-container">
    <div ref="editorRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { upload } from '@/service/note'

interface Props {
  modelValue?: string
  placeholder?: string
  theme?: 'classic' | 'dark'
}

interface TocItem {
  id: string
  text: string
  level: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入内容...',
  theme: 'classic'
})

const emit = defineEmits(['update:modelValue', 'tocChange'])

const editorRef = ref<HTMLElement | null>(null)
const vditor = ref<Vditor | null>(null)

const parseToc = (html: string): TocItem[] => {
  const div = document.createElement('div')
  div.innerHTML = html
  const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const toc: TocItem[] = []

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1))
    const text = heading.textContent?.trim() || ''
    const id = `heading-${text}-${index}`
    heading.id = id
    toc.push({
      id,
      text,
      level
    })
  })

  return toc
}

onMounted(() => {
  if (editorRef.value) {
    vditor.value = new Vditor(editorRef.value, {
      height: '100%',
      theme: props.theme,
      placeholder: props.placeholder,
      cache: {
        enable: false
      },
      toolbar: [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'upload',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'fullscreen',
        'preview',
        'outline',
        'export',
        'help'
      ],
      upload: {
        accept: 'image/*',
        handler: async (images: File[]) => {
          const formData = new FormData()
          images.forEach(image => {
            formData.append('file[]', image)
          })
          try {
            const { data } = await upload(formData)
            if (data.code === 1) {
              const imageUrl = `${process.env.NODE_ENV === 'development' ? import.meta.env.VITE_BASE_URL : ''}${data.data.url}`
              const insertImgText = `![${data.data.fileName}](${imageUrl})`
              // 主要靠这句插入图片
              vditor.value?.insertValue(insertImgText)
              return {
                msg: data.message,
                code: data.code,
                data: {
                  errFiles: [],
                  succMap: {
                    [data.data.fileName]: imageUrl
                  }
                }
              }
            } else {
              return {
                msg: data.message,
                code: 0,
                data: {
                  errFiles: images.map(file => file.name),
                  succMap: {}
                }
              }
            }
          } catch (error) {
            return {
              msg: '上传失败',
              code: 0,
              data: {
                errFiles: images.map(file => file.name),
                succMap: {}
              }
            }
          }
        }
      },
      after: () => {
        if (vditor.value && props.modelValue) {
          vditor.value.setValue(props.modelValue)
          // 初始化时也需要解析目录
          const html = vditor.value.getHTML()
          if (html) {
            const toc = parseToc(html)
            emit('tocChange', toc)
          }

          // 监听编辑器内容变化
          vditor.value.vditor.element?.addEventListener('keyup', () => {
            if (vditor.value) {
              const html = vditor.value.getHTML()
              if (html) {
                const toc = parseToc(html)
                emit('tocChange', toc)
              }
            }
          })
        }
      },
      input: (value: string) => {
        if (value !== undefined) {
          emit('update:modelValue', value)
          // 当内容为空时，发送空的目录数据
          if (!value.trim()) {
            emit('tocChange', [])
            return
          }
          // 解析内容中的标题并发送目录更新事件
          if (vditor.value) {
            const html = vditor.value.getHTML()
            if (html) {
              const toc = parseToc(html)
              // 确保编辑器中的标题有正确的 ID
              const previewElement = vditor.value.vditor.preview?.element
              if (previewElement) {
                toc.forEach(item => {
                  const headings = previewElement.querySelectorAll(`h${item.level}`)
                  headings.forEach(heading => {
                    if (heading.textContent?.trim() === item.text) {
                      heading.id = item.id
                    }
                  })
                })
              }
              emit('tocChange', toc)
            }
          }
        }
      }
    })
  }
})

watch(
  () => props.modelValue,
  async (newValue) => {
    // 如果编辑器实例存在且内容确实发生变化时才更新
    if (vditor.value && newValue !== vditor.value.getValue()) {
      // 获取当前编辑器的光标位置
      const editor = vditor.value.vditor.ir?.element;
      const selection = window.getSelection();
      let cursorPosition = 0;
      
      // 如果有选中的范围，保存光标位置
      if (editor && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorPosition = range.startOffset;
      }
      
      // 添加 1 秒延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新编辑器内容
      vditor.value.setValue(newValue);
      
      // 等待内容更新完成后恢复光标位置
      setTimeout(() => {
        if (editor && selection) {
          try {
            // 创建新的范围并设置光标位置
            const range = document.createRange();
            range.setStart(editor.firstChild || editor, Math.min(cursorPosition, editor.textContent?.length || 0));
            range.collapse(true);
            
            // 清除现有选择并应用新的范围
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            console.warn('恢复光标位置失败:', e);
          }
        }
      }, 10);
    }
  },
  { deep: true }
)

onBeforeUnmount(() => {
  vditor.value?.destroy()
})
</script>

<style lang="less" scoped>
.vditor-editor-container {
  height: calc(100% - 59px);

  :deep(.vditor-reset) {
    pre {
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      margin: 16px 0;

      code {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 14px;
        line-height: 1.6;
      }
    }

    code:not(pre code) {
      background-color: #f0f2f5;
      border-radius: 3px;
      padding: 0.2em 0.4em;
    }
  }
}
</style>