import fs, { glob } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { ActionTracker } from "./action-tracker";
import type { ActionType } from "./types";
import type { ActionConfig } from "./types";
import { Glob } from "bun";
import { error } from "node:console";
import type { X509Certificate } from "node:crypto";
import { log } from "@clack/prompts";
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".txt",
]);

function isTextFileOrNot(filepath: string): boolean {
  const ext = path.extname(filepath).toLocaleLowerCase();
  return TEXT_EXT.has(ext) || ext === " ";
}

export class ToolExecutor {
  private overlay = new Map<string, string>();
  private deleted = new Set<string>(); //kay kay delete kele itha

  //apan ata path la normalize karu posix cha help ni
  private readonly norm = (rel: string) => {
    return path.posix
      .normalize(rel.split(path.sep).join("/"))
      .replace(/^[./]+/, ""); // remove any "./" or "../" here
  };

  constructor(
    private readonly tracker: ActionTracker,
    private readonly config: ActionConfig,
  ) {}

  private resolvePath(rel: string): string {
    //  method resolves a sequence of paths or path segments into an absolute path.
    const abs = path.resolve(this.config.CodeBasePath, rel);
    const root = path.resolve(this.config.CodeBasePath); //process.cwd() current working directory
    const RealPath = path.relative(root, abs);
    if (RealPath.startsWith("..") || path.isAbsolute(RealPath)) {
      throw new Error(`Unable To Resolve Path ${rel}`);
    }
    return abs;
  }
  //this might give me errors or would not work well
  private ExcludedPatterns(realtivePath: string): boolean {
    const normpath = this.norm(realtivePath);
    const PathList = normpath.split("/");
    const Base = PathList[PathList.length - 1] ?? "";
    for (const pattern of this.config.ExcludedFiles) {
      if (pattern === "*.log" && Base.endsWith(".log")) return true;
      if (pattern === ".env" && Base.endsWith(".env")) return true;
      if (pattern.includes("*")) continue;
      if (
        PathList.includes(pattern) ||
        normpath === pattern ||
        normpath.startsWith(`${pattern}`)
      )
        return true;
    }
    return false;
  }

  private assertNotExcluded(rel: string, operations: ActionType): void {
    if (this.ExcludedPatterns(rel)) {
      throw new Error(`${operations}: path is excluded by policy: ${rel}`);
    }
  }
  getEffectiveText(relPath: string): string | undefined {
    const normPath = this.norm(relPath);
    if (this.deleted.has(normPath)) return undefined;
    if (this.overlay.has(normPath)) return this.overlay.get(normPath); //edited stuff
    const safepath = this.resolvePath(normPath);
    if (!fs.existsSync(safepath) || !fs.statSync(safepath).isFile())
      return undefined;
    return fs.readFileSync(safepath).toString("utf-8");
  }

  readFile(relPath: string): string {
    const normPath = this.norm(relPath);
    this.assertNotExcluded(normPath, "read_file"); //checking the patterns if it has excluded ones
    const resolvedPath = this.resolvePath(normPath);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new Error(`${resolvedPath} File Not Found`);
    }
    const buffer = fs.statSync(resolvedPath);
    if (buffer.size > this.config.maxFileSizeToRead) {
      throw new Error(
        `${buffer} Size Exceeded ${this.config.maxFileSizeToRead}`,
      );
    }
    const text = fs.readFileSync(resolvedPath).toString("utf-8");
    this.tracker.log({
      path: resolvedPath,
      type: "code_analysis",
      details: { after: text, toolName: "read_file" },
      status: "executed",
    });

