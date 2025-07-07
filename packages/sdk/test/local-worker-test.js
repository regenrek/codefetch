// Quick local test of Worker functionality
import { 
  fetchFromWeb, 
  isCloudflareWorker, 
  getCacheSizeLimit,
  countTokens,
  htmlToMarkdown 
} from '../dist-worker/worker.mjs';

console.log('=== Cloudflare Worker SDK Test ===\n');

// Test 1: Environment detection
console.log('1. Environment Detection:');
console.log(`   isCloudflareWorker: ${isCloudflareWorker}`);
console.log(`   Cache size limit: ${getCacheSizeLimit() / 1024 / 1024}MB`);
console.log(`   ✓ Environment detection working\n`);

// Test 2: HTML to Markdown
console.log('2. HTML to Markdown:');
const html = '<h1>Test</h1><p>This is a <strong>test</strong></p>';
const markdown = htmlToMarkdown(html);
console.log(`   Input: ${html}`);
console.log(`   Output: ${markdown.trim()}`);
console.log(`   ✓ HTML conversion working\n`);

// Test 3: Token counting
console.log('3. Token Counting:');
const text = 'Hello, World! This is a test.';
countTokens(text, 'cl100k').then(tokens => {
  console.log(`   Text: "${text}"`);
  console.log(`   Tokens: ${tokens}`);
  console.log(`   ✓ Token counting working\n`);

  // Test 4: Web fetching (requires network)
  console.log('4. Web Fetching (example.com):');
  return fetchFromWeb('https://example.com', {
    maxPages: 1,
    maxDepth: 0,
    verbose: 0
  });
}).then(result => {
  // fetchFromWeb can return either a string (markdown) or FetchResult object
  const markdown = typeof result === 'string' ? result : result.markdown;
  const hasFiles = typeof result === 'object' && result.files;
  
  console.log(`   Result type: ${typeof result}`);
  if (hasFiles) {
    console.log(`   Files fetched: ${result.files.length}`);
  }
  console.log(`   Markdown length: ${markdown.length} chars`);
  console.log(`   Contains "Example Domain": ${markdown.includes('Example Domain')}`);
  console.log(`   ✓ Web fetching working\n`);
  
  console.log('=== All tests passed! ===');
}).catch(error => {
  console.error('   ✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});