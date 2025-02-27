// 引入 mongoose
import mongoose from 'mongoose'
import { articleSchema, knowledgeSchema, todoListSchema } from './noteSchema.js'
import userSchema from './userSchema.js';
// 连接数据库，并且使用 note 这个集合，没有会自动在数据库中创建
// authSource 是增加权限，否则无法连接成功，如果这里连接不成功，可以将 encode 不要了，把密码中的 @ 替换为 %40
// const DB_URL = 'mongodb://admin:hsx%40940625,.@8.142.108.138:27017/notes?authSource=admin'
// const DB_URL = 'mongodb://localhost:27017/notes'
const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notes'

// findByIdAndUpdate()内部会使用findAndModify驱动，驱动即将被废弃，如不设置则在使用此类 API 时会警告
mongoose.set('useFindAndModify', false)
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
const db = mongoose.connection
db.on('connected', () => {
  console.log('Mongodb connected')
})

db.on('error', (error) => {
  console.log('Error connecting database. Msg: ' + error)
})

// 模块
export const User = mongoose.model('User', userSchema)
export const TodoList = mongoose.model('TodoListSchema', todoListSchema)
export const Article = mongoose.model('Article', articleSchema)
export const Knowledge = mongoose.model('Knowledge', knowledgeSchema)

function getModel(name: string) {
  return mongoose.model(name)
}

export default getModel
