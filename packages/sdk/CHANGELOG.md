# Changelog

## 1.6.2

- Add Cloudflare Worker support with worker-safe implementations (#cloudflare-support)
  - New `/worker` entry point for Cloudflare Worker environments
  - Worker-compatible cache implementation using Cache API instead of file system
  - In-memory GitHub repository fetching without file system operations
  - Automatic environment detection to use appropriate implementations
  - Browser build now exports `fetch` function for web usage
- Maintain full backward compatibility - CLI continues to work without changes
- Add `fetchFromWeb` as Worker-safe alternative to file-based operations
- Support for fetching private GitHub repositories with token authentication in Workers
- Add proper TypeScript types for Worker environments
- Optimized GitHub tarball extraction already uses native DecompressionStream
  - Zero bundle overhead - no external dependencies
  - Custom lightweight TAR parser (~100 lines)
  - Native Web Streams throughout - no Node.js stream conversion needed
  - `streamGitHubTarball` function available in worker exports

## 1.5.1

- Enhance argument parsing and file handling: add token-count-only option, improve glob path handling, and update tests for new functionality. (49fcbbf)
- Update tracked models in config files to match new model database (93c8882)
- Update model database to only include o3, gemini-2.5-pro, claude-sonnet-4, and claude-opus-4 (ce3f082) 