import { normalize } from 'path'
import OSS from 'ali-oss'
import config from './ossConfig.js'

const ossClient = new OSS(config)

// 上传文件
export async function put(fileName: string, filePath: string, folder = 'imgs') {
  try {
    // filePath 建议为本地的完整路径
    const file = folder === 'imgs' ? `${fileName}.png` : fileName;
    const result = await ossClient.put(`hsxblog-static/${folder}/${file}`, normalize(filePath))
    return result
  } catch (error) {
    console.log(error);
  }
}
