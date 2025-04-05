import fs from 'fs';
import path from 'path'
import shell from 'shelljs'
import dotenv from 'dotenv'

const __dirname = path.resolve();

// 加载环境变量
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

interface TParams {
  title: string;
  content: string
  articleId: string;
  update_time: string;
  fromUser: string;
  summary: string;
  tags: string;
}

const getGitError = (result: shell.ShellString): Error | null => {
  // 如果命令执行成功，或者是一些正常的状态提示（如 Already up to date），则返回 null
  if (result.code === 0 || result.stderr === '') {
    return null;
  }
  // 只有在真正出现错误时才创建错误对象
  const error = new Error(`执行命令出错: ${result.stderr}`);
  console.error(error.message);
  return error;
}

// 检查并设置 git 用户配置
const checkAndSetGitConfig = async () => {
  const userName = process.env.GIT_USER_NAME;
  const userEmail = process.env.GIT_USER_EMAIL;

  if (!userName || !userEmail) {
    return new Error('请在配置文件中设置 Git 的用户名 GIT_USER_NAME 和邮件 GIT_USER_EMAIL 参数');
  }

  // 检查是否已配置用户名
  const nameStatus = await shell.exec('git config --global user.name');
  console.log(nameStatus, 'nameStatus')
  if (nameStatus.code !== 0 || !nameStatus.stdout.trim()) {
    const setNameStatus = await shell.exec(`git config --global user.name "${userName}"`)
    const nameError = getGitError(setNameStatus);
    if (nameError) return nameError;
  }

  // 检查是否已配置邮箱
  const emailStatus = await shell.exec('git config --global user.email');
  console.log(emailStatus, 'emailStatus')
  if (emailStatus.code !== 0 || !emailStatus.stdout.trim()) {
    const setEmailStatus = await shell.exec(`git config --global user.email "${userEmail}"`)
    const emailError = getGitError(setEmailStatus);
    if (emailError) return emailError;
  }

  return null;
}

// 执行 git push 变更
const gitShell = async (commit: string, isRelease: boolean): Promise<Error | null> => {
  const repoUrl = process.env.GITHUB_REPO_URL;
  const repoName = process.env.GITHUB_REPO_NAME;
  const repoContentPath = process.env.GITHUB_REPO_CONTENT_PATH;

  if (!repoUrl) {
    return Promise.reject('请在环境变量中配置 Github 仓库地址 GITHUB_REPO_URL 参数');
  }
  if (!repoName) {
    return Promise.reject('请在环境变量中配置仓库名称 GITHUB_REPO_NAME 参数');
  }
  if (!repoContentPath) {
    return Promise.reject('请在环境变量中配置博客文章路径 GITHUB_REPO_CONTENT_PATH 参数');
  }

  // 检查并设置 git 配置
  const configError = await checkAndSetGitConfig();
  if (configError) return configError;

  // 进入到根目录
  process.chdir("../");
  const rootDir = process.cwd();
  const repoPath = path.join(rootDir, repoName);

  console.log(repoPath, fs.existsSync(repoPath), 'repoPath')

  // 检查仓库是否存在
  if (!fs.existsSync(repoPath)) {
    console.log(`Cloning repository ${repoName}...`);
    const cloneStatus = await shell.exec(`git clone ${repoUrl} ${repoName}`);
    const cloneError = getGitError(cloneStatus);
    if (cloneError) return cloneError;
  }

  // 进入到仓库目录
  process.chdir(repoPath);
  const blogDirectory = path.join(repoPath, repoContentPath || 'content/post/');

  // 确保博客目录存在
  if (!fs.existsSync(blogDirectory)) {
    fs.mkdirSync(blogDirectory, { recursive: true });
  }

  const gitPullStatus = await shell.exec('git pull');
  const pullError = getGitError(gitPullStatus);
  if (pullError) return pullError;
  const gitStatus = await shell.exec('git status');
  const statusError = getGitError(gitStatus);
  if (statusError) return statusError;
  const gitAddStatus = await shell.exec(`git add ${blogDirectory}`);
  const addError = getGitError(gitAddStatus);
  if (addError) return addError;
  const gitCommitStatus = await shell.exec(`git commit -m '${commit}'`);
  const commitError = getGitError(gitCommitStatus);
  if (commitError) return commitError;
  const gitPushStatus = await shell.exec('git push')
  const pushError = getGitError(gitPushStatus);
  if (pushError) return pushError;
  // isRelease 参数不再用于创建 tag
  return null;
}

