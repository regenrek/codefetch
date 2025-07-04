#!/usr/bin/env node

/**
 * List all generated output files in the playground output directories
 */

import { readdir, stat, access } from 'node:fs/promises';
import { join } from 'node:path';

const playgroundDir = new URL('.', import.meta.url).pathname;
const outputDir = join(playgroundDir, 'output');

console.log('📁 Generated files in output directories:\n');

async function listFilesInDir(dir, category) {
  const files = [];
  try {
    await access(dir);
    const dirFiles = await readdir(dir);
    
    for (const file of dirFiles) {
      if (file.endsWith('.md')) {
        const filePath = join(dir, file);
        const stats = await stat(filePath);
        files.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          category
        });
      }
    }
  } catch (error) {
    // Directory doesn't exist yet
  }
  return files;
}

try {
  const outputFolders = [
    { path: join(outputDir, 'github-analysis'), category: '🔍 GitHub Analysis' },
    { path: join(outputDir, 'documentation'), category: '📚 Documentation' },
    { path: join(outputDir, 'ai-prompts'), category: '🤖 AI Prompts' }
  ];
  
  const allFiles = [];
  
  for (const folder of outputFolders) {
    const files = await listFilesInDir(folder.path, folder.category);
    allFiles.push(...files);
  }
  
  if (allFiles.length === 0) {
    console.log('No generated output files found yet.');
    console.log('\nRun the following commands to generate outputs:');
    console.log('  npm run analyze-github');
    console.log('  npm run generate-docs');
    console.log('  npm run analyze-code');
  } else {
    allFiles.sort((a, b) => b.modified - a.modified);
    
    console.log(`Found ${allFiles.length} output files:\n`);
    
    // Group by category
    const categories = {};
    for (const file of allFiles) {
      if (!categories[file.category]) {
        categories[file.category] = [];
      }
      categories[file.category].push(file);
    }
    
    for (const [category, files] of Object.entries(categories)) {
      console.log(`${category}:`);
      for (const file of files) {
        const sizeKB = (file.size / 1024).toFixed(2);
        const date = file.modified.toLocaleString();
        console.log(`  📄 ${file.name}`);
        console.log(`     Size: ${sizeKB} KB`);
        console.log(`     Modified: ${date}`);
      }
      console.log();
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}