    return text;
  }

  createFile(realPath: string, content: string): string {
    const normPath = this.norm(realPath);

    this.assertNotExcluded(normPath, "create_file");
    const safePath = this.resolvePath(normPath);
    if (fs.existsSync(safePath) && !this.deleted.has(normPath)) {
      throw new Error(`File already exists: ${normPath}`);
    }
    this.overlay.set(normPath, content);
    this.deleted.delete(normPath); //why ?? IDK
    this.tracker.log({
      path: safePath,
      type: "create_file",
      details: { after: content, toolName: "create_file" },
      status: "pending",
    });

    return `File Created at ${safePath}`;
  }
  modifyFile(relPath: string, newContent: string): string {
    if (!this.config.tools.allowFileModifications) {
      throw new Error("File modification is disabled in config");
    }

    const normPath = this.norm(relPath);
    this.assertNotExcluded(normPath, "modify_file");

    // Get the current content (from overlay or disk) so we can store it as "before"
    const before = this.getEffectiveText(relPath);
    if (before === undefined) {
      throw new Error(`modify_file: file not found: ${relPath}`);
    }

    // Stage the new content
    this.overlay.set(normPath, newContent);

    this.tracker.log({
      path: normPath,
      type: "modify_file",
      details: { before, after: newContent, toolName: "modify_file" },
      status: "pending",
    });

    return `Staged modification: ${normPath}`;
  }

  // ─── DELETE FILE ──────────────────────────────────────────────────────────
  // Stages a file for deletion. The file won't actually be deleted until applyApproved().
  deleteFile(relPath: string): string {
    if (!this.config.tools.allowFileModifications) {
      throw new Error("File deletion is disabled in config");
    }

    const normPath = this.norm(relPath);
    this.assertNotExcluded(normPath, "delete_file");

    // File must exist to be deleted
    const before = this.getEffectiveText(relPath);
    if (before === undefined) {
      throw new Error(`delete_file: file not found: ${relPath}`);
    }

    // Remove from overlay (any staged edits are discarded) and mark as deleted
    this.overlay.delete(normPath);
    this.deleted.add(normPath);

    this.tracker.log({
      path: normPath,
      type: "delete_file",
      details: { before, toolName: "delete_file" },
      status: "pending",
    });

    return `Staged deletion: ${normPath}`;
  }
  createFolder(relPath: string): string {
    if (!this.config.tools.allowFolderCreation) {
      throw new Error("Folder creation is disabled in config");
    }

    const normPath = this.norm(relPath);
    this.assertNotExcluded(normPath, "create_folder");

    this.tracker.log({
      path: normPath,
      type: "create_folder",
      details: { after: normPath, toolName: "create_folder" },
      status: "pending",
    });

    return `Staged folder: ${normPath}`;
  }

  //AI list files
  listFiles(rel: string, recursive: boolean): string {
    this.assertNotExcluded(rel, "list_files");
    const abs = this.resolvePath(rel);
    if (!fs.existsSync(abs)) throw new Error(`list_files: not found: ${rel}`);

    const lines: string[] = [];

    // Check if the target target path is an actual directory
    if (fs.statSync(abs).isDirectory()) {
      // If recursive is false, use a flat match; otherwise match all subdirectories
      const pattern = recursive ? "**/*" : "*";
      const glob = new Bun.Glob(pattern);

      // Bun natively fetches every single path string instantly!
      for (const fileRelativePath of glob.scanSync({ cwd: abs })) {
        const fullPath = path.join(abs, fileRelativePath);
        const projectRelativePath = path.relative(
          this.config.CodeBasePath,
          fullPath,
        );

        // Keep your custom business logic filters intact
        if (this.ExcludedPatterns(fullPath)) continue;

        // Format directories with a trailing slash to match original layout
        if (fs.statSync(fullPath).isDirectory()) {
          lines.push(`${fileRelativePath}/`);
        } else {
          lines.push(fileRelativePath);
        }
      }
    } else {
      lines.push(path.relative(this.config.CodeBasePath, abs));
    }

    const out = lines.sort().join("\n");

    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rel),
      details: { after: out, toolName: "list_files" },
      status: "executed",
    });

    return out || "(empty)";
  }

  // ─── SEARCH FILES ─────────────────────────────────────────────────────────
  // Finds files matching a glob pattern (e.g. "**/*.ts") under a root folder.
  // Optionally also filters by whether the file contains a specific string.
  searchFiles(
    rootRel: string,
    globPattern: string,
    contentQuery?: string,
  ): string {
    this.assertNotExcluded(rootRel, "read_file");

    const rootAbs = this.resolvePath(this.norm(rootRel));
    if (!fs.existsSync(rootAbs)) {
      throw new Error(`search_files: root not found: ${rootRel}`);
    }

    // Bun.Glob does all the pattern matching for you — no manual regex needed
    const glob = new Bun.Glob(globPattern);

    // scan() walks the directory recursively and yields matching file paths
    const matches: string[] = [];
    for (const file of glob.scanSync({ cwd: rootAbs, onlyFiles: true })) {
      // file is already relative to rootAbs, convert to relative from codebase root
      const relToRoot = this.norm(path.join(rootRel, file));

      if (this.ExcludedPatterns(relToRoot)) continue;

      // If a content query was given, check the file actually contains it
      if (contentQuery) {
        // Use a proper safety check before reading raw bytes
        if (!isTextFileOrNot(path.join(rootAbs, file))) continue;

        const text = fs.readFileSync(path.join(rootAbs, file), "utf-8");
        if (!text.includes(contentQuery)) continue;
      }

      matches.push(relToRoot);
    }

    const result = matches.sort().join("\n");
    this.tracker.log({
      path: this.norm(rootRel),
      type: "code_analysis",
      details: { after: result || "(no matches)", toolName: "search_files" },
      status: "executed",
    });

    return result || "(no matches)";
  }

  // ─── APPLY APPROVED ───────────────────────────────────────────────────────
  // This is where staged changes actually get written to disk.
  // Only actions with status="approved" in the tracker are applied.
  // Returns a list of any errors that happened during apply.
  applyApproved(): { errors: string[] } {
    const errors: string[] = [];
    const allActions = [...this.tracker.getAllActions()];

    // Step 1: Create folders first (files might need the folder to exist)
    for (const action of allActions) {
      if (action.type === "create_folder" && action.status === "approved") {
        try {
          fs.mkdirSync(this.resolvePath(action.path), { recursive: true });
        } catch (e) {
          errors.push(`create_folder failed: ${e}`);
        }
      }
    }

    // Step 2: Apply file operations (create, modify, delete)
    // For each path, only apply the LATEST action (in case there were multiple edits)
    const fileActions = allActions.filter(
      (a) =>
        (a.type === "create_file" ||
          a.type === "modify_file" ||
          a.type === "delete_file") &&
        a.status === "approved",
    );

    // Sort by time so the latest action per path wins
    fileActions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const latestPerPath = new Map<string, (typeof fileActions)[0]>();
    for (const action of fileActions) {
      latestPerPath.set(this.norm(action.path), action);
    }

    for (const [normPath, action] of latestPerPath) {
      try {
        const abs = this.resolvePath(normPath);
        if (action.type === "delete_file") {
          fs.rmSync(abs, { force: true }); // force=true means no error if already gone
        } else {
          // Make sure the parent folder exists before writing
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, action.details.after ?? "", "utf-8");
        }
      } catch (e) {
        errors.push(`file op failed on ${normPath}: ${e}`);
      }
    }

    // Step 3: Run any approved shell commands
    for (const action of allActions) {
      if (action.type === "tool_execute" && action.status === "approved") {
        const cmd = action.details.command;
        if (!cmd) continue;

        const result = spawnSync(cmd, {
          shell: true,
          cwd: this.config.CodeBasePath,
          encoding: "utf-8",
          maxBuffer: 16 * 1024 * 1024, // 16MB output limit
        });

        if (result.status !== 0) {
          errors.push(`shell command failed (exit ${result.status}): ${cmd}`);
        }
      }
    }

    return { errors };
  }

  // Clears all staged changes (overlay + deleted set).
  // Useful if you want to throw away everything and start fresh.
  clearStaging(): void {
    this.overlay.clear();
    this.deleted.clear();
  }

  queueShell(command: string): string {
    if (!this.config.tools.allowShellExecution)
      throw new Error("Shell execution disabled");
    this.tracker.log({
      type: "tool_execute",
      path: "shell",
      details: { command, toolName: "execute_shell" },
      status: "pending",
    });
    return `Shell queued: ${command}`;
  }

  analyzeCodebase(relPath: string): string {
    const normPath = this.norm(relPath);
    this.assertNotExcluded(normPath, "code_analysis");

    const safePath = this.resolvePath(normPath); // resolve BEFORE existsSync
    if (!fs.existsSync(safePath)) {
      throw new Error(`Path doesn't exist: ${relPath}`);
    }

    let files = 0;
    let dirs = 0;

    const glob = new Bun.Glob("**/*");
    for (const fil of glob.scanSync({
      cwd: safePath,
      onlyFiles: false,
      dot: true,
    })) {
      if (this.ExcludedPatterns(fil)) continue; // skip node_modules, .git etc.

      if (fs.statSync(path.join(safePath, fil)).isDirectory()) {
        dirs++;
      } else {
        files++;
      }
    }

    const summary = `Files: ${files} | Directories: ${dirs}`;
    this.tracker.log({
      type: "code_analysis",
      path: safePath,
      details: { after: summary },
      status: "executed",
    });

    return summary;
  }
}
