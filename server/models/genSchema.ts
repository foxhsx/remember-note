import mongoose from 'mongoose'
import { Schema } from 'mongoose'

export default function genSchema(schema: Record<string, unknown>): Schema {
  return new mongoose.Schema(schema)
}
