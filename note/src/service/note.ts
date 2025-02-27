import request from '@/utils/request'

// 搜索笔记
export const findNote = async (searchValue: string) => {
    return request({
        url: '/note/findnote',
        method: 'get',
        params: {
            searchValue
        }
    })
}

// 获取笔记详情
export const getNoteDetail = async (id: string) => {
    return request({
        url: `/api/note/${id}`,
        method: 'get'
    })
}

// 创建笔记
export const createNote = async (data: any) => {
    return request({
        url: '/api/note',
        method: 'post',
        data
    })
}

// 更新笔记
export const updateNote = async (id: string, data: any) => {
    return request({
        url: `/api/note/${id}`,
        method: 'put',
        data
    })
}

// 删除笔记
export const deleteNote = async (id: string) => {
    return request({
        url: `/api/note/${id}`,
        method: 'delete'
    })
}

export const upload = (data: FormData) => {
    const url = '/note/upload'
    return request.post(url, data, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}