/**
 * Test Worker to verify functionality in real Cloudflare Worker environment
 * Deploy this with: wrangler deploy test/worker-runtime-test.ts
 */

import { 
  fetchFromWeb, 
  isCloudflareWorker, 
  getCacheSizeLimit,
  countTokens,
  htmlToMarkdown,
  VALID_ENCODERS
} from "../dist-worker/worker.mjs";

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const results: TestResult[] = [];
    
    // Test 1: Environment detection
    results.push({
      test: "Environment Detection",
      passed: isCloudflareWorker === true,
      details: {
        isCloudflareWorker,
        cacheSizeLimit: getCacheSizeLimit(),
        expectedCacheSize: 8 * 1024 * 1024
      }
    });
    
    // Test 2: Cache size limit
    results.push({
      test: "Cache Size Limit",
      passed: getCacheSizeLimit() === 8 * 1024 * 1024,
      details: {
        actual: getCacheSizeLimit(),
        expected: 8 * 1024 * 1024
      }
    });
    
    // Test 3: Fetch small public repo
    if (url.searchParams.get("skip-fetch") !== "true") {
      try {
        const githubResult = await fetchFromWeb("https://github.com/octocat/Hello-World", {
          maxFiles: 3,
          extensions: [".md"],
          verbose: 0
        });
        
        results.push({
          test: "Fetch GitHub Repo",
          passed: githubResult.markdown.includes("Hello-World"),
          details: {
            filesCount: githubResult.files.length,
            markdownLength: githubResult.markdown.length
          }
        });
      } catch (error) {
        results.push({
          test: "Fetch GitHub Repo",
          passed: false,
          error: error.message
        });
      }
    }
    
    // Test 4: HTML to Markdown
    try {
      const html = "<h1>Test</h1><p>This is a <em>test</em></p>";
      const markdown = htmlToMarkdown(html);
      
      results.push({
        test: "HTML to Markdown",
        passed: markdown.includes("# Test") && markdown.includes("*test*"),
        details: { markdown }
      });
    } catch (error) {
      results.push({
        test: "HTML to Markdown",
        passed: false,
        error: error.message
      });
    }
    
    // Test 5: Token counting
    try {
      const tokens = await countTokens("Hello, World!", "cl100k");
      
      results.push({
        test: "Token Counting",
        passed: tokens > 0 && tokens < 10,
        details: { tokens }
      });
    } catch (error) {
      results.push({
        test: "Token Counting",
        passed: false,
        error: error.message
      });
    }
    
    // Test 6: Constants export
    results.push({
      test: "Constants Export",
      passed: VALID_ENCODERS.has("cl100k") && VALID_ENCODERS.has("o200k"),
      details: {
        encoders: Array.from(VALID_ENCODERS)
      }
    });
    
    // Test 7: Git clone should fail
    try {
      await fetchFromWeb("git://github.com/octocat/Hello-World.git", {
        maxFiles: 1
      });
      
      results.push({
        test: "Git Clone Blocked",
        passed: false,
        error: "Git clone should have been blocked"
      });
    } catch (error) {
      results.push({
        test: "Git Clone Blocked",
        passed: error.message.includes("git clone is not supported"),
        details: { errorMessage: error.message }
      });
    }
    
    // Test 8: Missing Content-Length handling
    // This would need a mock or specific endpoint
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const summary = {
      total: results.length,
      passed,
      failed,
      success: failed === 0
    };
    
    return new Response(JSON.stringify({ summary, results }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      status: summary.success ? 200 : 500
    });
  },
} satisfies ExportedHandler;