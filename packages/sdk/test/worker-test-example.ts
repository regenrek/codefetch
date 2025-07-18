/**
 * Test Cloudflare Worker using @codefetch/sdk/worker
 */

import { fetchFromWeb, isCloudflareWorker } from "../src/worker";

interface ExportedHandler<T = any> {
  fetch(request: Request, env: T): Promise<Response> | Response;
}

export interface Env {
  GITHUB_TOKEN?: string;
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          isCloudflareWorker,
          hasWebAPIs: typeof caches !== "undefined",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Test fetching a small public repository
    if (url.pathname === "/test") {
      try {
        const result = await fetchFromWeb(
          "https://github.com/octocat/Hello-World",
          {
            extensions: [".md"],
            verbose: 1,
            // Using type assertion for noCache option
          } as any
        );

        // Check if result is a string (markdown)
        return typeof result === "string"
          ? new Response(result, {
              headers: { "Content-Type": "text/markdown" },
            })
          : new Response(JSON.stringify(result), {
              headers: { "Content-Type": "application/json" },
            });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Codefetch Worker Test", { status: 200 });
  },
} satisfies ExportedHandler<Env>;
