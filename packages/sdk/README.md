# @codefetch/sdk

The core SDK for Codefetch - a powerful tool for converting codebases into AI-friendly markdown formats.

## Installation

```bash
npm install @codefetch/sdk
# or
yarn add @codefetch/sdk
# or
pnpm add @codefetch/sdk
```

## Overview

The SDK provides programmatic access to all Codefetch functionality, allowing you to:
- Collect files from a codebase with intelligent filtering
- Generate markdown documentation with project structure
- Count tokens for various AI models
- Apply prompt templates
- Configure ignore patterns and file filtering

## Basic Usage

```typescript
import { 
  collectFiles, 
  generateMarkdown, 
  countTokens,
  DEFAULT_IGNORE_PATTERNS 
} from '@codefetch/sdk';
import ignore from 'ignore';

// Set up ignore patterns
const ig = ignore().add(DEFAULT_IGNORE_PATTERNS);

// Collect files from a directory
const files = await collectFiles('/path/to/project', {
  ig,
  extensionSet: new Set(['.ts', '.tsx', '.js', '.jsx']),
  excludeFiles: null,
  includeFiles: null,
  excludeDirs: null,
  includeDirs: null,
  verbose: 1
});

// Generate markdown
const markdown = await generateMarkdown(files, {
  maxTokens: 100000,
  verbose: 1,
  projectTree: 2,
  tokenEncoder: 'cl100k',
  disableLineNumbers: false,
  tokenLimiter: 'truncated',
  templateVars: {
    PROJECT_NAME: 'My Project'
  }
});

// Count tokens
const tokenCount = await countTokens(markdown, 'cl100k');
console.log(`Generated ${tokenCount} tokens`);
```

## API Reference

### File Collection

#### `collectFiles(path: string, options: CollectFilesOptions): Promise<File[]>`

Collects files from a directory with filtering options.

Options:
- `ig`: An ignore instance for pattern matching
- `extensionSet`: Set of file extensions to include (e.g., `new Set(['.ts', '.js'])`)
- `excludeFiles`: Array of file patterns to exclude
- `includeFiles`: Array of file patterns to explicitly include
- `excludeDirs`: Array of directory names to exclude
- `includeDirs`: Array of directory names to explicitly include  
- `verbose`: Verbosity level (0-3)

### Markdown Generation

#### `generateMarkdown(files: File[], options: GenerateMarkdownOptions): Promise<string>`

Generates AI-friendly markdown from collected files.

Options:
- `maxTokens`: Maximum token limit (null for no limit)
- `verbose`: Verbosity level (0-3)
- `projectTree`: Project tree depth (0 for no tree, 1+ for tree levels)
- `tokenEncoder`: Token encoding model ('cl100k' | 'p50k' | 'r50k' | 'o200k')
- `disableLineNumbers`: Disable line numbers in code blocks
- `tokenLimiter`: Strategy for handling token limits ('truncated' | 'spread')
- `promptFile`: Path to prompt template file
- `templateVars`: Variables for template substitution

### Token Counting

#### `countTokens(text: string, encoder: TokenEncoder): Promise<number>`

Counts tokens in text using specified encoder.

Supported encoders:
- `'cl100k'` - Used by GPT-4, GPT-3.5-turbo, text-embedding-ada-002
- `'p50k'` - Used by older GPT-3 models
- `'r50k'` - Used by older models like davinci
- `'o200k'` - Used by newer OpenAI models

### Configuration

#### `loadCodefetchConfig(cwd: string, args?: any): Promise<Config>`

Loads configuration from `.codefetchrc` files and merges with CLI arguments.

#### `DEFAULT_IGNORE_PATTERNS`

Default patterns for ignoring files and directories:

```
node_modules/
.git/
dist/
build/
coverage/
.env*
*.log
.DS_Store
*.min.js
*.min.css
# ... and more
```

### Prompts

#### `processPromptTemplate(promptFile: string, vars?: Record<string, string>): Promise<string>`

Processes a prompt template file with variable substitution.

Variables are replaced using `{{VARIABLE_NAME}}` syntax.

## Advanced Features

### Token Limiting Strategies

**Truncated** (default): Includes files until token limit is reached, then stops.

**Spread**: Distributes tokens across all files, showing partial content from each.

### Custom Ignore Patterns

Create a `.codefetchignore` file in your project root:

```
# Custom patterns
*.test.ts
*.spec.js
__tests__/
tmp/
```

### Template Variables

Use template variables in prompt files:

```markdown
# Code Review for {{PROJECT_NAME}}

Please review the following {{LANGUAGE}} code:

{{CODE}}
```

## Model Support

The SDK tracks token limits for various AI models:

```typescript
import { SUPPORTED_MODELS, fetchModels } from '@codefetch/sdk';

// Get model information
const { modelDb } = await fetchModels(['gpt-4', 'claude-3-opus']);
```

## Error Handling

The SDK throws descriptive errors for common issues:

```typescript
try {
  const files = await collectFiles('./src', options);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Directory not found');
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type { 
  File, 
  Config, 
  TokenEncoder, 
  TokenLimiter,
  CollectFilesOptions,
  GenerateMarkdownOptions 
} from '@codefetch/sdk';
```

## Contributing

See the [main repository](https://github.com/codefetch-ai/codefetch) for contribution guidelines.

## License

MIT