import Router from 'koa-router'
import pkg from 'mongodb'
import { TodoList, Article, Knowledge } from '../models/model.js'
// import { put } from '../oss/index.js'
import cache from '../utils/cache.js'
import tokenUtils from '../utils/token.js'
import { getDate } from '../utils/date.js';
import fs from 'fs'
import path from 'path'
import { tinifyImg } from '../utils/tinify.js';
import { releaseBlog, cancelBlog } from '../utils/releaseBlog.js';
import dotenv from 'dotenv'

const __dirname = path.resolve();

// 加载环境变量
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

// AI 配置
const AI_CONFIG = {
  API_KEY: process.env.OPENAI_API_KEY || '',
  BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1',
  MODEL: process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B'
}

// 生成文章描述的提示词模板
const SUMMARY_PROMPT = `请分析以下文章内容，生成一段简明扼要的描述。要求：
1. 突出文章的核心主题和观点
2. 提取并强调文章中的关键词和重要概念
3. 保持描述简洁，控制在100字以内
4. 使用客观、专业的语言风格

文章内容：{content}
`

export interface ArticleType {
  _id: string,
  knowledgeId: string,
  title: string,
  content: string,
  articleId: string,
  update_time: string,
  isBlog: boolean,
  isDelete: boolean,
  sort: number,
  categoryId: string,
  parentId: string,
  fromUser: string,
  tags: string,
  summary: string,
}

type MenuKeys = Exclude<keyof ArticleType, '_id'>
type KeyFilteredArticle = {
  [K in MenuKeys]: ArticleType[K]
}

const { ObjectID } = pkg
const todoListModel = new TodoList()
const articleModel = new Article()
const knowledgeModel = new Knowledge()

function filterIdAndFromUser(data: {
  content?: string;
  _id?: string;
  fromUser?: string;
  __v?: number;
  update_time: string;
  isBlog?: boolean;
}[], isBlog?: boolean) {
  let res = data.map(item => {
    if (item?._id) {
      delete item._id
    }
    if (item?.fromUser) {
      delete item.fromUser
    }
    if (item?.__v !== undefined) {
      delete item.__v
    }
    item.update_time = new Date(item.update_time).toLocaleDateString();
    delete item?.content;
    return item
  })
  if (isBlog) {
    res = res.filter(item => item.isBlog)
  }
  return res
}

