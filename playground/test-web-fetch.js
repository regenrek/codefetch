#!/usr/bin/env node

/**
 * Example: Testing the new web fetching feature
 * This demonstrates how to use the CLI's web fetching programmatically
 */

import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// Test repositories
const TEST_REPOS = [
  {
    url: 'https://github.com/sindresorhus/is-plain-obj',
    name: 'is-plain-obj',
    branch: null
  },
  {
    url: 'https://github.com/tj/commander.js',
    name: 'commander.js',
    branch: 'develop'
  },
  {
    url: 'https://github.com/chalk/chalk',
    name: 'chalk',
    branch: 'main'
  }
];

async function testWebFetch() {
  console.log('🌐 Testing Web Fetch Feature\n');

  // Test 1: Basic URL fetching
  console.log('📝 Test 1: Basic URL fetching');
  console.log('─'.repeat(50));
  
  const basicTest = TEST_REPOS[0];
  const outputFile = `${basicTest.name}-test.md`;
  
  try {
    console.log(`Fetching: ${basicTest.url}`);
    const cmd = `node ../packages/cli/dist/cli.mjs --url ${basicTest.url} -o ${outputFile}`;
    const output = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
    console.log(output);
    
    // Read and show preview
    const content = readFileSync(join(__dirname, outputFile), 'utf8');
    console.log(`\nOutput file size: ${content.length} characters`);
    console.log('Preview (first 300 chars):');
    console.log(content.slice(0, 300) + '...\n');
    
    // Cleanup
    unlinkSync(join(__dirname, outputFile));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Fetching with branch
  console.log('\n📝 Test 2: Fetching specific branch');
  console.log('─'.repeat(50));
  
  const branchTest = TEST_REPOS[1];
  const branchOutputFile = `${branchTest.name}-${branchTest.branch}.md`;
  
  try {
    console.log(`Fetching: ${branchTest.url} (branch: ${branchTest.branch})`);
    const cmd = `node ../packages/cli/dist/cli.mjs --url ${branchTest.url} --branch ${branchTest.branch} -o ${branchOutputFile}`;
    const output = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
    console.log(output);
    
    // Cleanup
    unlinkSync(join(__dirname, branchOutputFile));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Token counting only
  console.log('\n📝 Test 3: Token counting only');
  console.log('─'.repeat(50));
  
  const tokenTest = TEST_REPOS[2];
  
  try {
    console.log(`Counting tokens for: ${tokenTest.url}`);
    const cmd = `node ../packages/cli/dist/cli.mjs --url ${tokenTest.url} --token-count-only`;
    const output = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
    console.log(`Total tokens: ${output.trim()}`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 4: Using cache
  console.log('\n📝 Test 4: Cache functionality');
  console.log('─'.repeat(50));
  
  const cacheTest = TEST_REPOS[0];
  
  try {
    console.log('First fetch (will cache):');
    let cmd = `node ../packages/cli/dist/cli.mjs --url ${cacheTest.url} --dry-run`;
    execSync(cmd, { cwd: __dirname, stdio: 'inherit' });
    
    console.log('\nSecond fetch (from cache):');
    execSync(cmd, { cwd: __dirname, stdio: 'inherit' });
    
    console.log('\nThird fetch (bypass cache):');
    cmd = `node ../packages/cli/dist/cli.mjs --url ${cacheTest.url} --no-cache --dry-run`;
    execSync(cmd, { cwd: __dirname, stdio: 'inherit' });
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 5: Error handling
  console.log('\n📝 Test 5: Error handling');
  console.log('─'.repeat(50));
  
  const errorTests = [
    { url: 'file:///etc/passwd', expected: 'Invalid protocol' },
    { url: 'https://192.168.1.1', expected: 'Private IP' },
    { url: 'https://localhost/test', expected: 'localhost' }
  ];
  
  for (const test of errorTests) {
    try {
      console.log(`\nTesting invalid URL: ${test.url}`);
      const cmd = `node ../packages/cli/dist/cli.mjs --url ${test.url} --dry-run`;
      execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
    } catch (error) {
      console.log(`✅ Expected error: ${error.message.includes(test.expected) ? 'Correct' : 'Incorrect'}`);
    }
  }

  console.log('\n✨ Web fetch testing complete!');
}

// Direct SDK usage example
async function testWithSDK() {
  console.log('\n\n🔧 Testing with SDK directly');
  console.log('─'.repeat(50));
  
  // Import the web fetch module directly
  const { handleWebFetch } = await import('../packages/cli/dist/web/web-fetch.js');
  const { createConsola } = await import('consola');
  
  const logger = createConsola({
    level: 3
  });
  
  // Create args object similar to CLI
  const args = {
    url: 'https://github.com/sindresorhus/type-fest',
    branch: 'main',
    outputFile: 'type-fest-sdk-test.md',
    verbose: 2,
    dryRun: true
  };
  
  try {
    console.log('Fetching repository using SDK...');
    await handleWebFetch(args, logger);
    console.log('✅ SDK test successful!');
  } catch (error) {
    console.error('❌ SDK test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testWebFetch();
  await testWithSDK();
}

runAllTests().catch(console.error);