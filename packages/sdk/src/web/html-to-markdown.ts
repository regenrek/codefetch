/**
 * Browser-compatible HTML to Markdown converter
 * Designed for Cloudflare Workers without external dependencies
 */

export interface HtmlToMarkdownOptions {
  /** Whether to include link URLs inline */
  includeUrls?: boolean;
  /** Whether to preserve whitespace */
  preserveWhitespace?: boolean;
  /** Custom replacements */
  customReplacements?: Array<{ pattern: RegExp; replacement: string }>;
}

/**
 * Convert HTML string to Markdown format
 * This is a lightweight implementation suitable for Worker environments
 */
export function htmlToMarkdown(
  html: string,
  options: HtmlToMarkdownOptions = {}
): string {
  const {
    includeUrls = true,
    preserveWhitespace = false,
    customReplacements = [],
  } = options;

  // Remove script and style tags completely
  let markdown = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Apply custom replacements first
  for (const { pattern, replacement } of customReplacements) {
    markdown = markdown.replace(pattern, replacement);
  }

  // Convert HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");

  // Bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, content) => {
    // Clean up code block content
    const cleanContent = content
      .replace(/<[^>]+>/g, "") // Remove any HTML tags inside
      .replace(/^\n+|\n+$/g, "") // Trim newlines
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    return "\n```\n" + cleanContent + "\n```\n\n";
  });

  // Lists
  // Unordered lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return (
      "\n" +
      items
        .map((item: string) => {
          const text = item.replace(/<\/?li[^>]*>/gi, "").trim();
          return "- " + text;
        })
        .join("\n") +
      "\n\n"
    );
  });

  // Ordered lists
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    return (
      "\n" +
      items
        .map((item: string, index: number) => {
          const text = item.replace(/<\/?li[^>]*>/gi, "").trim();
          return `${index + 1}. ${text}`;
        })
        .join("\n") +
      "\n\n"
    );
  });

  // Links
  markdown = includeUrls
    ? markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    : markdown.replace(/<a[^>]+href="[^"]*"[^>]*>(.*?)<\/a>/gi, "$1");

  // Images
  markdown = markdown.replace(
    /<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*>/gi,
    "![$1]($2)"
  );
  markdown = markdown.replace(
    /<img[^>]+src="([^"]*)"[^>]+alt="([^"]*)"[^>]*>/gi,
    "![$2]($1)"
  );
  markdown = markdown.replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, "![]($1)");

  // Blockquotes
  markdown = markdown.replace(
    /<blockquote[^>]*>(.*?)<\/blockquote>/gis,
    (match, content) => {
      const lines = content.trim().split("\n");
      return (
        "\n" +
        lines.map((line: string) => "> " + line.trim()).join("\n") +
        "\n\n"
      );
    }
  );

  // Horizontal rules
  markdown = markdown.replace(/<hr[^>]*>/gi, "\n---\n\n");

  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");

  // Line breaks
  markdown = markdown.replace(/<br[^>]*>/gi, "\n");

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  if (!preserveWhitespace) {
    // Normalize line endings
    markdown = markdown.replace(/\r\n/g, "\n");
    // Remove excessive newlines (more than 2)
    markdown = markdown.replace(/\n{3,}/g, "\n\n");
    // Trim leading and trailing whitespace
    markdown = markdown.trim();
  }

  return markdown;
}
