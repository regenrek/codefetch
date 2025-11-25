import { spawn } from "node:child_process";

/**
 * Build a chat URL with model and prompt parameters
 */
export function buildChatUrl(
  baseUrl: string,
  model: string,
  prompt?: string
): string {
  // Remove trailing slash for consistency
  const url = baseUrl.replace(/\/+$/, "");

  // Ensure URL has a protocol for URL constructor (but we'll remove it from final output)
  const hasProtocol = url.startsWith("http://") || url.startsWith("https://");
  const urlWithProtocol = hasProtocol ? url : `https://${url}`;

  // Add model and prompt parameters
  const urlObj = new URL(urlWithProtocol);
  urlObj.searchParams.set("model", model);
  if (prompt) {
    urlObj.searchParams.set("prompt", prompt);
  }

  // Return URL without protocol prefix (as per requirements)
  const result = urlObj.toString();
  if (hasProtocol) {
    return result;
  }
  // Remove https:// prefix we added
  return result.replace(/^https:\/\//, "");
}

/**
 * Open the default browser with the given URL
 * Cross-platform: macOS (open), Windows (start), Linux (xdg-open)
 */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  // Add https:// protocol if missing (required for browser to open)
  // The URL format we generate doesn't include protocol, but browsers need it
  const urlWithProtocol =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;

  let command: string;
  let args: string[];

  if (platform === "darwin") {
    // macOS
    command = "open";
    args = [urlWithProtocol];
  } else if (platform === "win32") {
    // Windows - use start command through cmd
    command = "cmd";
    args = ["/c", "start", "", urlWithProtocol];
  } else {
    // Linux - use xdg-open
    command = "xdg-open";
    args = [urlWithProtocol];
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
