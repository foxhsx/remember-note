import request from '@/utils/request'

export interface UserInfo {
    name: string
    avatar: string
    token: string
    id: string
    hobby?: string[]
}

export const updateUserInfo = (id: string, data: Partial<UserInfo>) => {
    return request.put(`/user/userInfo/${id}`, data)
}

export const uploadAvatar = async (id: string, file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await request.post(`/user/avatar/${id}`, formData)

    const result = response.data
    if (result.code !== 1) {
        throw new Error(result.message || '头像上传失败')
    }

    return result.data.url
}