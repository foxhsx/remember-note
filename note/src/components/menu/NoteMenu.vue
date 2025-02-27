<template>
  <div class="note-menu">
    <div class="menu-header">
      <el-button type="primary" link @click="showCreateDialog">
        <el-icon><Plus /></el-icon>新建分组
      </el-button>
      <el-button type="primary" link @click="goToRecycleBin">
        <el-icon><Delete /></el-icon>回收站
      </el-button>
    </div>
    <el-tree
      ref="treeRef"
      :props="defaultProps"
      node-key="id"
      :expand-on-click-node="false"
      draggable
      lazy
      :load="loadNode"
      :data="menuData"
      :current-node-key="currentNoteId"
      highlight-current
      @node-drag-end="handleDragEnd"
    >
      <template #default="{ node, data }">
        <div class="custom-tree-node">
          <span class="node-label" @click="handleNodeClick(data)">
            <el-icon v-if="data.type === 'group'"><Folder /></el-icon>
            <el-icon v-else><Document /></el-icon>
            {{ node.label }}
          </span>
          <span class="node-actions">
            <el-dropdown trigger="click" @command="(command) => handleCommand(command, data)">
              <el-icon><More /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <template v-if="data.type === 'group'">
                    <el-dropdown-item command="newGroup">新建分组</el-dropdown-item>
                    <el-dropdown-item command="newNote">新建笔记</el-dropdown-item>
                    <el-dropdown-item command="rename" divided>重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </template>
                  <template v-else>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </template>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </span>
        </div>
      </template>
    </el-tree>

    <!-- 重命名对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名"
      width="30%"
      :close-on-click-modal="false"
    >
      <el-input v-model="newName" placeholder="请输入新名称" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRename">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新建知识库对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建知识库"
      width="30%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="知识库名称" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="知识库ID" prop="knowledgeId">
          <el-input v-model="createForm.knowledgeId" placeholder="请输入知识库ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCreate">确定</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 新建分组对话框 -->
    <el-dialog
      v-model="newGroupDialogVisible"
      title="新建分组"
      width="30%"
      :close-on-click-modal="false"
    >
      <el-input v-model="newGroupName" placeholder="请输入分组名称" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="newGroupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="() => createNewItem('group', currentParentNode)">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Plus, Document, Folder, More } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import request from '@/utils/request'
import type { FormInstance, FormRules } from 'element-plus'
import type Node from 'element-plus/es/components/tree/src/model/node'

// 定义接口
interface TreeNode {
  id: string
  label: string
  type: 'group' | 'note'
  children?: TreeNode[] | null
  categoryId?: string
  knowledgeId?: string
}

interface Knowledge {
  knowledgeId: string
  title: string
}

interface NoteMenuItem {
  articleId: string
  title: string
  categoryId?: string
  isDelete?: boolean
}

const router = useRouter()
const route = useRoute()
const treeRef = ref<InstanceType<typeof import('element-plus')['ElTree']>>()

// 新建分组相关
const newGroupName = ref('')
const newGroupDialogVisible = ref(false)

// 重命名相关
const renameDialogVisible = ref(false)
const newName = ref('')
let currentNode: TreeNode | null = null

// 菜单数据
const menuData = ref<TreeNode[]>([])

// 当前选中的笔记ID
const currentNoteId = ref('')

// 新建知识库相关
const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = ref({
  title: '',
  knowledgeId: ''
})
const createRules = ref<FormRules>({
  title: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  knowledgeId: [
    { required: true, message: '请输入知识库ID', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ]
})

// 显示创建对话框
const showCreateDialog = () => {
  createForm.value = {
    title: '',
    knowledgeId: ''
  }
  createDialogVisible.value = true
}

// 确认创建知识库
const confirmCreate = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const response = await request.post('/note/addgKnowledge', createForm.value)
        if (response.data.code === 1) {
          ElMessage.success('创建成功')
          createDialogVisible.value = false
          // 刷新知识库列表
          await fetchKnowledgeList()
        } else {
          ElMessage.error(response.data.message || '创建失败')
        }
      } catch (error) {
        ElMessage.error('创建失败')
      }
    }
  })
}

