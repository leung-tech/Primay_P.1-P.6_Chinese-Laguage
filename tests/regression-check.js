#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const htmlFiles = fs.readdirSync(root).filter(name => name.endsWith('.html')).sort();
const failures = [];
const warnings = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function checkInlineJavaScript(fileName, content) {
  const blocks = [...content.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((match, index) => {
    const scriptPath = path.join('/tmp', `primary-chinese-${fileName}-${index}.js`);
    fs.writeFileSync(scriptPath, match[1]);
    try {
      execFileSync('node', ['--check', scriptPath], { stdio: 'pipe' });
    } catch (error) {
      failures.push(`${fileName}: 第 ${index + 1} 段內嵌 JavaScript 語法錯誤`);
    } finally {
      try { fs.unlinkSync(scriptPath); } catch (_) {}
    }
  });
}

htmlFiles.forEach(fileName => {
  const content = fs.readFileSync(path.join(root, fileName), 'utf8');
  expect(content.includes('src="diagnostics.js"'), `${fileName}: 未載入 diagnostics.js`);
  expect(content.includes('href="mobile-accessibility.css"'), `${fileName}: 未載入 mobile-accessibility.css`);
  checkInlineJavaScript(fileName, content);
});

// 聆聽基礎版保留已驗證的專屬故事播放器（VoiceManager）；其餘語音頁統一使用外部共用管理器。
for (const fileName of htmlFiles.filter(name => name !== 'index.html' && name !== 'listen_basic.html')) {
  const content = fs.readFileSync(path.join(root, fileName), 'utf8');
  expect(content.includes('src="voice-manager.js"'), `${fileName}: 未載入 voice-manager.js`);
}

const directUtterancePages = htmlFiles.filter(fileName => {
  const content = fs.readFileSync(path.join(root, fileName), 'utf8');
  return content.includes('new SpeechSynthesisUtterance');
});
const unapprovedDirectUtterancePages = directUtterancePages.filter(fileName => fileName !== 'listen_basic.html');
expect(unapprovedDirectUtterancePages.length === 0, `仍有未遷移的直接語音物件頁面：${unapprovedDirectUtterancePages.join(', ')}`);

const longCourseNavigationPages = [
  'read_standard.html', 'read_advanced.html',
  'listen_standard.html', 'listen_advanced.html',
  'sentence_standard.html', 'sentence_advanced.html',
  'paragraph_standard.html', 'paragraph_advanced.html',
  'write_standard.html', 'write_advanced.html'
];
longCourseNavigationPages.forEach(fileName => {
  const content = fs.readFileSync(path.join(root, fileName), 'utf8');
  expect(content.includes('src="mobile-long-course-nav.js"'), `${fileName}: 未載入 mobile-long-course-nav.js`);
});

const navigationExpectations = {
  'word_basic.html': 'continueLearning',
  'read_basic.html': 'continueReading',
  'listen_basic.html': 'continueListenLearning',
  'sentence_basic.html': 'continueSentenceLearning',
  'paragraph_basic.html': 'continueParagraphLearning',
  'write_basic.html': 'continueWriting'
};

Object.entries(navigationExpectations).forEach(([fileName, marker]) => {
  const content = fs.readFileSync(path.join(root, fileName), 'utf8');
  expect(content.includes(marker), `${fileName}: 找不到手機續學入口 ${marker}`);
});

const indexContent = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
expect(indexContent.includes('src="student-tools.js"'), 'index.html: 未載入 student-tools.js');
expect(indexContent.includes('student-tools-hub') === false, 'index.html: 學生工具應由獨立模組動態建立，避免登入前顯示');

const diagnosticsPath = path.join(root, 'diagnostics.js');
expect(fs.existsSync(diagnosticsPath), '找不到 diagnostics.js');
const accessibilityPath = path.join(root, 'mobile-accessibility.css');
expect(fs.existsSync(accessibilityPath), '找不到 mobile-accessibility.css');
const longCourseNavPath = path.join(root, 'mobile-long-course-nav.js');
expect(fs.existsSync(longCourseNavPath), '找不到 mobile-long-course-nav.js');
const studentToolsPath = path.join(root, 'student-tools.js');
expect(fs.existsSync(studentToolsPath), '找不到 student-tools.js');
if (fs.existsSync(diagnosticsPath)) {
  try {
    execFileSync('node', ['--check', diagnosticsPath], { stdio: 'pipe' });
  } catch (_) {
    failures.push('diagnostics.js: JavaScript 語法錯誤');
  }
}
if (fs.existsSync(studentToolsPath)) {
  try {
    execFileSync('node', ['--check', studentToolsPath], { stdio: 'pipe' });
  } catch (_) {
    failures.push('student-tools.js: JavaScript 語法錯誤');
  }
}

if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach(message => console.log(`- ${message}`));
}

if (failures.length) {
  console.error('Regression checks failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Regression checks passed for ${htmlFiles.length} HTML pages.`);
console.log('Verified: diagnostics and accessibility coverage, shared voice-manager coverage outside the specialised listening-basic player, student self-service tools, inline JavaScript syntax, and mobile navigation entry points across all levels.');
