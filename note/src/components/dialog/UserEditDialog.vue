<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑个人信息"
    width="400px"
    :close-on-click-modal="false"
  >
    <div class="user-edit-form">
      <div class="avatar-upload">
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :auto-upload="false"
          accept="image/*"
          :on-change="handleAvatarChange"
          action="/api/user/avatar"
          :headers="{
            Authorization: userStore.token
          }"
          name="avatar"
        >
          <img v-if="form.avatar" :src="form.avatar" class="avatar" />
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
        <div class="avatar-tip">点击更换头像</div>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="name">
          <el-input v-model="form.name" placeholder="请输入用户名" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { updateUserInfo, uploadAvatar } from '@/service/user'
import type { FormInstance, UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  name: userStore.name,
  avatar: userStore.avatar
})

const rules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

const handleAvatarChange = async (file: UploadFile) => {
  try {
    const url = await uploadAvatar(userStore.id, file.raw!)
    form.avatar = `${process.env.NODE_ENV === 'development' ? import.meta.env.VITE_BASE_URL : ''}${url}`;
    ElMessage.success('头像上传成功')
  } catch (error) {
    console.error('上传头像失败:', error)
    ElMessage.error('头像上传失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await updateUserInfo(userStore.id, {
          name: form.name,
          avatar: form.avatar
        })
        userStore.setUserInfo({
          ...userStore.$state,
          name: form.name,
          avatar: form.avatar
        })
        dialogVisible.value = false
        ElMessage.success('更新成功')
      } catch (error) {
        console.error('更新用户信息失败:', error)
        ElMessage.error('更新失败')
      }
    }
  })
}

defineExpose({
  dialogVisible
})
</script>

<style lang="less" scoped>
.user-edit-form {
  .avatar-upload {
    text-align: center;
    margin-bottom: 20px;

    .avatar-uploader {
      border: 1px dashed #d9d9d9;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      width: 100px;
      height: 100px;
      margin: 0 auto;

      &:hover {
        border-color: var(--el-color-primary);
      }

      .avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-uploader-icon {
        font-size: 28px;
        color: #8c939d;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .avatar-tip {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>