#!/usr/bin/env node

/**
 * Example: Using @codefetch/sdk for code analysis and AI prompt generation
 * This demonstrates how to prepare code for AI analysis
 */

import {
  collectFiles,
  countTokens,
  generateMarkdown,
  processPromptTemplate,
  DEFAULT_IGNORE_PATTERNS,
  resolvePrompt,
} from '../packages/sdk/dist/index.mjs';
import ignore from 'ignore';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Analyze code and generate prompts for different AI tasks
 */
async function analyzeCodeForAI(targetPath = '.', task = 'review') {
  console.log('🤖 Code Analysis for AI - Using @codefetch/sdk\n');
  
  const tasks = {
    review: {
      prompt: 'Review this code for best practices, potential bugs, and improvements',
      maxTokens: 8000
    },
    refactor: {
      prompt: 'Suggest refactoring improvements for better maintainability',
      maxTokens: 10000
    },
    test: {
      prompt: 'Generate comprehensive unit tests for this code',
      maxTokens: 12000
    },
    document: {
      prompt: 'Generate detailed documentation and JSDoc comments',
      maxTokens: 8000
    }
  };

  const selectedTask = tasks[task] || tasks.review;
  console.log(`📋 Task: ${task}`);
  console.log(`📝 Prompt: ${selectedTask.prompt}\n`);

  try {
    // Set up ignore patterns
    const ig = ignore();
    ig.add(DEFAULT_IGNORE_PATTERNS.split('\n').filter(line => line && !line.startsWith('#')));
    ig.add(['node_modules/', 'dist/', 'coverage/', '.git/']);

    // Collect relevant files
    console.log('🔍 Collecting code files...');
    const files = await collectFiles(targetPath, {
      ig,
      extensionSet: new Set(['.js', '.ts', '.jsx', '.tsx']),
      verbose: 0
    });

    console.log(`Found ${files.length} code files\n`);

    // Smart file selection based on token limits
    console.log('🧠 Smart file selection based on token limits...');
    const selectedFiles = [];
    let currentTokens = 0;
    const tokenLimit = selectedTask.maxTokens * 0.8; // Leave 20% buffer

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const tokens = await countTokens(content, 'cl100k');
      
      if (currentTokens + tokens <= tokenLimit) {
        selectedFiles.push({ path: file, tokens, content });
        currentTokens += tokens;
      }
    }

    console.log(`Selected ${selectedFiles.length} files (${currentTokens} tokens)\n`);

    // Generate code context
    const codeContext = await generateMarkdown(
      selectedFiles.map(f => f.path),
      {
        maxTokens: selectedTask.maxTokens,
        projectTree: 2,
        tokenEncoder: 'cl100k',
        disableLineNumbers: false,
        tokenLimiter: 'sequential'
      }
    );

    // Create analysis prompts for different AI models
    console.log('🎯 Generating AI prompts...\n');

    // GPT-4 optimized prompt
    const gpt4Prompt = await processPromptTemplate(
      `You are an expert software engineer. ${selectedTask.prompt}

Focus on:
- Code quality and best practices
- Performance considerations
- Security vulnerabilities
- Maintainability

Project: {{PROJECT_NAME}}
Files analyzed: {{FILE_COUNT}}

{{CURRENT_CODEBASE}}

Provide your analysis in a structured format with specific recommendations.`,
      codeContext,
      {
        PROJECT_NAME: targetPath,
        FILE_COUNT: selectedFiles.length.toString()
      }
    );

    // Claude optimized prompt
    const claudePrompt = await processPromptTemplate(
      `${selectedTask.prompt}

<context>
Project: {{PROJECT_NAME}}
Total files: {{FILE_COUNT}}
Token count: {{TOKEN_COUNT}}
</context>

<instructions>
1. Analyze the provided code thoroughly
2. Identify specific issues with line references
3. Provide actionable recommendations
4. Include code examples for suggested changes
</instructions>

<codebase>
{{CURRENT_CODEBASE}}
</codebase>

Please structure your response with clear sections and examples.`,
      codeContext,
      {
        PROJECT_NAME: targetPath,
        FILE_COUNT: selectedFiles.length.toString(),
        TOKEN_COUNT: currentTokens.toString()
      }
    );

    // Save prompts in the structured output directory
    const playgroundDir = new URL('.', import.meta.url).pathname;
    const outputDir = join(playgroundDir, 'output', 'ai-prompts');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const gpt4Path = join(outputDir, `gpt4-${task}-${timestamp}.md`);
    const claudePath = join(outputDir, `claude-${task}-${timestamp}.md`);

    await writeFile(gpt4Path, gpt4Prompt);
    await writeFile(claudePath, claudePrompt);

    console.log('✅ Generated AI prompts:');
    console.log(`   - GPT-4: ${gpt4Path} (${await countTokens(gpt4Prompt, 'cl100k')} tokens)`);
    console.log(`   - Claude: ${claudePath} (${await countTokens(claudePrompt, 'cl100k')} tokens)`);

    // Show analysis summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   Task: ${task}`);
    console.log(`   Files analyzed: ${selectedFiles.length}`);
    console.log(`   Total tokens: ${currentTokens}`);
    console.log(`   Token limit: ${selectedTask.maxTokens}`);
    
    console.log('\n📁 Top 5 largest files:');
    selectedFiles
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5)
      .forEach(({ path, tokens }) => {
        console.log(`   - ${path.split('/').pop()}: ${tokens} tokens`);
      });

    // Preview
    console.log('\n📄 Prompt preview (first 300 chars):');
    console.log('─'.repeat(50));
    console.log(gpt4Prompt.slice(0, 300) + '...');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetPath = args[0] || '.';
const task = args[1] || 'review';

console.log('Usage: node code-analyzer.js [path] [task]');
console.log('Tasks: review, refactor, test, document\n');

// Run the analyzer
analyzeCodeForAI(targetPath, task).catch(console.error);