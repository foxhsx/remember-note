import dotenv from 'dotenv'
import path from 'path';

const __dirname = path.resolve();

// 加载环境变量
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

export default {
  region: process.env.ALI_OSS_REGION || 'cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID || 'default-access-key-id',
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET || 'default-access-key-secret',
  bucket: process.env.ALI_OSS_BUCKET,
  secure: process.env.ALI_OSS_SECURE === 'true' || true, // 需要使用HTTPS访问OSS
}
