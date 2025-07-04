import { parseURL } from './packages/sdk/dist/index.mjs';

try {
  const result = parseURL('https://example.com');
  console.log('Result:', result);
} catch (e) {
  console.log('Error:', e.message);
}

try {
  const result = parseURL('https://github.com/user/repo');
  console.log('GitHub URL parsed successfully:', result);
} catch (e) {
  console.log('Error:', e.message);
}