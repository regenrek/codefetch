import { describe, it, expect } from "vitest";
import {
  htmlToMarkdown,
  extractMainContent,
  cleanMarkdown,
} from "@codefetch/sdk";

describe("htmlToMarkdown", () => {
  it("should convert basic HTML to markdown", () => {
    const html = `
      <h1>Title</h1>
      <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    `;

    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("# Title");
    expect(markdown).toContain(
      "This is a paragraph with **bold** and _italic_ text."
    );
    expect(markdown).toContain("Item 1");
    expect(markdown).toContain("Item 2");
  });

  it("should handle code blocks", () => {
    const html = `
      <pre><code class="language-javascript">const x = 42;
console.log(x);</code></pre>
    `;

    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("```javascript");
    expect(markdown).toContain("const x = 42;");
    expect(markdown).toContain("console.log(x);");
    expect(markdown).toContain("```");
  });

  it("should remove scripts and styles", () => {
    const html = `
      <h1>Title</h1>
      <script>alert('hi');</script>
      <style>body { color: red; }</style>
      <p>Content</p>
    `;

    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("# Title");
    expect(markdown).toContain("Content");
    expect(markdown).not.toContain("alert");
    expect(markdown).not.toContain("color: red");
  });

  it("should handle links with base URL", () => {
    const html = `
      <p>Visit <a href="/page">our page</a> or <a href="https://example.com">example</a></p>
    `;

    const markdown = htmlToMarkdown(html, { baseUrl: "https://test.com" });
    expect(markdown).toContain("[our page](https://test.com/page)");
    expect(markdown).toContain("[example](https://example.com/)");
  });

  it("should remove links when includeLinks is false", () => {
    const html = `
      <p>Visit <a href="/page">our page</a> for more info</p>
    `;

    const markdown = htmlToMarkdown(html, { includeLinks: false });
    expect(markdown).toBe("Visit our page for more info");
  });

  it("should remove images when includeImages is false", () => {
    const html = `
      <p>Here is an image: <img src="test.jpg" alt="Test"> and text</p>
    `;

    const markdown = htmlToMarkdown(html, { includeImages: false });
    expect(markdown).toBe("Here is an image:  and text");
  });
});

describe("extractMainContent", () => {
  it("should extract content from article tag", () => {
    const html = `
      <html>
        <body>
          <nav>Navigation</nav>
          <article>
            <h1>Main Article</h1>
            <p>This is the main content that should be extracted.</p>
          </article>
          <footer>Footer</footer>
        </body>
      </html>
    `;

    const content = extractMainContent(html);
    expect(content).toContain("Main Article");
    expect(content).toContain("This is the main content");
    expect(content).not.toContain("Navigation");
    expect(content).not.toContain("Footer");
  });

  it("should extract content from main tag", () => {
    const html = `
      <html>
        <body>
          <header>Header</header>
          <main>
            <h1>Main Content</h1>
            <p>Important information here.</p>
          </main>
          <aside>Sidebar</aside>
        </body>
      </html>
    `;

    const content = extractMainContent(html);
    expect(content).toContain("Main Content");
    expect(content).toContain("Important information");
    expect(content).not.toContain("Header");
    expect(content).not.toContain("Sidebar");
  });

  it("should remove common non-content elements", () => {
    const html = `
      <html>
        <body>
          <nav class="navigation">Nav</nav>
          <div class="sidebar">Sidebar</div>
          <div class="content">
            <h1>Article</h1>
            <p>Text content here.</p>
          </div>
          <div class="comments">Comments section</div>
          <div class="ads">Advertisement</div>
        </body>
      </html>
    `;

    const content = extractMainContent(html);
    expect(content).toContain("Article");
    expect(content).toContain("Text content");
    expect(content).not.toContain("Nav");
    expect(content).not.toContain("Sidebar");
    expect(content).not.toContain("Comments section");
    expect(content).not.toContain("Advertisement");
  });
});

describe("cleanMarkdown", () => {
  it("should remove multiple blank lines", () => {
    const markdown = "Title\n\n\n\nContent\n\n\n\n\nMore";
    const cleaned = cleanMarkdown(markdown);
    expect(cleaned).toBe("Title\n\nContent\n\nMore");
  });

  it("should remove trailing spaces", () => {
    const markdown = "Line with spaces   \nAnother line  ";
    const cleaned = cleanMarkdown(markdown);
    expect(cleaned).toBe("Line with spaces\nAnother line");
  });

  it("should fix broken link syntax", () => {
    const markdown = "[Link text] (https://example.com)";
    const cleaned = cleanMarkdown(markdown);
    expect(cleaned).toBe("[Link text](https://example.com)");
  });

  it("should remove empty links and headings", () => {
    const markdown = "[](https://example.com)\n\n## \n\nContent";
    const cleaned = cleanMarkdown(markdown);
    expect(cleaned).toBe("Content");
  });
});
