import path from "pathe";
import fg from "fast-glob";

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
    patterns.push(...includeDirs.map((dir) => `${dir}/**/*`));
  } else {
    patterns.push("**/*");
  }

  // Handle exclude directories
  const ignore = [
    ...(excludeDirs?.map((dir) => `${dir}/**`) || []),
    ...(excludeFiles || []),
  ];

  // Handle file extensions
  if (extensionSet) {
    const exts = [...extensionSet];
    patterns.length = 0; // Clear patterns if we have specific extensions
    if (includeDirs?.length) {
      for (const dir of includeDirs) {
        for (const ext of exts) {
          patterns.push(`${dir}/**/*${ext}`);
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
    patterns.push(...includeFiles);
  }

  logVerbose(`Scanning with patterns: ${patterns.join(", ")}`, 2);
  logVerbose(`Ignoring: ${ignore.join(", ")}`, 2);

  const entries = await fg(patterns, {
    cwd: baseDir,
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
