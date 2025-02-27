import tinify from 'tinify'
import dotenv from 'dotenv'
import path from 'path';

const __dirname = path.resolve();

// 加载环境变量
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

tinify.key = process.env.TINIFY_API_KEY || '';
tinify.validate(function (err) {
  if (err) {
    console.log(`API 错误：${err}`)
  }
})

export const tinifyImg = async (fromBuffer: Buffer) => {
  const stream = await tinify.fromBuffer(fromBuffer).convert({
    type: "image/webp"
  }).toBuffer()
  return stream;
};
