import { spawn } from "node:child_process";

/**
 * Cross-platform clipboard copy function
 * Supports macOS (pbcopy), Windows (PowerShell), and Linux (xclip/xsel)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  let command: string;
  let args: string[];

  if (platform === "darwin") {
    // macOS
    command = "pbcopy";
    args = [];
  } else if (platform === "win32") {
    // Windows - use PowerShell's Set-Clipboard for better Unicode support
    command = "powershell";
    args = ["-NoProfile", "-Command", "Set-Clipboard", "-Value", "$input"];
  } else {
    // Linux - try xclip first, fall back to xsel
    command = "xclip";
    args = ["-selection", "clipboard"];
  }

  const tryClipboard = (cmd: string, cmdArgs: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, cmdArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `exit code ${code}`));
        }
      });

      proc.on("error", (err) => {
        reject(err);
      });

      // Write data to stdin and close it
      proc.stdin?.write(text, (err) => {
        if (err) {
          reject(err);
        } else {
          proc.stdin?.end();
        }
      });
    });
  };

  try {
    await tryClipboard(command, args);
  } catch (error) {
    // On Linux, if xclip fails, try xsel
    if (platform === "linux" && command === "xclip") {
      try {
        await tryClipboard("xsel", ["--clipboard", "--input"]);
      } catch {
        throw new Error(
          "Clipboard copy failed. On Linux, please install xclip or xsel:\n" +
            "  Ubuntu/Debian: sudo apt-get install xclip\n" +
            "  Fedora: sudo dnf install xclip\n" +
            "  Arch: sudo pacman -S xclip"
        );
      }
    } else if (platform === "linux") {
      throw new Error(
        "Clipboard copy failed. On Linux, please install xclip or xsel:\n" +
          "  Ubuntu/Debian: sudo apt-get install xclip\n" +
          "  Fedora: sudo dnf install xclip\n" +
          "  Arch: sudo pacman -S xclip"
      );
    } else {
      throw new Error(
        `Clipboard copy failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
