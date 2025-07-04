#!/usr/bin/env node

/**
 * Quick test of web fetching feature
 */

import { execSync } from 'node:child_process';

console.log('🌐 Quick Web Fetch Test\n');

// Test URLs
const tests = [
  'https://github.com/sindresorhus/is-plain-obj',
  'https://github.com/chalk/chalk --branch main',
  'https://github.com/yargs/yargs --token-count-only'
];

for (const test of tests) {
  console.log(`\n📝 Testing: ${test}`);
  console.log('─'.repeat(50));
  
  try {
    const cmd = `npx codefetch --url ${test} --dry-run`;
    execSync(cmd, { 
      cwd: '../packages/cli',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('\n✨ Done!');