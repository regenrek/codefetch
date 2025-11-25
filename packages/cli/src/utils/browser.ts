import { spawn } from "node:child_process";

/**
 * Build a chat URL with model parameter
 */
export function buildChatUrl(baseUrl: string, model: string): string {
  // Normalize URL - add https:// if no protocol
  let url = baseUrl;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Remove trailing slash for consistency
  url = url.replace(/\/+$/, "");

  // Add model parameter
  const urlObj = new URL(url);
  urlObj.searchParams.set("model", model);

  return urlObj.toString();
}

/**
 * Open the default browser with the given URL
 * Cross-platform: macOS (open), Windows (start), Linux (xdg-open)
 */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  let command: string;
  let args: string[];

  if (platform === "darwin") {
    // macOS
    command = "open";
    args = [url];
  } else if (platform === "win32") {
    // Windows - use start command through cmd
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    // Linux - use xdg-open
    command = "xdg-open";
    args = [url];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });

    proc.on("error", (err) => {
      if (platform === "linux") {
        reject(
          new Error(
            "Could not open browser. On Linux, please install xdg-utils:\n" +
              "  Ubuntu/Debian: sudo apt-get install xdg-utils\n" +
              "  Fedora: sudo dnf install xdg-utils"
          )
        );
      } else {
        reject(new Error(`Failed to open browser: ${err.message}`));
      }
    });

    // Don't wait for the browser to close
    proc.unref();

    // Give it a moment to spawn, then resolve
    setTimeout(resolve, 100);
  });
}
