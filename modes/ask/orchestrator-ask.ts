import chalk from "chalk";
import { isCancel, spinner, text } from "@clack/prompts";
import { defaultActionConfig } from "../agent/types";
import { ActionTracker } from "../agent/action-tracker";
import { ToolExecutor } from "../agent/tool-executor";
import { generateText, tool } from "ai";
import { z } from "zod";
import { getAgentAI } from "../../ai";
import { renderMarkdownTerminal } from "../../tui/terminal-md";
import { runApprovalFollowUp } from "../agent/approval";

function createAskTools(executor: ToolExecutor) {
  return {
    read_file: tool({
      description:
        "Read a text file from the workspace. Use a path relative to the project root.",
      parameters: z.object({
        path: z.string().describe("relative file path"),
      }),
      execute: async ({ path: p }) => executor.readFile(p),
    }),
    analyze_codebase: tool({
      description:
        "Summarize structure: file counts, size, extensions. Read-only.",
      parameters: z.object({
        path: z.string().default(".").describe(""),
      }),
      execute: async ({ path: p }: any) => executor.analyzeCodebase(p),
    }),
  };
}

export async function runAskMode() {
  console.log(chalk.bold("\n Ask Mode\n"));

  const goal = await text({
    message: "What would you like to Ask?",
    placeholder: "Please Specify Your Query..",
  });

  if (isCancel(goal) || !goal.trim()) return;

  const config = defaultActionConfig();
  config.tools.allowFileCreation = false;
  config.tools.allowFileModifications = false;
  config.tools.allowFolderCreation = false;
  config.tools.allowShellExecution = false;

  const tracker = new ActionTracker();
  const executor = new ToolExecutor(tracker, config);
  const tools = createAskTools(executor);

  const s = spinner();
  s.start("Agent is thinking and analyzing workspace...");

  try {
    const result = await generateText({
      model: getAgentAI(),
      maxSteps: 40, // replaces stepCountIs(40)
      system: [
        `Workspace root: ${config.CodeBasePath}`,
        "You are a read-only assistant. Answer questions about the codebase.",
      ].join("\n"),
      prompt: goal.trim(),
      tools,
      onStepFinish: ({ toolResults }) => {
        // correct callback name + shape
        s.stop();
        for (const tc of toolResults) {
          const preview = JSON.stringify(tc.args).slice(0, 160); // tc.args not tc.input()
          console.log(
            chalk.green("  ✓"),
            chalk.bold(tc.toolName),
            chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
          );
        }
        s.start("Agent is evaluating results...");
      },
    });

    s.stop();

    if (result.text?.trim()) {
      console.log(renderMarkdownTerminal(result.text));
    }

    const ok = await runApprovalFollowUp(tracker);
    const { errors } = await executor.applyApproved(); // await — it's async now
    if (errors.length) {
      console.log(chalk.red("\nSome operations reported errors:\n"));
      for (const e of errors) console.log(chalk.red(`  • ${e}`));
    } else {
      console.log(chalk.green("\n✓ Applied.\n"));
    }
  } catch (error: any) {
    s.stop("Agent encountered an error.");
    console.error(chalk.red("\nError during generation:"), error);
    if (error.statusCode === 429) {
      console.log(chalk.yellow("Rate limited. Try a different model."));
    } else {
      console.error(error.message || error);
    }
  } finally {
    executor.clearStaging();
  }
}
