#!/usr/bin/env tsx
/**
 * Release Script with Workspace Dependency Fix
 *
 * This script handles the conversion of workspace:* dependencies to actual versions
 * before publishing to npm, fixing the EUNSUPPORTEDPROTOCOL error.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, "..");

// Parse command line arguments
const args = process.argv.slice(2);
const versionBumpArg = args.find((arg) => !arg.startsWith("--")) || "patch";
const isAlpha = args.includes("--alpha");
const skipGit = args.includes("--no-git");

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function run(command: string, cwd: string) {
  console.log(`Executing: ${command} in ${cwd}`);
  execSync(command, { stdio: "inherit", cwd });
}

/**
 * Read and parse a package.json file
 */
function readPackageJson(pkgPath: string): PackageJson {
  const pkgJsonPath = path.join(pkgPath, "package.json");
  return JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
}

/**
 * Write a package.json file
 */
function writePackageJson(pkgPath: string, pkgJson: PackageJson) {
  const pkgJsonPath = path.join(pkgPath, "package.json");
  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
}

/**
 * Get all workspace packages
 */
function getWorkspacePackages(): Map<
  string,
  { path: string; version: string }
> {
  const packages = new Map();
  const packagesDir = path.join(rootPath, "packages");

  // Read all directories in packages/
  const dirs = fs.readdirSync(packagesDir).filter((dir) => {
    const dirPath = path.join(packagesDir, dir);
    return (
      fs.statSync(dirPath).isDirectory() &&
      fs.existsSync(path.join(dirPath, "package.json"))
    );
  });

  // Read package info from each directory
  dirs.forEach((dir) => {
    const dirPath = path.join(packagesDir, dir);
    const pkg = readPackageJson(dirPath);
    packages.set(pkg.name, { path: dirPath, version: pkg.version });
  });

  return packages;
}

/**
 * Replace workspace:* dependencies with actual versions
 */
function replaceWorkspaceDependencies(
  pkgPath: string,
  workspacePackages: Map<string, { path: string; version: string }>
) {
  const pkg = readPackageJson(pkgPath);
  let modified = false;

  // Helper to replace workspace protocol in dependency object
  const replaceDeps = (deps?: Record<string, string>) => {
    if (!deps) return;

    Object.keys(deps).forEach((depName) => {
      if (deps[depName].startsWith("workspace:")) {
        const workspacePkg = workspacePackages.get(depName);
        if (workspacePkg) {
          // Replace workspace:* with ^version
          const versionSpec = deps[depName];
          if (versionSpec === "workspace:*" || versionSpec === "workspace:^") {
            deps[depName] = `^${workspacePkg.version}`;
            console.log(
              `  Replaced ${depName}: workspace:* → ^${workspacePkg.version}`
            );
            modified = true;
          } else if (versionSpec === "workspace:~") {
            deps[depName] = `~${workspacePkg.version}`;
            console.log(
              `  Replaced ${depName}: workspace:~ → ~${workspacePkg.version}`
            );
            modified = true;
          }
          // Handle specific versions like workspace:1.0.0
          else if (versionSpec.startsWith("workspace:")) {
            const version = versionSpec.replace("workspace:", "");
            deps[depName] = version;
            console.log(`  Replaced ${depName}: ${versionSpec} → ${version}`);
            modified = true;
          }
        } else {
          console.warn(
            `  Warning: Could not find workspace package ${depName}`
          );
        }
      }
    });
  };

  console.log(`Checking workspace dependencies in ${pkg.name}...`);
  replaceDeps(pkg.dependencies);
  replaceDeps(pkg.devDependencies);
  replaceDeps(pkg.peerDependencies);

  if (modified) {
    // Create a backup of the original package.json
    const backupPath = path.join(pkgPath, "package.json.backup");
    fs.copyFileSync(path.join(pkgPath, "package.json"), backupPath);

    // Write the modified package.json
    writePackageJson(pkgPath, pkg);
    console.log(`  Updated package.json (backup saved as package.json.backup)`);
  } else {
    console.log(`  No workspace dependencies found`);
  }

  return modified;
}

/**
 * Restore original package.json from backup
 */
function restorePackageJson(pkgPath: string) {
  const backupPath = path.join(pkgPath, "package.json.backup");
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, path.join(pkgPath, "package.json"));
    fs.unlinkSync(backupPath);
    console.log(`Restored original package.json from backup`);
  }
}

/**
 * Bump version in package.json
 */
