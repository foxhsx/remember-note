// register-ts-node.js
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// 注册 ts-node/esm 加载器
register('ts-node/esm', pathToFileURL('./'));