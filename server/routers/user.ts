import Router from 'koa-router'
import md5Pwd from '../utils/md5Pwd.js'
import tokenUtils from '../utils/token.js'
import { User } from '../models/model.js'
import pkg from 'mongodb'
import cache from '../utils/cache.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

interface IData {
  [key: string]: any;
}

interface IUserData {
  _id?: string
  name?: string
  password?: string
  email?: string
  token?: string
  hobby?: string[]
  avatar?: string
}

const { ObjectID } = pkg

const userRouter: Router = new Router({
  prefix: '/user',
})

userRouter.post('/register', async (ctx) => {
  try {
    const { name, password, email } = ctx.request.body
    // TODO 查重
    const findUser = await User.findOne({ name })
    if (findUser) {
      ctx.response.body = {
        code: 0,
        message: '用户名重复',
      }
    } else {
      const token = tokenUtils.genToken(name)
      const userModel = new User({ name, password: md5Pwd(password), email, token })
      const data: IData = await userModel.save()
      ctx.response.body = { name: data.name, email: data.email, code: 1, token, id: data?._id }
    }
  } catch (error) {
    ctx.response.body = error
  }
})

userRouter.post('/login', async (ctx) => {
  try {
    const { name, password } = ctx.request.body
    // 查找用户是否存在
    const findUser: IUserData = await User.findOne({ name, password: md5Pwd(password) })

    if (findUser) {
      cache.setCache('fromUser', name)
      ctx.response.body = {
        code: 1,
        name,
        email: findUser?.email,
        token: findUser?.token,
        id: findUser?._id,
        hobby: findUser?.hobby || [],
        avatar: findUser?.avatar || '',
      }
    } else {
      ctx.response.body = {
        code: 0,
        message: '用户名或密码错误',
      }
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '用户名或密码错误',
    }
  }
})

userRouter.put('/userInfo/:id', async (ctx) => {
  try {
    const { id } = ctx.params
    const { name, email, hobby } = ctx.request.body
    await User.findByIdAndUpdate(ObjectID(id), { name, email, hobby })
    ctx.response.body = {
      code: 1,
      message: '更新成功'
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '更新失败'
    }
  }
})

userRouter.get('/userInfo/:id', async (ctx) => {
  try {
    const { id } = ctx.params
    const data: IData = await User.findById(ObjectID(id)).lean()
    delete data?.password
    ctx.response.body = {
      code: 1,
      data,
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

userRouter.post('/avatar/:id', async (ctx) => {
  try {
    const { id } = ctx.params
    const file = ctx.request.files?.avatar;

    console.log(id, file, 'file')

    if (!file) {
      ctx.response.body = {
        code: 0,
        message: '请上传头像文件'
      }
      return
    }

    // 获取当前文件的目录路径
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)

    // 确保 avatar 目录存在
    const avatarDir = path.join(__dirname, '../public/avatar')
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true })
    }

    // 生成文件名并保存文件
    const ext = path.extname((file as any).originalFilename || '')
    const fileName = `${id}${ext}`
    const filePath = path.join(avatarDir, fileName)

    // 读取临时文件并写入到目标位置
    const reader = fs.createReadStream((file as any).filepath)
    const writer = fs.createWriteStream(filePath)
    await new Promise((resolve, reject) => {
      reader.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // 更新用户头像信息
    const avatarUrl = `/avatar/${fileName}`
    await User.findByIdAndUpdate(ObjectID(id), { avatar: avatarUrl })

    ctx.response.body = {
      code: 1,
      data: {
        url: avatarUrl
      },
      message: '头像更新成功'
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '头像更新失败'
    }
  }
})

export default userRouter
