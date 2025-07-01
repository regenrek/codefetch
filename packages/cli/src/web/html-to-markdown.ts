import TurndownService from "turndown";
import { JSDOM, VirtualConsole } from "jsdom";
import { URL } from "node:url";

export interface HtmlToMarkdownOptions {
  baseUrl?: string;
  includeImages?: boolean;
  includeLinks?: boolean;
  codeBlockStyle?: "fenced" | "indented";
  removeScripts?: boolean;
  removeStyles?: boolean;
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(
  html: string,
  options: HtmlToMarkdownOptions = {}
): string {
  const {
    baseUrl,
    includeImages = false,
    includeLinks = true,
    codeBlockStyle = "fenced",
    removeScripts = true,
    removeStyles = true,
  } = options;

  // Parse HTML with jsdom for preprocessing
  // Suppress CSS parsing errors
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", () => {}); // Suppress all errors including CSS parsing
  virtualConsole.on("warn", () => {});
  virtualConsole.on("info", () => {});
  virtualConsole.on("dir", () => {});
  
  const dom = new JSDOM(html, { 
    url: baseUrl,
    virtualConsole
  });
  const document = dom.window.document;

  // Remove unwanted elements
  if (removeScripts) {
    for (const el of document.querySelectorAll("script")) {
      el.remove();
    }
  }
  if (removeStyles) {
    for (const el of document.querySelectorAll("style")) {
      el.remove();
    }
  }

  // Remove hidden elements
  for (const el of document.querySelectorAll(
    '[style*="display:none"], [style*="display: none"]'
  )) {
    el.remove();
  }

  // Initialize Turndown
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle,
    bulletListMarker: "-",
  });

  // Configure link handling
  if (!includeLinks) {
    turndownService.addRule("removeLinks", {
      filter: "a",
      replacement: (content: string) => content,
    });
  } else if (baseUrl) {
    // Convert relative URLs to absolute
    turndownService.addRule("absoluteLinks", {
      filter: "a",
      replacement: (content: string, node: any) => {
        const href = node.getAttribute("href");
        if (!href) return content;

        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          return `[${content}](${absoluteUrl})`;
        } catch {
          return content;
        }
      },
    });
  }

  // Configure image handling
  if (!includeImages) {
    turndownService.addRule("removeImages", {
      filter: "img",
      replacement: () => "",
    });
  }

  // Add custom rules for better code extraction
  turndownService.addRule("codeBlocks", {
    filter: (node: any) => {
      return (
        node.nodeName === "PRE" &&
        node.firstChild &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (content: string, node: any) => {
      const codeNode = node.firstChild;
      const language = extractLanguage(codeNode);
      const code = codeNode.textContent || "";

      if (codeBlockStyle === "fenced") {
        return "\n```" + language + "\n" + code + "\n```\n";
      }
      return code
        .split("\n")
        .map((line: string) => "    " + line)
        .join("\n");
    },
  });

  // Convert to markdown
  const markdown = turndownService.turndown(document.body.innerHTML);

  // Clean up excessive whitespace
  return markdown
    .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
    .replace(/^\s+|\s+$/g, ""); // Trim
}

/**
 * Extract language from code element classes
 */
function extractLanguage(codeElement: any): string {
  const className = codeElement.className || "";
  const matches = className.match(/language-(\w+)/);
  if (matches) {
    return matches[1];
  }

  // Common class patterns
  const commonPatterns = [
    /lang-(\w+)/,
    /highlight-(\w+)/,
    /brush:\s*(\w+)/,
    /^(\w+)$/,
  ];

  for (const pattern of commonPatterns) {
    const match = className.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

/**
 * Extract main content from HTML page
 */
export function extractMainContent(html: string, url?: string): string {
  // Suppress CSS parsing errors for main content extraction too
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", () => {});
  virtualConsole.on("warn", () => {});
  
  const dom = new JSDOM(html, { 
    url,
    virtualConsole,
    // Don't execute scripts or load resources
    runScripts: "outside-only",
    resources: undefined
  });
  const document = dom.window.document;

  // Remove non-content elements
  const removeSelectors = [
    "script",
    "style",
    "nav",
    "header",
    "footer",
    "aside",
    ".nav",
    ".navigation",
    ".sidebar",
    ".menu",
    ".header",
    ".footer",
    ".advertisement",
    ".ads",
    "#comments",
    ".comments",
  ];

  for (const selector of removeSelectors) {
    for (const el of document.querySelectorAll(selector)) {
      el.remove();
    }
  }

  // Try to find main content areas
  const contentSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    ".content",
    "#content",
    ".post",
    ".entry-content",
    ".documentation",
    ".markdown-body",
  ];

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (
      element &&
      element.textContent &&
      element.textContent.trim().length > 100
    ) {
      return element.innerHTML;
    }
  }

  // Fallback: use body but try to clean it up
  const body = document.body;

  // Remove elements with low text density
  const allElements = body.querySelectorAll("*");
  for (const el of allElements) {
    const element = el as any;
    const text = element.textContent || "";
    const htmlLength = element.innerHTML.length;
    const textLength = text.trim().length;

    // Remove elements that are mostly markup (low text ratio)
    if (htmlLength > 0 && textLength / htmlLength < 0.1 && textLength < 50) {
      element.remove();
    }
  }

  return body.innerHTML;
}

/**
 * Clean up markdown content
 */
export function cleanMarkdown(markdown: string): string {
  return (
    markdown
      // Remove multiple consecutive blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Remove trailing spaces
      .replace(/ +$/gm, "")
      // Fix markdown link syntax
      .replace(/\[([^\]]+)\]\s+\(([^)]+)\)/g, "[$1]($2)")
      // Remove empty links
      .replace(/\[]\([^)]*\)/g, "")
      // Remove empty headings
      .replace(/^#+\s*$/gm, "")
      // Trim
      .trim()
  );
}
