import { fetchFromWeb } from "codefetch-sdk/worker";

export interface Env {
  GITHUB_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Example 1: Fetch from a website
    if (url.pathname === "/fetch-web") {
      try {
        const targetUrl = url.searchParams.get("url");
        if (!targetUrl) {
          return new Response("Missing 'url' query parameter", { status: 400 });
        }

        const result = await fetchFromWeb(targetUrl, {
          maxPages: 10,
          maxDepth: 1,
          verbose: 1,
        });

        return new Response(result.markdown, {
          headers: { "Content-Type": "text/markdown" },
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    // Example 2: Fetch from GitHub repository
    if (url.pathname === "/fetch-github") {
      try {
        const repo = url.searchParams.get("repo");
        if (!repo) {
          return new Response("Missing 'repo' query parameter", {
            status: 400,
          });
        }

        // GitHub repos can be fetched via fetchFromWeb with the GitHub URL
        const githubUrl = `https://github.com/${repo}`;
        const result = await fetchFromWeb(githubUrl, {
          maxFiles: 50,
          extensions: [".ts", ".js", ".md"],
          githubToken: env.GITHUB_TOKEN,
        });

        return new Response(result.markdown, {
          headers: { "Content-Type": "text/markdown" },
        });
      } catch (error) {
        return new Response(`Error: ${error}`, { status: 500 });
      }
    }

    return new Response("Codefetch Worker - Use /fetch-web or /fetch-github", {
      status: 200,
    });
  },
} satisfies ExportedHandler<Env>;
