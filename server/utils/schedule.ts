import schedule from 'node-schedule'
import { put } from '../oss/index.js'
import { mongodump, removeFile, exec } from './shell.js'
import dotenv from 'dotenv'
import path from 'path';

const __dirname = path.resolve();

// 加载环境变量
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

const run = async () => {
  console.log('start upload and remove....')
  const st = new Date().getTime()
  // 执行shell打包压缩mongodb-data
  const { fileName } = await mongodump('notes');

  // 将当前工作目录切换至 dump
  process.chdir('../dump')
  // 然后在执行打包
  await exec(`tar -zcvf ${fileName} ./notes`)
  // 打包后上传
  await put(fileName, `./${fileName}`, 'db')
  // 上传后删除本地打包文件
  await removeFile(fileName)
  const et = new Date().getTime()
  console.log(`打包压缩上传耗时：${(et - st) / 1000}s`)
}

function main() {
  console.log(`任务已启动！时间：${new Date().toLocaleString()}`);
  console.log('任务正在运行...');

  if (!process.env.ALI_OSS_ACCESS_KEY_ID) {
    console.error('请先配置环境变量：ALI_OSS_ACCESS_KEY_ID')
    return
  }

  if (!process.env.ALI_OSS_ACCESS_KEY_SECRET) {
    console.error('ALI_OSS_ACCESS_KEY_SECRET')
    return
  }


  // 每周一凌晨3点30分执行备份，需要单独启动
  schedule.scheduleJob('0 23 * * *', async () => {
    run()
  })
}

main()
