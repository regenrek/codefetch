#!/usr/bin/env node

/**
 * Example: Using codefetch-sdk to generate documentation for a local project
 * This demonstrates how to use the SDK programmatically for documentation generation
 */

import {
  collectFiles,
  countTokens,
  generateMarkdown,
  processPromptTemplate,
  DEFAULT_IGNORE_PATTERNS,
  VALID_PROMPTS,
} from "../packages/sdk/dist/index.mjs";
import ignore from "ignore";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

/**
 * Generate comprehensive documentation for a TypeScript/JavaScript project
 */
async function generateProjectDocumentation(projectPath = ".") {
  console.log("📚 Generating Project Documentation with codefetch-sdk\n");

  // Configuration
  const config = {
    extensions: [".ts", ".js", ".tsx", ".jsx"],
    excludeDirs: ["node_modules", "dist", "build", ".git", "coverage"],
    maxTokens: 50000,
    outputFormat: "markdown",
  };

  try {
    // Set up ignore patterns
    const ig = ignore();

    // Add default patterns
    ig.add(
      DEFAULT_IGNORE_PATTERNS.split("\n").filter(
        (line) => line && !line.startsWith("#")
      )
    );

    // Add custom excludes
    config.excludeDirs.forEach((dir) => ig.add(`${dir}/**`));

    // Check for .gitignore
    const gitignorePath = join(projectPath, ".gitignore");
    if (existsSync(gitignorePath)) {
      console.log("📋 Found .gitignore, adding patterns...");
      ig.add(readFileSync(gitignorePath, "utf8"));
    }

    // Collect source files
    console.log("🔍 Scanning project files...");
    const files = await collectFiles(projectPath, {
      ig,
      extensionSet: new Set(config.extensions),
      verbose: 0,
    });

    console.log(`\n📊 Project Statistics:`);
    console.log(`   Total files found: ${files.length}`);
    console.log(`   File types: ${config.extensions.join(", ")}`);

    // Analyze file distribution
    const filesByExtension = {};
    files.forEach((file) => {
      const ext = file.substring(file.lastIndexOf("."));
      filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;
    });

    console.log("\n   File distribution:");
    for (const [ext, count] of Object.entries(filesByExtension)) {
      console.log(`     ${ext}: ${count} files`);
    }

    // Generate different documentation sections
    console.log("\n📝 Generating documentation sections...\n");

    // 1. API Documentation for TypeScript files
    const tsFiles = files.filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx")
    );
    const apiDocs = await generateMarkdown(tsFiles.slice(0, 20), {
      maxTokens: 15000,
      projectTree: 0,
      tokenEncoder: "cl100k",
      disableLineNumbers: false,
      tokenLimiter: "sequential",
    });

    // 2. Component documentation for React files
    const componentFiles = files.filter(
      (f) => f.endsWith(".tsx") || f.endsWith(".jsx")
    );
    const componentDocs =
      componentFiles.length > 0
        ? await generateMarkdown(componentFiles.slice(0, 10), {
            maxTokens: 10000,
            projectTree: 0,
            tokenEncoder: "cl100k",
            disableLineNumbers: true,
            tokenLimiter: "truncated",
          })
        : "";

    // 3. Full project overview
    const projectOverview = await generateMarkdown(files, {
      maxTokens: config.maxTokens,
      projectTree: 4,
      tokenEncoder: "cl100k",
      disableLineNumbers: true,
      tokenLimiter: "truncated",
    });

    // Create documentation using templates
    console.log("🎨 Creating formatted documentation...");

    const docTemplate = `# Project Documentation

Generated on: {{DATE}}
Total Files: {{FILE_COUNT}}
Project Path: {{PROJECT_PATH}}

## Table of Contents
1. [Project Overview](#project-overview)
2. [API Documentation](#api-documentation)
3. [Component Documentation](#component-documentation)
4. [Full Codebase](#full-codebase)

## Project Overview

This project contains {{FILE_COUNT}} source files with the following distribution:
{{FILE_DISTRIBUTION}}

## API Documentation

The following TypeScript files contain the core API:

{{API_DOCS}}

## Component Documentation

{{COMPONENT_SECTION}}

## Full Codebase

{{CURRENT_CODEBASE}}
`;

    const fileDistribution = Object.entries(filesByExtension)
      .map(([ext, count]) => `- ${ext}: ${count} files`)
      .join("\n");

    const componentSection =
      componentFiles.length > 0
        ? `The project includes ${componentFiles.length} React components:\n\n${componentDocs}`
        : "No React components found in this project.";

    const finalDoc = await processPromptTemplate(docTemplate, projectOverview, {
      DATE: new Date().toISOString(),
      FILE_COUNT: files.length.toString(),
      PROJECT_PATH: projectPath,
      FILE_DISTRIBUTION: fileDistribution,
      API_DOCS: apiDocs,
      COMPONENT_SECTION: componentSection,
    });

    // Calculate token usage
    const totalTokens = await countTokens(finalDoc, "cl100k");
    console.log(`\n📊 Documentation Stats:`);
    console.log(`   Total characters: ${finalDoc.length}`);
    console.log(`   Estimated tokens: ${totalTokens}`);
    console.log(`   Token limit: ${config.maxTokens}`);

    // Save documentation in the structured output directory
    const playgroundDir = new URL(".", import.meta.url).pathname;
    const outputDir = join(playgroundDir, "output", "documentation");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const outputPath = join(outputDir, `PROJECT_DOCUMENTATION-${timestamp}.md`);
    await writeFile(outputPath, finalDoc);

    console.log(`\n✅ Documentation saved to: ${outputPath}`);

    // Generate a README template as bonus
    console.log("\n🎁 Bonus: Generating README template...");

    const readmeTemplate = await processPromptTemplate(
      `# {{PROJECT_NAME}}

## Overview
This project contains {{FILE_COUNT}} files organized in the following structure:

{{FILE_DISTRIBUTION}}

## Getting Started
\`\`\`bash
# Install dependencies
npm install

# Run the project
npm start
\`\`\`

## Project Structure
\`\`\`
{{PROJECT_TREE}}
\`\`\`

Generated with codefetch-sdk
`,
      projectOverview.split("\n").slice(0, 20).join("\n"), // Just the tree
      {
        PROJECT_NAME: basename(projectPath),
        FILE_COUNT: files.length.toString(),
        FILE_DISTRIBUTION: fileDistribution,
        PROJECT_TREE: projectOverview.split("\n\n")[0], // Extract just the tree
      }
    );

    const readmePath = join(outputDir, `README_TEMPLATE-${timestamp}.md`);
    await writeFile(readmePath, readmeTemplate);
    console.log(`✅ README template saved to: ${readmePath}`);
  } catch (error) {
    console.error("❌ Error generating documentation:", error.message);
  }
}

// Check if a path was provided
const projectPath = process.argv[2] || ".";
console.log(`Target project: ${projectPath}\n`);

// Run the documentation generator
generateProjectDocumentation(projectPath).catch(console.error);
