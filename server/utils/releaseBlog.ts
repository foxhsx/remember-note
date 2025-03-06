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
  const date = new Date(params.update_time);
  const formattedDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  const template = `---
title: ${params.title}
date: ${formattedDate}
tags: [${params.tags}]
draft: false
description: ${params.summary}
---

${params.content}
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

  // 确保博客目录存在
  const blogDirectory = path.join(repoPath, repoContentPath || 'content/post/');
  if (!fs.existsSync(blogDirectory)) {
    fs.mkdirSync(blogDirectory, { recursive: true });
  }

  // 指定输出文件名
  const outputFile = `${params.title}.md`;
  const outputPath = path.join(blogDirectory, outputFile);

  // 生成 md 文件
  return new Promise((resolve, reject) => {
    fs.writeFile(outputPath, template, async (err) => {
      if (err) {
        console.error('Failed to generate MD file:', err);
        reject(err);
        return;
      }
      console.log('MD file generated successfully!');
      const gitError = await gitShell(`更新 ${params.title}`, isRelease);
      if (gitError) {
        reject(gitError);
        return;
      }
      resolve(null);
    });
  });
}

export const cancelBlog = (articleId: string, title: string, isRelease: boolean) => {
  // 加载环境变量
  dotenv.config();
  const repoName = process.env.GITHUB_REPO_NAME;
  if (!repoName) {
    return Promise.reject('请在环境变量中配置仓库名称 GITHUB_REPO_NAME 参数');
  }

  // 指定输出目录和文件名
  const outputFile = `${articleId}.mdx`;
  const rootDir = path.resolve(__dirname, '../..');
  const blogDirectory = path.join(rootDir, repoName, 'data/blog');

  return new Promise((resolve, reject) => {
    fs.unlink(`${blogDirectory}/${outputFile}`, async (err) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      console.log('文件已成功删除');
      const gitError = await gitShell(`删除 ${title}`, isRelease);
      if (gitError) {
        reject(gitError);
        return;
      }
      resolve(null);
    });
  });
}