export async function releaseBlog(params: TParams, isRelease: boolean) {
  try {
    const date = new Date(params.update_time);
    const formattedDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    
    // 提取并处理文章中的图片
    const { content: processedContent, imageUrls } = await extractAndProcessImages(params.content);
    
    const template = `---
title: ${params.title}
date: ${formattedDate}
tags: [${params.tags}]
draft: false
description: ${params.summary}
---

${processedContent}
`

    const repoUrl = process.env.GITHUB_REPO_URL;
    const repoName = process.env.GITHUB_REPO_NAME;
    const repoContentPath = process.env.GITHUB_REPO_CONTENT_PATH;

    if (!repoUrl) {
      return Promise.reject('请在环境变量中配置 Github 仓库地址 GITHUB_REPO_URL 参数');
    }
    if (!repoName) {
      return Promise.reject('请在环境变量中配置仓库名称 GITHUB_REPO_NAME 参数');
    }
    if (!repoContentPath) {
      return Promise.reject('请在环境变量中配置博客文章路径 GITHUB_REPO_CONTENT_PATH 参数');
    }

    // 进入到根目录
    process.chdir("../");
    const rootDir = process.cwd();
    const repoPath = path.join(rootDir, repoName);

    // 检查仓库是否存在，不存在则克隆
    if (!fs.existsSync(repoPath)) {
      console.log(`Cloning repository ${repoName}...`);
      const cloneStatus = await shell.exec(`git clone ${repoUrl}`);
      const cloneError = getGitError(cloneStatus);
      if (cloneError) return Promise.reject(cloneError);
    }

    // 进入仓库目录
    process.chdir(repoPath);

    // 更新仓库到最新状态
    const pullStatus = await shell.exec('git pull');
    const pullError = getGitError(pullStatus);
    if (pullError) return Promise.reject(pullError);

    // 使用 promises 版本的 fs 操作，确保异步操作的顺序性
    // 确保博客目录存在
    const blogDirectory = path.join(repoPath, repoContentPath || 'content/post/');
    if (!fs.existsSync(blogDirectory)) {
      await fs.promises.mkdir(blogDirectory, { recursive: true });
    }

    // 创建以文章标题命名的文件夹
    const articleFolder = path.join(blogDirectory, sanitizeFileName(params.title));
    if (!fs.existsSync(articleFolder)) {
      await fs.promises.mkdir(articleFolder, { recursive: true });
    }

    // 如果有图片，创建 assets 目录并下载图片
    if (imageUrls.length > 0) {
      const assetsFolder = path.join(articleFolder, 'assets');
      if (!fs.existsSync(assetsFolder)) {
        await fs.promises.mkdir(assetsFolder, { recursive: true });
      }
      
      // 确保目录创建成功后再下载图片
      await downloadImages(imageUrls, assetsFolder);
    }

    // 指定输出文件名为 index.md
    const outputPath = path.join(articleFolder, 'index.md');

    // 使用 promises 版本的 fs.writeFile
    await fs.promises.writeFile(outputPath, template);
    console.log('MD file generated successfully!');
    
    // 执行 git 操作
    const gitError = await gitShell(`更新 ${params.title}`, isRelease);
    if (gitError) {
      return Promise.reject(gitError);
    }
    
    return null;
  } catch (error) {
    console.error('发布博客失败:', error);
    return Promise.reject(error);
  }
}