// 监听路由变化，更新当前选中的笔记
watch(() => route.params.id, (newId) => {
  if (newId) {
    currentNoteId.value = Array.isArray(newId) ? newId[0] : newId
  }
}, { immediate: true })

const defaultProps = {
  children: 'children',
  label: 'label',
  isLeaf: (data: any) => data.type === 'note'
}

// 获取知识库列表
const fetchKnowledgeList = async () => {
  try {
    const { data } = await request.get('/note/getKnowledge')
    if (data.code === 1) {
      const knowledgeList = data.data as Knowledge[] || []
      menuData.value = knowledgeList.map((knowledge: Knowledge) => {
        return {
          id: knowledge.knowledgeId,
          label: knowledge.title,
          type: 'group' as const,
        }
      })
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取知识库列表失败')
  }
}

// 获取笔记菜单
const fetchNoteMenu = async (knowledgeId: string): Promise<TreeNode[]> => {
  try {
    const response = await request.get(`/note/getNoteMenu/${knowledgeId}`)
    if (response.data.code === 1) {
      const noteMenu = response.data.noteMenu as NoteMenuItem[] || []
      return noteMenu
        .filter(item => !item.isDelete)
        .map((item): TreeNode => {
          return {
            id: item.articleId,
            label: item.title,
            type: item.categoryId ? 'group' : 'note',
            children: item.categoryId ? [] : null,
            categoryId: item.categoryId,
            knowledgeId
          }
        })
    }
    return []
  } catch (error) {
    ElMessage.error('获取笔记菜单失败')
    return []
  }
}

// 获取分类下的笔记
const fetchCategoryNotes = async (knowledgeId: string, categoryId: string): Promise<TreeNode[]> => {
  if (!categoryId) return []
  try {
    const response = await request.get(`/note/getCategory/${knowledgeId}/${categoryId}`)
    if (response.data.code === 1) {
      const notes = response.data.noteMenu as NoteMenuItem[] || []
      return notes.map((note): TreeNode => ({
        id: note.articleId,
        label: note.title,
        type: note.categoryId ? 'group' : 'note',
        knowledgeId,
        categoryId: note.categoryId,
      }))
    }
    return []
  } catch (error) {
    ElMessage.error('获取分类笔记失败')
    return []
  }
}

// 节点点击事件
const handleNodeClick = (data: TreeNode) => {
  if (data.type === 'note') {
    router.push(`/note/${data.id}`)
  }
}

// 懒加载节点
const loadNode = async (node: Node, resolve: (data: TreeNode[]) => void) => {
  if (node.level === 1) {
    try {
      const children = await fetchNoteMenu(node.data.id)
      resolve(children)
    } catch (error) {
      resolve([])
    }
  } else {
    try {
      const children = await fetchCategoryNotes(
        node.data.knowledgeId || node.parent.data.knowledgeId,
        node.data.categoryId
      )
      resolve(children)
    } catch (error) {
      resolve([])
    }
  }
}

// 拖拽结束事件
const handleDragEnd = (draggingNode: Node, dropNode: Node, dropType: 'before' | 'after' | 'inner') => {
  // TODO: 更新菜单结构
  console.log('拖拽结束:', { draggingNode, dropNode, dropType })
}

const convertStringToHash = (str: string) => {
  let hash = 0;
  let chr;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;  // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// 在指定分组下创建新项
const createNewItem = async (type: 'group' | 'note', parentNode: TreeNode | null = null) => {
  try {
    const currentTime = Date.now().toString()
    const categoryId = newGroupName.value && convertStringToHash(newGroupName.value).toString()
    const params = {
      knowledgeId: parentNode?.knowledgeId || parentNode?.id || '',
      title: type === 'group' ? newGroupName.value : '无标题',
      content: '',
      articleId: currentTime,
      categoryId: type === 'group' ? categoryId : '',
      sort: type === 'group' ? 4 : 0,
      parentId: type === 'group' ? parentNode?.categoryId || '' : parentNode?.categoryId || ''
    }

    const response = await request.post('/note/addArticle', params)
    if (response.data.code === 1) {
      ElMessage.success(type === 'group' ? '新建分组成功' : '新建笔记成功')
      if (parentNode && treeRef.value) {
        const node = treeRef.value.getNode(parentNode.id)
        if (node) {
          const newChild: TreeNode = {
            id: currentTime,
            label: params.title,
            type: type,
            categoryId: type === 'group' ? categoryId : '',
            knowledgeId: parentNode.id
          }
          node.insertChild({ data: newChild }, 0)
        }
      } else {
        await fetchKnowledgeList()
      }
      if (type === 'note') {
        router.push(`/note/${currentTime}`)
      }
    } else {
      ElMessage.error(response.data.message || '创建失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('创建失败')
  }
}

const handleCommand = (command: 'newGroup' | 'newNote' | 'rename' | 'delete', node: TreeNode) => {
  switch (command) {
    case 'newGroup':
      newGroupName.value = ''
      newGroupDialogVisible.value = true
      currentParentNode = node
      break
    case 'newNote':
      createNewItem('note', node)
      break
    case 'rename':
      currentNode = node
      newName.value = node.label
      renameDialogVisible.value = true
      break
    case 'delete':
      ElMessageBox.confirm('确定要删除该项吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          if (node.type === 'group' && !node.categoryId) {
            const response = await request.delete(`/note/deleteKnowledge/${node.id}`)
            if (response.data.code === 1) {
              ElMessage.success('删除成功')
              await fetchKnowledgeList()
            } else {
              ElMessage.error(response.data.message || '删除失败')
            }
          } else {
            await deleteNode(node)
          }
        } catch (error) {
          ElMessage.error('删除失败')
        }
      })
      break
  }
}

// 用于存储当前操作的父节点
let currentParentNode: TreeNode | null = null

const deleteNode = async (node: TreeNode) => {
  try {
    const params = {
      isDelete: true
    }
    const response = await request.put(`/note/updateArticle/${node.id}`, params)
    if (response.data.code === 1) {
      const noteMenu = await fetchNoteMenu(node.knowledgeId || '')
      const notes = noteMenu.filter(item => item.type === 'note')
      
      if (notes.length > 0) {
        router.push(`/note/${notes[0].id}`)
      }
      
      if (treeRef.value) {
        const treeNode = treeRef.value.getNode(node.id)
        if (treeNode && treeNode.parent) {
          treeNode.parent.childNodes = treeNode.parent.childNodes.filter(
            child => child.data.id !== node.id
          )
        }
      }
      
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const confirmRename = async () => {
  if (currentNode) {
    try {
      const params = {
        articleId: currentNode.id,
        title: newName.value,
        content: '',
        categoryId: currentNode.categoryId || '',
        knowledgeId: currentNode.knowledgeId || ''
      }
      const response = await request.put(`/note/updateArticle/${currentNode.id}`, params)
      if (response.data.code === 1) {
        const node = treeRef.value?.getNode(currentNode.id)
        if (node) {
          node.data.label = newName.value
        }
        ElMessage.success('重命名成功')
      } else {
        ElMessage.error(response.data.message || '重命名失败')
      }
    } catch (error) {
      console.error(error)
      ElMessage.error('重命名失败')
    } finally {
      renameDialogVisible.value = false
      currentNode = null
      newName.value = ''
    }
  }
}

onMounted(() => {
  fetchKnowledgeList()
  // 初始化当前笔记ID
  if (route.params.id) {
    currentNoteId.value = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id as string
  }
})
const goToRecycleBin = () => {
  router.push('/recycleBin')
}
</script>

<style lang="less" scoped>
.note-menu {
  height: calc(100vh - 177px);
  overflow-y: auto;
  
  .menu-header {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
  }

  .custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;

    .node-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .node-actions {
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .node-actions {
      opacity: 1;
    }
  }
}
// 在 style 部分添加头像样式
.menu-header {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 8px;

  .avatar {
    cursor: pointer;
  }
}
</style>