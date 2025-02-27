import genSchema from './genSchema.js'

export const todoListSchema = genSchema({
  content: String,
  isFinished: Boolean,
  fromUser: String,
  create_time: String,
})

export const articleSchema = genSchema({
  _id: String,
  knowledgeId: String,
  title: String,
  content: String,
  articleId: String,
  update_time: String,
  isBlog: Boolean,
  isDelete: Boolean,
  fromUser: String,
  sort: Number,
  parentId: String,
  categoryId: String,
  tags: String,
  summary: String,
})

const knowledgeSchemaType = {
  knowledgeId: String,
  title: String,
  _id: String,
  fromUser: String,
}
export const knowledgeSchema = genSchema(knowledgeSchemaType)
