#!/usr/bin/env node

/**
 * Example: Using @codefetch/sdk to analyze a GitHub repository
 * This demonstrates real-world programmatic usage of the SDK
 */

import {
  collectFiles,
  countTokens,
  generateMarkdown,
  processPromptTemplate,
  DEFAULT_IGNORE_PATTERNS,
} from '../packages/sdk/dist/index.mjs';
import ignore from 'ignore';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Configuration
const REPO_URL = 'https://github.com/regenrek/codefetch/';
const ANALYZE_EXTENSIONS = ['.ts', '.js', '.json'];
const MAX_TOKENS = 10000;

async function analyzeGitHubRepo() {
  console.log('🔍 Analyzing GitHub Repository with @codefetch/sdk\n');
  console.log(`Repository: ${REPO_URL}\n`);

  // Create temporary directory
  const tempDir = mkdtempSync(join(tmpdir(), 'codefetch-analysis-'));
  console.log(`📁 Created temp directory: ${tempDir}`);

  try {
    // Clone the repository
    console.log('📥 Cloning repository...');
    execSync(`git clone --depth 1 ${REPO_URL} ${tempDir}/repo`, { 
      stdio: 'ignore' 
    });
    console.log('✅ Repository cloned\n');

    const repoPath = join(tempDir, 'repo');
    
    // Set up ignore patterns
    const ig = ignore().add(
      DEFAULT_IGNORE_PATTERNS.split('\n').filter(line => line && !line.startsWith('#'))
    );
    ig.add('node_modules/');
    ig.add('.git/');
    ig.add('dist/');
    ig.add('coverage/');

    // Collect files
    console.log('📊 Collecting files...');
    process.chdir(repoPath); // Change to repo directory for relative paths
    const files = await collectFiles('.', {
      ig,
      extensionSet: new Set(ANALYZE_EXTENSIONS),
      verbose: 0
    });
    
    console.log(`Found ${files.length} files with extensions: ${ANALYZE_EXTENSIONS.join(', ')}`);
    console.log('\nSample files:');
    files.slice(0, 5).forEach(file => {
      console.log(`  - ${file}`);
    });

    // Count tokens in collected files
    console.log('\n📈 Analyzing token usage...');
    let totalTokens = 0;
    const tokenCounts = await Promise.all(
      files.slice(0, 10).map(async (file) => {
        const content = await import('node:fs').then(fs => 
          fs.promises.readFile(file, 'utf8')
        );
        const tokens = await countTokens(content, 'cl100k');
        totalTokens += tokens;
        return { file, tokens };
      })
    );

    console.log('\nToken counts for first 10 files:');
    tokenCounts.forEach(({ file, tokens }) => {
      console.log(`  ${file}: ${tokens} tokens`);
    });
    console.log(`\nTotal tokens (first 10 files): ${totalTokens}`);

    // Generate markdown documentation
    console.log('\n📝 Generating markdown documentation...');
    const markdown = await generateMarkdown(files, {
      maxTokens: MAX_TOKENS,
      verbose: 0,
      projectTree: 3,
      tokenEncoder: 'cl100k',
      disableLineNumbers: false,
      tokenLimiter: 'truncated'
    });

    console.log(`Generated ${markdown.length} characters of documentation`);
    console.log(`Estimated tokens: ${await countTokens(markdown, 'cl100k')}`);

    // Use prompt template to create analysis
    console.log('\n🤖 Creating code analysis prompt...');
    const analysisPrompt = `You are analyzing a codebase. Please provide:
1. Overview of the project structure
2. Main technologies used
3. Key features identified

Project: {{PROJECT_NAME}}
Repository: {{REPO_URL}}

{{CURRENT_CODEBASE}}`;

    const processedPrompt = await processPromptTemplate(
      analysisPrompt,
      markdown,
      {
        PROJECT_NAME: 'Codefetch',
        REPO_URL: REPO_URL
      }
    );

    // Save the analysis in the structured output directory
    const playgroundDir = new URL('.', import.meta.url).pathname;
    const outputDir = join(playgroundDir, 'output', 'github-analysis');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputPath = join(outputDir, `codefetch-analysis-${timestamp}.md`);
    await import('node:fs').then(fs => 
      fs.promises.writeFile(outputPath, processedPrompt)
    );
    
    console.log(`\n✅ Analysis saved to: ${outputPath}`);
    console.log(`   File size: ${processedPrompt.length} characters`);
    console.log(`   Tokens: ${await countTokens(processedPrompt, 'cl100k')}`);

    // Show a preview
    console.log('\n📄 Preview of analysis (first 500 chars):');
    console.log('─'.repeat(50));
    console.log(processedPrompt.slice(0, 500) + '...');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up temporary files...');
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// Run the analysis
analyzeGitHubRepo().catch(console.error);