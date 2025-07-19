import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Convert __dirname to be compatible with ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handlers = [
  http.get("https://tiktoken.pages.dev/js/:fileName", async ({ params }) => {
    const { fileName } = params;
    const filePath = path.resolve(
      __dirname,
      `../../../sdk/test/fixtures/tiktoken/${fileName}`
    );

    try {
      const fileContent = await fs.readFile(filePath);
      return new HttpResponse(fileContent, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      return new HttpResponse(null, { status: 404 });
    }
  }),
  http.get("https://codeload.github.com/:owner/:repo/tar.gz/:ref", () => {
    // This is a placeholder for a more sophisticated mock if needed
    return new HttpResponse(null, { status: 200 });
  }),

  http.get("https://api.github.com/repos/:owner/:repo", () => {
    // This is a placeholder for a more sophisticated mock if needed
    return new HttpResponse(
      JSON.stringify({
        full_name: "test/repo",
        stargazers_count: 123,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
];

export const server = setupServer(...handlers);
