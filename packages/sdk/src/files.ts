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

  // Determine if we have any include filters
  const hasIncludeDirs = includeDirs?.length;
  const hasIncludeFiles = includeFiles?.length;
  const hasExtensions = extensionSet && extensionSet.size > 0;

  // If no include filters specified, include everything
  if (!hasIncludeDirs && !hasIncludeFiles) {
    if (hasExtensions) {
      // Only specific extensions from everywhere
      for (const ext of extensionSet!) {
        patterns.push(`**/*${ext}`);
      }
    } else {
      // Everything
      patterns.push("**/*");
    }
  } else {
    // Build patterns from includeDirs
    if (hasIncludeDirs) {
      if (hasExtensions) {
        // Specific extensions from specific directories
        for (const dir of includeDirs!) {
          for (const ext of extensionSet!) {
            patterns.push(
              `${escapeGlobPath(toRelativePattern(dir))}/**/*${ext}`
            );
          }
        }
      } else {
        // All files from specific directories
        patterns.push(
          ...includeDirs!.map(
            (dir) => `${escapeGlobPath(toRelativePattern(dir))}/**/*`
          )
        );
      }
    }

    // Add specific includeFiles patterns (additive, not replacing)
    if (hasIncludeFiles) {
      patterns.push(...includeFiles!.map((file) => toRelativePattern(file)));
    }
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
  // Normalize paths to forward slashes for cross-platform compatibility with the ignore library
  return entries.filter((entry) => {
    const relativePath = path
      .relative(baseDir.replace(/\\/g, "/"), entry)
      .replace(/\\/g, "/");
    return !ig.ignores(relativePath);
  });
}
