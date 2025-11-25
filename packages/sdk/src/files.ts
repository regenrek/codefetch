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

  // Helper to convert absolute paths to relative paths for fast-glob
  const toRelativePattern = (pattern: string): string => {
    const normalized = pattern.replace(/\\/g, "/");
    if (path.isAbsolute(normalized)) {
      const relative = path.relative(baseDir.replace(/\\/g, "/"), normalized);
      return relative.startsWith("..") ? normalized : relative;
    }
    return normalized;
  };

  // Build glob patterns
  const patterns: string[] = [];

  // Handle include directories
  if (includeDirs?.length) {
    patterns.push(
      ...includeDirs.map(
        (dir) => `${escapeGlobPath(toRelativePattern(dir))}/**/*`
      )
    );
  } else {
    patterns.push("**/*");
  }

  // Handle exclude directories
  const ignore = [
    ...(excludeDirs?.map(
      (dir) => `${escapeGlobPath(toRelativePattern(dir))}/**`
    ) || []),
    ...(excludeFiles?.map((file) => {
      const normalized = toRelativePattern(file);
      return normalized.replace(/\\/g, "/");
    }) || []),
  ];

  // Handle file extensions
  if (extensionSet) {
    const exts = [...extensionSet];
    patterns.length = 0; // Clear patterns if we have specific extensions
    if (includeDirs?.length) {
      for (const dir of includeDirs) {
        for (const ext of exts) {
          patterns.push(`${escapeGlobPath(toRelativePattern(dir))}/**/*${ext}`);
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
    // Convert absolute paths to relative paths relative to baseDir for fast-glob
    // fast-glob works better with relative paths when cwd is set
    patterns.push(...includeFiles.map((file) => toRelativePattern(file)));
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
  // Use baseDir instead of process.cwd() for consistency with path resolution
  return entries.filter((entry) => {
    const relativePath = path.relative(baseDir.replace(/\\/g, "/"), entry);
    return !ig.ignores(relativePath);
  });
}
