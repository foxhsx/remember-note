import Koa from 'koa'
import koaBody from 'koa-body'
import cors from 'koa2-cors'
import koaStatic from 'koa-static'
import userRouter from './routers/user.js'
import errorHandler from './utils/errorHandler.js'
import noteRouter from './routers/note.js'
import path from 'path'

const app = new Koa()
// 静态资源目录
const staticPath = './public'
const __dirname = path.resolve();

// 访问时不需要加上 pubilc，直接访问该目录中的文件及文件夹即可
app.use(koaStatic(path.join(__dirname, staticPath), {
  index: false,  // 默认为true  访问的文件为index.html  可以修改为别的文件名或者false
  hidden: false,  // 是否同意传输隐藏文件
}))
// 设置响应头，解决跨域问题
app.use(cors())
// 解析 body 请求体
app.use(koaBody({
  multipart: true,  // 开启后才能接受到上传的文件信息
}))
// 处理统一错误
errorHandler(app)
// user 模块
app.use(userRouter.routes())
// note 模块
app.use(noteRouter.routes())

app.listen(3333, '0.0.0.0', () => console.log('server is 3333'))
