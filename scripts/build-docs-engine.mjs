#!/usr/bin/env node
// ── docs/engine 生成器 ─────────────────────────────────────────────────────
//
// 为什么存在：
//   GitHub Pages 直接发布 ./docs 目录、没有构建步骤，而浏览器只能加载 .js
//   模块（不能加载 .mjs）。所以页面需要一份 src/core/*.mjs 的 .js 镜像。
//
// 纪律：
//   docs/engine/ 是**产物目录** —— 请勿手改。
//   改完 src/core/ 下的源码后运行：npm run build:docs
//
// 绑定（这才是本脚本的重点）：
//   手工维护的同源副本没有机械绑定 ⇒ **必然漂移**（实测：页面曾长期跑着一个
//   三周前的旧引擎）。故此处不靠人眼对账：
//     · 产物头部自带"由本脚本生成"标记；
//     · test/docs-engine-sync.test.mjs 断言产物与 src 逐字节一致 ⇒ 一漂就红。
//
// 用法：
//   node scripts/build-docs-engine.mjs           # 生成 / 覆盖（幂等）
//   node scripts/build-docs-engine.mjs --check   # 只校验：不一致则退出码 1

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src', 'core');
const OUT_DIR = join(ROOT, 'docs', 'engine');

// 页面加载面：从入口 engine 出发，按**静态相对导入的传递闭包**自动发现
// （不硬编码名单 —— 新增模块只要被 engine 链式 import，就自动进镜像，不会漏）
export function relativeSpecifiers(text) {
  const out = [];
  const re = /(?:from|import)\s*\(?\s*['"](\.\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].replace(/^\.\//, ''));
  return out;
}

export function discoverModules(entry = 'engine') {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const text = readFileSync(join(SRC_DIR, `${name}.mjs`), 'utf8');
    for (const spec of relativeSpecifiers(text)) queue.push(spec.replace(/\.mjs$/, ''));
  }
  return [...seen];
}

function eolOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

// 把 .mjs 相对导入改写为 .js（唯一必需的转换：`from './x.mjs'` → `from './x.js'`）
export function rewriteSpecifiers(text) {
  return text
    .replace(/(from\s*['"]\.\/[A-Za-z0-9_./-]+)\.mjs(['"])/g, '$1.js$2')
    .replace(/(import\s*['"]\.\/[A-Za-z0-9_./-]+)\.mjs(['"])/g, '$1.js$2');
}

export function banner(srcName, eol) {
  return [
    '// ⚠️ 本文件由 scripts/build-docs-engine.mjs 生成，请勿手改。',
    `// 源：src/core/${srcName}.mjs ｜ 改源码后运行 npm run build:docs`,
    '// 一致性由 test/docs-engine-sync.test.mjs 断言（手工镜像必漂移，故不靠人眼对账）。',
    '',
  ].join(eol);
}

// 产出全部目标文件内容：返回 [{ file, content, srcName }]
export function buildAll() {
  return discoverModules().map((name) => {
    const srcPath = join(SRC_DIR, `${name}.mjs`);
    const src = readFileSync(srcPath, 'utf8');
    const eol = eolOf(src);
    return {
      srcName: name,
      file: join(OUT_DIR, `${name}.js`),
      content: banner(name, eol) + rewriteSpecifiers(src),
    };
  });
}

// 未镜像但被引用的模块（应为空；非空 ⇒ 页面会在浏览器里 404）
export function missingMirrors() {
  return discoverModules()
    .filter((name) => !existsSync(join(OUT_DIR, `${name}.js`)))
    .map((name) => `docs/engine/${name}.js`);
}

// 产物里的**全部**导入说明符（含非相对形态，用于检出浏览器加载不了的写法）
export function allSpecifiers(text) {
  const out = [];
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

// 产物里的“浏览器加载不了”的导入：裸包名（如 node:fs / 依赖名）在无 importmap 的页面里必 404
export function browserUnsafeImports() {
  const bad = [];
  for (const name of discoverModules()) {
    const file = join(OUT_DIR, `${name}.js`);
    if (!existsSync(file)) continue;
    for (const spec of allSpecifiers(readFileSync(file, 'utf8'))) {
      if (!spec.startsWith('./')) bad.push(`docs/engine/${name}.js → '${spec}'（浏览器无法解析裸说明符）`);
    }
  }
  return bad;
}

// 比对产物与磁盘：返回不一致项列表（空 = 一致）
//
// 判据是**内容**，不是字节 —— 行尾（CRLF/LF）是 checkout 产物而非内容：
// 本仓 core.autocrlf=true，索引里存 LF、工作树可能是 CRLF，故两侧都先归一到 LF 再比。
// 否则换一台机器 clone 后断言会假红（把"环境差异"误报成"漂移"）。
export function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

export function diffAgainstDisk() {
  const drift = [];
  for (const item of buildAll()) {
    if (!existsSync(item.file)) {
      drift.push(`${item.file} —— 缺失`);
      continue;
    }
    const disk = normalizeEol(readFileSync(item.file, 'utf8'));
    if (disk !== normalizeEol(item.content)) {
      drift.push(`${item.file} —— 内容与 src/core/${item.srcName}.mjs 不一致`);
    }
  }
  return drift;
}

function main(argv) {
  const check = argv.includes('--check');
  const modules = discoverModules();

  if (check) {
    const drift = [...diffAgainstDisk(), ...browserUnsafeImports()];
    if (drift.length === 0) {
      console.log(`✅ docs/engine 与 src/core 一致（${modules.length} 个模块：${modules.join(' / ')}）`);
      return 0;
    }
    console.error('❌ docs/engine 已漂移，运行 npm run build:docs 重新生成：');
    for (const d of drift) console.error(`   · ${d}`);
    return 1;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const built = buildAll();
  for (const item of built) writeFileSync(item.file, item.content, 'utf8');
  console.log(`✅ 已生成 ${built.length} 个模块 → docs/engine/`);
  for (const item of built) console.log(`   · ${item.srcName}.mjs → docs/engine/${item.srcName}.js`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
