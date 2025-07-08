import type { FileNode, FetchMetadata } from "./types";

export class FetchResultImpl {
  constructor(
    public root: FileNode,
    public metadata: FetchMetadata
  ) {}

  /**
   * Get a file node by its path
   */
  getFileByPath(path: string): FileNode | null {
    // Normalize path (remove leading slash if present)
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

    function searchNode(node: FileNode, currentPath: string): FileNode | null {
      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;

      if (node.type === "file" && nodePath === normalizedPath) {
        return node;
      }

      if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          const result = searchNode(child, nodePath);
          if (result) return result;
        }
      }

      return null;
    }

    // Special case for root
    if (normalizedPath === "" || normalizedPath === "/") {
      return this.root;
    }

    // Search in children
    if (this.root.children) {
      for (const child of this.root.children) {
        const result = searchNode(child, "");
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Get all files as a flat array
   */
  getAllFiles(): FileNode[] {
    const files: FileNode[] = [];

    function collectFiles(node: FileNode) {
      if (node.type === "file") {
        files.push(node);
      } else if (node.type === "directory" && node.children) {
        for (const child of node.children) {
          collectFiles(child);
        }
      }
    }

    collectFiles(this.root);
    return files;
  }

  /**
   * Convert to markdown format
   */
  toMarkdown(): string {
    const lines: string[] = [];

    // Add project structure
    lines.push("Project Structure:");
    lines.push(this.buildTreeString(this.root));
    lines.push("");

    // Add file contents
    const files = this.getAllFiles();
    for (const file of files) {
      if (file.content) {
        lines.push(`${file.path}`);
        lines.push("```");
        const contentLines = file.content.split("\n");
        for (const [index, line] of contentLines.entries()) {
          lines.push(`${index + 1} | ${line}`);
        }
        lines.push("```");
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Build tree string representation
   */
  private buildTreeString(node: FileNode, prefix = "", isLast = true): string {
    const lines: string[] = [];

    if (node.name) {
      // Skip empty root name
      const connector = isLast ? "└── " : "├── ";
      lines.push(prefix + connector + node.name);
    }

    if (node.type === "directory" && node.children) {
      const extension = node.name ? (isLast ? "    " : "│   ") : "";
      const newPrefix = prefix + extension;

      for (const [index, child] of node.children.entries()) {
        const childIsLast = index === node.children!.length - 1;
        lines.push(this.buildTreeString(child, newPrefix, childIsLast));
      }
    }

    return lines.join("\n");
  }
}