const noteRouter: Router = new Router({
  prefix: '/note',
})
// noteRouter.use(tokenUtils.verifyToken)
// 生成文章描述
noteRouter.post('/generateSummary', async (ctx) => {
  try {
    // 检查是否配置了 API Key
    if (!AI_CONFIG.API_KEY) {
      ctx.response.body = {
        code: 0,
        message: '请配置 API Key'
      }
      return;
    }

    const { content } = ctx.request.body;

    const response = await fetch(`${AI_CONFIG.BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'user',
            content: SUMMARY_PROMPT.replace('{content}', content)
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    })

    const data = await response.json()
    if (!response.ok) {
      const errorMessage = (data as { error?: { message: string } }).error?.message;
      throw new Error(errorMessage || '生成描述失败');
    }

    ctx.response.body = {
      code: 1,
      summary: (data as any).choices?.[0]?.message?.content || ''
    }
  } catch (error) {
    console.log('AI 生成描述失败:', error)
    ctx.response.body = {
      code: 0,
      message: '生成描述失败'
    }
  }
})

noteRouter.get('/articles', async (ctx) => {
  // 先查询全部
  try {
    const fromUser = cache.getCache('fromUser') || 'cecil_he';
    const { pageNumber, pageSize, isBlog } = ctx.request.query
    /**
     * 使用 skip api 来跳到要查询的数量前，然后使用 limit 来规定查询的个数
     */
    const pn = Number(pageNumber?.toString() || 1)
    const ps = Number(pageSize?.toString() || 10)
    const pageStart = (pn - 1) * ps;

    const doc: ArticleType[] = await Article.aggregate([
      // 匹配条件
      { $match: { isDelete: false, fromUser } },

      // 转换日期字符串为日期对象
      {
        $addFields: {
          convertedDate: {
            $switch: {
              branches: [
                // 处理数字类型（可能是时间戳）
                {
                  case: { $eq: [{ $type: "$update_time" }, "double"] },
                  then: { $toDate: "$update_time" }
                },
                // 处理字符串类型
                {
                  case: { $eq: [{ $type: "$update_time" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$update_time", regex: /^\d+$/ } },
                      then: { $toDate: { $toLong: "$update_time" } },
                      else: {
                        $dateFromString: {
                          dateString: "$update_time",
                          format: "%m/%d/%Y",
                          onError: { $toDate: "1970-01-01" }
                        }
                      }
                    }
                  }
                },
                // 处理已经是日期类型的情况
                {
                  case: { $eq: [{ $type: "$update_time" }, "date"] },
                  then: "$update_time"
                }
              ],
              default: { $toDate: "1970-01-01" } // 默认值，用于处理其他类型
            }
          }
        }
      },

      // 按转换后的日期排序
      { $sort: { convertedDate: -1 } },

      // 分页
      { $skip: pageStart },
      { $limit: ps },

      // 投影：选择需要的字段，模拟 lean() 的效果
      {
        $project: {
          articleId: 1,
          categoryId: 1,
          isBlog: 1,
          isDelete: 1,
          knowledgeId: 1,
          parentId: 1,
          sort: 1,
          title: 1,
          update_time: 1
        }
      }
    ]);
    const total = await Article.find({ isDelete: false, fromUser }).countDocuments();

    ctx.response.body = {
      code: 1,
      articleList: filterIdAndFromUser(doc, !!isBlog),
      pageNumber,
      pageSize,
      total,
    }
  } catch (error) {
    console.log(error)
    ctx.response.body = {
      code: 0,
      message: '服务出错，请联系管理员',
    }
  }
})

noteRouter.get('/getToDoList', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    // const { create_time } = ctx.request.query
    const data = await TodoList.find({ fromUser, create_time: getDate() })
    ctx.response.body = {
      code: 1,
      todoList: data,
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错，请联系管理员',
    }
  }
})

noteRouter.post('/addNeedToDo', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { content, create_time } = ctx.request.body
    // 先 set 再 save
    todoListModel.isNew = true
    todoListModel.set({ content, create_time, isFinished: false, fromUser })
    await todoListModel.save()
    ctx.response.body = {
      code: 1,
      message: '添加成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '添加失败',
    }
  }
})

noteRouter.put('/updateTodo', tokenUtils.verifyToken, async (ctx) => {
  try {
    const { isFinished, id, content } = ctx.request.body
    await TodoList.findByIdAndUpdate(ObjectID(id), {
      isFinished,
      content
    })
    ctx.response.body = {
      code: 1,
      message: '更新成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '更新失败',
    }
  }
})

noteRouter.post('/addArticle', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { knowledgeId = "", title, content, articleId, categoryId = "", parentId = "", sort } = ctx.request.body;
    const update_time = new Date().toLocaleDateString()
    /**
     * 这里需要设置这个属性，因为偷懒只实例化了一个 articleModel model，所以在多次调用时会有
     * `No document found for query "{ _id: 62ee96ea8f9edc0c738887b6 }" on model "Article"`
     * 的报错，在 save API 前，会检查 model 的 isNew 属性，如果为 true，则会插入文档，如果为
     * false，则会更新文档，那这里这个报错就是程序以为是要进行更新操作而导致的，新添加的数据在库里
     * 肯定没有，所以找不到是正常的
     */
    articleModel.isNew = true
    articleModel.set({ knowledgeId, title, content, articleId, update_time, isBlog: false, _id: new Date().getTime().toString(), isDelete: false, fromUser, categoryId, parentId, sort })
    await articleModel.save()
    ctx.response.body = {
      code: 1,
      message: '添加成功'
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '添加失败',
    }
  }
})

noteRouter.get('/getArticle', async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { articleId } = ctx.request.query
    const data = await Article.findOne({ articleId: articleId as string, fromUser })
    ctx.response.body = {
      code: 1,
      article: data,
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错',
    }
  }
})

noteRouter.put('/updateArticle/:articleId', tokenUtils.verifyToken, async (ctx) => {
  try {
    const { articleId } = ctx.params
    const { title, content, isDelete, tags, summary, isBlog, isRelease } = ctx.request.body;
    const updateData: {
      title?: string,
      content?: string,
      update_time?: string | number,
      isDelete?: boolean,
      tags?: string;
      summary?: string;
      isBlog?: boolean;
      isRelease?: boolean;
    } = {}
    if (title) {
      updateData.title = title
      updateData.update_time = new Date().toLocaleDateString()
    }
    if (content) {
      updateData.content = content
      updateData.update_time = new Date().toLocaleDateString()
    }
    if (isDelete !== undefined) {
      updateData.isDelete = isDelete
      updateData.update_time = new Date().toLocaleDateString()
    }
    if (tags) {
      updateData.tags = tags
    }
    if (summary) {
      updateData.summary = summary
    }
    if (isBlog !== undefined) {
      updateData.isBlog = isBlog;
    }

    await Article.findOneAndUpdate({ articleId }, updateData)
    const fromUser = cache.getCache('fromUser');
    const doc: ArticleType = await Article.findOne({ articleId: articleId as string, fromUser }).lean();

    if (isRelease) {
      try {
        if (isBlog !== undefined) {
          isBlog ? await releaseBlog(doc, isRelease) : await cancelBlog(articleId, doc.title, isRelease)
        } else if (isBlog === undefined && doc.isBlog !== undefined) {
          doc.isBlog ? await releaseBlog(doc, isRelease) : await cancelBlog(articleId, doc.title, isRelease)
        }

        if (isDelete || doc.isDelete) {
          await cancelBlog(articleId, doc.title, isRelease)
        }
        ctx.response.body = {
          code: 1,
          message: '更新成功，博客发布操作已完成'
        }
      } catch (error) {
        console.error('博客发布操作失败:', error);
        ctx.response.body = {
          code: 0,
          message: error || '更新失败'
        }
      }
    } else {
      ctx.response.body = {
        code: 1,
        message: '更新成功'
      }
    }
  } catch (error) {
    console.log(error, '更新失败')
    ctx.response.body = {
      code: 0,
      message: error || '更新失败',
    }
  }
})

noteRouter.delete('/deleteArticle/:articleIds', tokenUtils.verifyToken, async (ctx) => {
  try {
    const { articleIds } = ctx.params
    let condition;

    // 数组时，传回来是拼接的字符串
    if (articleIds.indexOf(',')) {
      condition = {
        articleId: { $in: articleIds.split(',') }
      }
    } else {
      condition = { articleId: articleIds }
    }
    await Article.deleteMany(condition)
    ctx.response.body = {
      code: 1,
      message: '删除成功'
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '删除失败'
    }
  }
})

noteRouter.get('/getNoteMenu/:knowledgeId', async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { knowledgeId } = ctx.params
    // 调用 lean API 就可以得到普通数组或者对象，返回 parentID 为空的所有值，这样就可以得到第一级的菜单
    const menus: KeyFilteredArticle[] = await Article.find({ knowledgeId, fromUser, parentId: '' }).lean()
    ctx.response.body = {
      code: 1,
      noteMenu: menus.map(({ title, articleId, isDelete, sort, categoryId }) => ({ title, articleId, isDelete, sort, categoryId })),
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.get('/getCategory/:knowledgeId/:categoryId', async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { categoryId, knowledgeId } = ctx.params
    // 调用 lean API 就可以得到普通数组或者对象
    const menus: KeyFilteredArticle[] = await Article.find({ parentId: categoryId, knowledgeId, fromUser }).lean()
    // 查询 当前的 category
    const category: KeyFilteredArticle[] = await Article.find({ categoryId, knowledgeId, fromUser }).lean()
    ctx.response.body = {
      code: 1,
      noteMenu: menus.map(({ title, articleId, isDelete, sort, parentId, categoryId }) => ({ title, articleId, isDelete, sort, parentId, categoryId })),
      category: category.map(({ title, articleId, isDelete, sort, parentId, categoryId }) => ({ title, articleId, isDelete, sort, parentId, categoryId })),
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.get('/getKnowledge', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const data = await Knowledge.find({ fromUser })
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

noteRouter.post('/addgKnowledge', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { knowledgeId, title } = ctx.request.body
    knowledgeModel.isNew = true
    knowledgeModel.set({ knowledgeId, title, _id: new Date().getTime().toString(), fromUser })
    await knowledgeModel.save()
    ctx.response.body = {
      code: 1,
      message: '添加成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.put('/updateKnowledge/:knowledgeId', tokenUtils.verifyToken, async (ctx) => {
  try {
    const { knowledgeId } = ctx.params;
    const { title } = ctx.request.body
    await Knowledge.findOneAndUpdate({ knowledgeId }, { title })
    ctx.response.body = {
      code: 1,
      message: '更新成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.delete('/deleteKnowledge/:knowledgeId', tokenUtils.verifyToken, async (ctx) => {
  try {
    // ! 不支持下划线，如果有下划线的 knowledgeId，则会有删除不掉的问题
    const { knowledgeId } = ctx.params;

    await Knowledge.deleteMany({ knowledgeId })
    await Article.deleteMany({ knowledgeId })
    ctx.response.body = {
      code: 1,
      message: '删除成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.delete('/deleteCategory/:knowledgeId/:categoryId', tokenUtils.verifyToken, async (ctx) => {
  try {
    const { categoryId, knowledgeId } = ctx.params;
    await Article.deleteMany({ knowledgeId, categoryId })
    await Article.deleteMany({ knowledgeId, parentId: categoryId })
    ctx.response.body = {
      code: 1,
      message: '删除成功',
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错'
    }
  }
})

noteRouter.get('/recycles', tokenUtils.verifyToken, async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { pageNumber, pageSize, search } = ctx.request.query
    /**
     * 使用 skip api 来跳到要查询的数量前，然后使用 limit 来规定查询的个数
     */
    const pn = Number(pageNumber?.toString() || 1)
    const ps = Number(pageSize?.toString() || 10)
    const pageStart = (pn - 1) * ps
    const reg = new RegExp((search || '').toString(), 'i')
    const doc = await Article.find({
      isDelete: true, $or: [
        { title: { $regex: reg } }
      ],
      fromUser,
    })
    const data = await Article.find({
      isDelete: true, $or: [
        { title: { $regex: reg } }
      ],
      fromUser,
    }).skip(pageStart).limit(ps).lean()

    ctx.response.body = {
      code: 1,
      recycles: data,
      pageNumber: pn,
      pageSize: ps,
      total: doc.length
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错，请联系管理员',
    }
  }
})

noteRouter.get('/findnote', async (ctx) => {
  try {
    const fromUser = cache.getCache('fromUser');
    const { searchValue } = ctx.request.query
    if (searchValue) {
      const reg = new RegExp(searchValue.toString(), 'i')
      const doc: ArticleType[] = await Article.find({
        $or: [
          { title: { $regex: reg } },
          { content: { $regex: reg } },
        ],
        fromUser,
      }).lean()
      ctx.response.body = {
        code: 1,
        data: doc.map(item => ({
          id: `/${item.knowledgeId}/${item.articleId}/`,
          title: item.title
        })),
      }
    } else {
      ctx.response.body = {
        code: 0,
        message: '请输入需要查询的关键字'
      }
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: '服务出错，请联系管理员'
    }
  }
})

noteRouter.post('/upload', tokenUtils.verifyToken, async (ctx) => {
  try {
    const file = Object.assign(ctx.request.files?.['file[]'] || {})
    if (Object.keys(file).length) {
      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const publicDir = path.join(__dirname, '../public');
      const fileName = new Date().getTime();
      const assetFile = `${publicDir}/imgs/${fileName}.webp`;
      const stream = fs.readFileSync(file.filepath)
      
      if (!fs.existsSync(`${publicDir}/imgs/`)) {
        fs.mkdirSync(`${publicDir}/imgs/`, { recursive: true });
      }

      try {
        const tinifyStream = await tinifyImg(stream);
        if (Buffer.isBuffer(tinifyStream)) {
          // tinifyStream 是一个 Buffer 对象
          await fs.writeFile(assetFile, tinifyStream, (err) => {
            if (err) {
              console.error('Failed to generate webp image:', err);
              return;
            }
            console.log('Webp Image generated successfully!');
          });
        } else if (tinifyStream instanceof fs.ReadStream) {
          // tinifyStream 是一个流（Stream）对象
          const chunks: Array<string | Buffer> = [];
          tinifyStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          tinifyStream.on('end', async () => {
            const webpData = Buffer.concat(chunks.map(chunk => Buffer.from(chunk))); // 将数据块合并成一个完整的 Buffer

            await fs.writeFile(assetFile, webpData, (err) => {
              if (err) {
                console.error('Failed to generate webp image:', err);
                return;
              }
              console.log('Webp Image generated successfully!');
            });
          });
        } else {
          // tinifyStream 既不是 Buffer 对象也不是流（Stream）对象
          console.error('Invalid tinifyStream type');
        }
      } catch (error) {
        console.log(error);
      }

      ctx.response.body = {
        code: 1,
        data: {
          fileName: file.originalFilename,
          url: `/imgs/${fileName}.webp`,
          code: 200
        },
        message: '上传成功',
      }
    } else {
      ctx.response.body = {
        code: 0,
        message: '图片上传错误，请检查'
      }
    }
  } catch (error) {
    ctx.response.body = {
      code: 0,
      message: error
    }
  }
})

export default noteRouter
