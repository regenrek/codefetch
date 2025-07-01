import { URL } from "node:url";
import type { CrawlResult } from "./crawler.js";

export interface UrlTreeNode {
  path: string;
  children: Map<string, UrlTreeNode>;
  result?: CrawlResult;
}

/**
 * Convert a list of crawl results to a URL hierarchy tree
 */
export function buildUrlTree(results: CrawlResult[]): UrlTreeNode {
  const root: UrlTreeNode = {
    path: "/",
    children: new Map(),
  };

  for (const result of results) {
    if (result.error) continue; // Skip error pages
    
    try {
      const url = new URL(result.url);
      const pathname = url.pathname || "/";
      
      // Split path into segments
      const segments = pathname
        .split("/")
        .filter(Boolean); // Remove empty segments

      let currentNode = root;
      let currentPath = "";

      // Handle root page
      if (segments.length === 0) {
        root.result = result;
        continue;
      }

      // Build tree structure
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += "/" + segment;

        if (!currentNode.children.has(segment)) {
          currentNode.children.set(segment, {
            path: currentPath,
            children: new Map(),
          });
        }

        currentNode = currentNode.children.get(segment)!;

        // If this is the last segment, attach the result
        if (i === segments.length - 1) {
          currentNode.result = result;
        }
      }
    } catch (error) {
      // Skip invalid URLs
      console.warn(`Failed to parse URL: ${result.url}`, error);
    }
  }

  return root;
}

/**
 * Convert URL tree to project structure string
 */
export function urlTreeToString(
  node: UrlTreeNode,
  prefix = "",
  isLast = true,
  isRoot = true
): string {
  let output = "";

  if (!isRoot) {
    const connector = isLast ? "└── " : "├── ";
    const pathSegment = node.path.split("/").pop() || "";
    output += prefix + connector + "/" + pathSegment + "\n";
  }

  const children = Array.from(node.children.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  children.forEach(([name, child], index) => {
    const isLastChild = index === children.length - 1;
    const childPrefix = isRoot
      ? ""
      : prefix + (isLast ? "    " : "│   ");
    
    output += urlTreeToString(child, childPrefix, isLastChild, false);
  });

  return output;
}

/**
 * Generate a full project structure for URLs
 */
export function generateUrlProjectStructure(results: CrawlResult[]): string {
  const tree = buildUrlTree(results);
  
  let structure = "Project Structure:\n";
  
  // Add root if it exists
  if (tree.result) {
    structure += "├── /\n";
  }
  
  // Add the tree structure
  const treeString = urlTreeToString(tree);
  if (treeString) {
    structure += treeString;
  }
  
  return structure;
}

/**
 * Convert crawl results to markdown sections
 */
export function crawlResultsToMarkdown(results: CrawlResult[]): string {
  // Sort results by URL path for consistent output
  const sortedResults = [...results]
    .filter(r => !r.error)
    .sort((a, b) => {
      const pathA = new URL(a.url).pathname;
      const pathB = new URL(b.url).pathname;
      return pathA.localeCompare(pathB);
    });

  let markdown = "";

  for (const result of sortedResults) {
    const url = new URL(result.url);
    const path = url.pathname || "/";
    
    // Add section for each page
    markdown += "\n\n";
    markdown += path + "\n";
    markdown += "```\n";
    markdown += `# ${result.title}\n\n`;
    markdown += result.content;
    markdown += "\n```";
  }

  return markdown;
}