// 提取并处理文章中的图片
async function extractAndProcessImages(content: string): Promise<{ content: string, imageUrls: Array<{url: string, filename: string}> }> {
  const imageUrls: Array<{url: string, filename: string}> = [];
  const imgRegex = /!\[.*?\]\((.*?)\)/g;
  const htmlImgRegex = /<img.*?src="(.*?)".*?>/g;
  
  let match;
  let processedContent = content;
  
  // 处理 Markdown 格式的图片
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('assets/')) {
      const filename = path.basename(url);
      imageUrls.push({ url, filename });
      // 替换图片路径为相对路径
      processedContent = processedContent.replace(url, `assets/${filename}`);
    }
  }
  
  // 处理 HTML 格式的图片
  while ((match = htmlImgRegex.exec(content)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('assets/')) {
      const filename = path.basename(url);
      imageUrls.push({ url, filename });
      // 替换图片路径为相对路径
      processedContent = processedContent.replace(url, `assets/${filename}`);
    }
  }
  
  return { content: processedContent, imageUrls };
}

// 下载图片到指定目录
async function downloadImages(imageUrls: Array<{url: string, filename: string}>, assetsFolder: string): Promise<void> {
  try {
    // 确保 assets 目录存在
    if (!fs.existsSync(assetsFolder)) {
      await fs.promises.mkdir(assetsFolder, { recursive: true });
    }
    
    const downloadPromises = imageUrls.map(async ({ url, filename }) => {
      try {
        // 处理相对路径的图片 URL
        let fullUrl = url;
        if (url.startsWith('/')) {
          // 假设这是相对于网站根目录的路径，需要添加域名
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          fullUrl = `${baseUrl}${url}`;
        } else if (!url.startsWith('http')) {
          // 如果不是绝对路径也不是以 http 开头，可能是相对路径
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          fullUrl = `${baseUrl}/${url}`;
        }
        
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${fullUrl}`);
        }
        
        const buffer = await response.arrayBuffer();
        const outputPath = path.join(assetsFolder, filename);
        
        await fs.promises.writeFile(outputPath, Buffer.from(buffer));
        console.log(`Downloaded image: ${filename}`);
      } catch (error) {
        console.error(`Error downloading image ${url}:`, error);
        // 不抛出错误，继续处理其他图片
      }
    });
    
    await Promise.all(downloadPromises);
  } catch (error) {
    console.error('下载图片过程中出错:', error);
    throw error; // 重新抛出错误，让调用者知道出了问题
  }
}

// 清理文件名，移除不合法字符
function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '-') // 替换不合法字符
    .replace(/\s+/g, '-')           // 替换空格为连字符
    .replace(/-+/g, '-')            // 替换多个连字符为单个连字符
    .trim();
}

export const cancelBlog = async (articleId: string, title: string, isRelease: boolean) => {
  try {
    // 加载环境变量
    dotenv.config();
    const repoName = process.env.GITHUB_REPO_NAME;
    const repoContentPath = process.env.GITHUB_REPO_CONTENT_PATH;
    
    if (!repoName) {
      return Promise.reject('请在环境变量中配置仓库名称 GITHUB_REPO_NAME 参数');
    }
    if (!repoContentPath) {
      return Promise.reject('请在环境变量中配置博客文章路径 GITHUB_REPO_CONTENT_PATH 参数');
    }

    // 指定文章目录
    const rootDir = path.resolve(__dirname, '../..');
    const blogDirectory = path.join(rootDir, repoName, repoContentPath || 'content/post/');
    const articleFolder = path.join(blogDirectory, sanitizeFileName(title));

    // 检查目录是否存在
    if (fs.existsSync(articleFolder)) {
      // 使用 promises 版本的 fs.rm
      await fs.promises.rm(articleFolder, { recursive: true, force: true });
      console.log('文章目录已成功删除');
    } else {
      console.log('文章目录不存在，无需删除');
    }
    
    const gitError = await gitShell(`删除 ${title}`, isRelease);
    if (gitError) {
      return Promise.reject(gitError);
    }
    
    return null;
  } catch (error) {
    console.error('取消博客发布失败:', error);
    return Promise.reject(error);
  }
}
