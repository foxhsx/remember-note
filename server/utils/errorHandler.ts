import Koa from 'koa'

export default (app: Koa) => {
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (error: any) {
      ctx.response.body = {
        code: error.status || 500,
        message: error.message || '服务出错了！',
      }
      ctx.app.emit('error', error, ctx)
    }
  })
}
