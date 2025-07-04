# Codefetch SDK Playground

This playground demonstrates real-world programmatic usage of the `codefetch-sdk` package.

## Setup

Before running the examples, make sure to:

1. Build the SDK:

   ```bash
   cd ../packages/sdk
   npm install
   npm run build
   ```

2. Install playground dependencies:
   ```bash
   cd playground
   npm install
   ```

## Examples

### 1. Analyze GitHub Repository (`analyze-github-repo.js`)

Clones a GitHub repository and analyzes its codebase using the SDK.

```bash
npm run analyze-github
```

Features:

- Clones repository to temp directory
- Collects files with specific extensions
- Counts tokens in source files
- Generates markdown documentation
- Creates analysis prompts

### 2. Generate Project Documentation (`generate-docs.js`)

Generates comprehensive documentation for any TypeScript/JavaScript project.

```bash
npm run generate-docs
# or with a specific path:
node generate-docs.js /path/to/project
```

Features:

- Scans project for source files
- Generates API documentation
- Creates component documentation
- Produces full project overview
- Generates README template

### 3. Code Analysis for AI (`code-analyzer.js`)

Prepares code for AI analysis with optimized prompts for different tasks.

```bash
npm run analyze-code
# or with options:
node code-analyzer.js /path/to/code review
node code-analyzer.js . refactor
node code-analyzer.js . test
node code-analyzer.js . document
```

Features:

- Smart file selection based on token limits
- Task-specific prompt generation
- Optimized prompts for GPT-4 and Claude
- Token usage analysis
- Multiple analysis tasks (review, refactor, test, document)

## SDK Features Demonstrated

- **File Collection**: Using `collectFiles()` with ignore patterns
- **Token Counting**: Using `countTokens()` with different encoders
- **Markdown Generation**: Using `generateMarkdown()` with various options
- **Template Processing**: Using `processPromptTemplate()` for dynamic content
- **Project Analysis**: Using `findProjectRoot()` and other utilities

## Output Files

The examples generate output files in organized directories:

```
output/
├── github-analysis/     # Repository analysis results
├── documentation/       # Project documentation files
└── ai-prompts/         # AI-optimized prompts
```

Generated files include:

- **GitHub Analysis**: `codefetch-analysis-{timestamp}.md`
- **Documentation**: `PROJECT_DOCUMENTATION-{timestamp}.md`, `README_TEMPLATE-{timestamp}.md`
- **AI Prompts**: `gpt4-{task}-{timestamp}.md`, `claude-{task}-{timestamp}.md`

**Note:** The `output/` directory is ignored by git to keep the repository clean. Each user will generate their own output files when running the examples.

To list all generated output files:

```bash
npm run list-outputs
```

## Requirements

- Node.js 18+
- Git (for GitHub repo analysis)
- The SDK must be built first: `cd ../packages/sdk && npm run build`
