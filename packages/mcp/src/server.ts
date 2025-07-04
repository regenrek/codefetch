import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  collectFiles,
  generateMarkdown,
  getDefaultConfig,
  type CodefetchConfig,
} from "@codefetch/sdk";

// TODO: Implement MCP server functionality
export async function createMcpServer() {
  const server = new Server(
    {
      name: "codefetch-mcp",
      version: "1.5.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // TODO: Register tools using SDK functions
  // server.setRequestHandler(...)

  return server;
}

export async function startMcpServer() {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}