function bumpVersion(
  pkgPath: string,
  type: "major" | "minor" | "patch" | string,
  isAlpha: boolean = false
): string {
  const pkg = readPackageJson(pkgPath);
  const currentVersion = pkg.version;
  let newVersion: string;

  // Parse current version
  const versionRegex = /^(\d+\.\d+\.\d+)(?:-alpha\.(\d+))?$/;
  const match = currentVersion.match(versionRegex);

  if (!match) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  let baseVersion = match[1];
  const currentAlphaVersion = match[2] ? Number.parseInt(match[2], 10) : -1;

  // Handle version bumping
  if (type === "major" || type === "minor" || type === "patch") {
    const [major, minor, patch] = baseVersion.split(".").map(Number);

    if (type === "major") {
      baseVersion = `${major + 1}.0.0`;
    } else if (type === "minor") {
      baseVersion = `${major}.${minor + 1}.0`;
    } else {
      baseVersion = `${major}.${minor}.${patch + 1}`;
    }
  } else if (/^\d+\.\d+\.\d+$/.test(type)) {
    baseVersion = type;
  } else {
    throw new Error(
      `Invalid version bump type: ${type}. Use 'major', 'minor', 'patch', or a specific version.`
    );
  }

  // Create final version string
  if (isAlpha) {
    const alphaVersion = baseVersion === match[1] ? currentAlphaVersion + 1 : 0;
    if (alphaVersion < 0) {
      throw new Error(
        `Cannot create alpha version from non-alpha version ${currentVersion} without bumping base version.`
      );
    }
    newVersion = `${baseVersion}-alpha.${alphaVersion}`;
  } else {
    newVersion = baseVersion;
  }

  // Update package.json
  pkg.version = newVersion;
  writePackageJson(pkgPath, pkg);

  console.log(`Bumped version from ${currentVersion} to ${newVersion}`);
  return newVersion;
}

async function publishPackages() {
  console.log(`🚀 Starting ${isAlpha ? "alpha" : ""} release process...`);
  console.log(`📝 Version bump: ${versionBumpArg}`);

  // Get all workspace packages
  const workspacePackages = getWorkspacePackages();
  console.log(`Found ${workspacePackages.size} workspace packages`);

  // Build all packages first
  console.log("🔨 Building all packages...");
  run("pnpm build", rootPath);

  // Bump versions in all packages
  const newVersions = new Map<string, string>();

  // First bump SDK version
  const sdkPath = path.join(rootPath, "packages", "sdk");
  if (fs.existsSync(sdkPath)) {
    const sdkVersion = bumpVersion(sdkPath, versionBumpArg, isAlpha);
    newVersions.set("@codefetch/sdk", sdkVersion);
  }

  // Then bump CLI version
  const cliPath = path.join(rootPath, "packages", "cli");
  if (fs.existsSync(cliPath)) {
    const cliVersion = bumpVersion(cliPath, versionBumpArg, isAlpha);
    newVersions.set("codefetch", cliVersion);
  }

  // Update MCP version if exists
  const mcpPath = path.join(rootPath, "packages", "mcp");
  if (fs.existsSync(mcpPath)) {
    const mcpVersion = bumpVersion(mcpPath, versionBumpArg, isAlpha);
    newVersions.set("@codefetch/mcp", mcpVersion);
  }

  // Update workspace packages map with new versions
  newVersions.forEach((version, name) => {
    const pkg = workspacePackages.get(name);
    if (pkg) {
      pkg.version = version;
    }
  });

  // Replace workspace dependencies in all packages
  const modifiedPackages: string[] = [];

  workspacePackages.forEach((pkgInfo, pkgName) => {
    if (replaceWorkspaceDependencies(pkgInfo.path, workspacePackages)) {
      modifiedPackages.push(pkgInfo.path);
    }
  });

  try {
    // Create git commit and tag if not skipped
    if (!skipGit) {
      console.log("Creating git commit and tag...");
      run("git add -A", rootPath);
      const mainVersion =
        newVersions.get("codefetch") || Array.from(newVersions.values())[0];
      const commitMsg = isAlpha
        ? `chore: alpha release v${mainVersion}`
        : `chore: release v${mainVersion}`;
      run(`git commit -m "${commitMsg}"`, rootPath);
      run(`git tag -a v${mainVersion} -m "Release v${mainVersion}"`, rootPath);
    }

    // Publish packages in order: SDK first, then others
    console.log(`📤 Publishing packages to npm...`);

    const publishCmd = isAlpha
      ? "npm publish --tag alpha --access public"
      : "npm publish --access public";

    // Publish SDK first
    if (fs.existsSync(sdkPath)) {
      console.log("Publishing @codefetch/sdk...");
      run(publishCmd, sdkPath);
    }

    // Publish CLI
    if (fs.existsSync(cliPath)) {
      console.log("Publishing codefetch...");
      run(publishCmd, cliPath);
    }

    // Publish MCP
    if (fs.existsSync(mcpPath)) {
      console.log("Publishing @codefetch/mcp...");
      run(publishCmd, mcpPath);
    }

    // Push to git if not skipped
    if (!skipGit) {
      console.log("Pushing to git...");
      run("git push", rootPath);
      run("git push --tags", rootPath);
    }

    console.log(`✅ Successfully completed ${isAlpha ? "alpha" : ""} release!`);
  } finally {
    // Restore original package.json files
    console.log("Cleaning up...");
    modifiedPackages.forEach((pkgPath) => {
      restorePackageJson(pkgPath);
    });
  }
}

// Run the publish process
publishPackages().catch((error) => {
  console.error("❌ Error during release process:", error);

  // Try to restore package.json files on error
  const workspacePackages = getWorkspacePackages();
  workspacePackages.forEach((pkgInfo) => {
    restorePackageJson(pkgInfo.path);
  });

  process.exit(1);
});
