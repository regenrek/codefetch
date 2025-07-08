import path from "pathe";
import fg from "fast-glob";

// Helper function to escape special glob characters in paths
function escapeGlobPath(str: string): string {
  // First normalize path separators to forward slashes for fast-glob
  const normalized = str.replace(/\\/g, "/");
  // Then escape special glob characters: * ? [ ] { } ( ) ! @ + |
  return normalized.replace(/[*?[\]{}()!@+|]/g, (match) => "\\" + match);
}

export async function collectFiles(
  baseDir: string,
  options: {
    ig: any;
    extensionSet: Set<string> | null;
    excludeFiles: string[] | null;
    includeFiles: string[] | null;
    excludeDirs: string[] | null;
    includeDirs: string[] | null;
    verbose: number;
  }
): Promise<string[]> {
  const {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
    verbose,
  } = options;

  function logVerbose(message: string, level: number) {
    if (verbose >= level) {
      console.log(message);
    }
  }

  // Build glob patterns
  const patterns: string[] = [];

  // Handle include directories
  if (includeDirs?.length) {
    patterns.push(...includeDirs.map((dir) => `${escapeGlobPath(dir)}/**/*`));
  } else {
    patterns.push("**/*");
  }

  // Handle exclude directories
  const ignore = [
    ...(excludeDirs?.map((dir) => `${escapeGlobPath(dir)}/**`) || []),
    ...(excludeFiles?.map((file) => file.replace(/\\/g, "/")) || []),
  ];

  // Handle file extensions
  if (extensionSet) {
    const exts = [...extensionSet];
    patterns.length = 0; // Clear patterns if we have specific extensions
    if (includeDirs?.length) {
      for (const dir of includeDirs) {
        for (const ext of exts) {
          patterns.push(`${escapeGlobPath(dir)}/**/*${ext}`);
        }
      }
    } else {
      for (const ext of exts) {
        patterns.push(`**/*${ext}`);
      }
    }
  }

  // Handle include files
  if (includeFiles?.length) {
    patterns.length = 0; // Clear patterns if we have specific files
    // Normalize path separators in include files for fast-glob
    patterns.push(...includeFiles.map((file) => file.replace(/\\/g, "/")));
  }

  logVerbose(`Scanning with patterns: ${patterns.join(", ")}`, 2);
  logVerbose(`Ignoring: ${ignore.join(", ")}`, 2);

  const entries = await fg(patterns, {
    cwd: baseDir.replace(/\\/g, "/"),
    dot: true,
    absolute: true,
    ignore,
    onlyFiles: true,
    suppressErrors: true,
    followSymbolicLinks: true,
    caseSensitiveMatch: true,
  });

  // Apply gitignore patterns
  return entries.filter((entry) => {
    const relativePath = path.relative(process.cwd(), entry);
    return !ig.ignores(relativePath);
  });
}
