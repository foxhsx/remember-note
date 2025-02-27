import path from 'path'
import shell from 'shelljs'

// 封装异步 exec
export const exec = async (command: string) => {
  return new Promise((resolve) => {
    shell.exec(command, { async: true }, data => {
      resolve(data)
    })
  })
}

// 不能放在同级，否则会触发服务 restar，因为这里有监听
const target = '../dump'
const targetPath = path.join(target)

/**
 * 数据导出并压缩打包
 * @param {string} db 数据库实例名称
 */
export const mongodump = async (db: string) => {
  await exec(`mongodump -h localhost:27017 -d ${db} -o ${targetPath}`)
  // await exec(`echo hsx@940625 | sudo mongodump -h localhost:27017 -u admin -p hsx@940625,. --authenticationDatabase=admin -d ${db} -o ${targetPath}`)
  const fileName = `${db}-dump.${new Date().getTime()}.tar.gz`
  return {
    fileName,
  }
}

// 删除压缩文件，使用 normalize API 来解析出正确路径
export const removeFile = async (fileName: string) => {
  process.chdir('../dump')
  await exec(`rm -rf ${fileName}`)
}
