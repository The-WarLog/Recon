import { isCancel } from "@clack/prompts";
import { text ,spinner} from "@clack/prompts";
import chalk from "chalk";
import { defaultActionConfig } from "./types";
import { ActionTracker } from "./action-tracker";
import { ToolExecutor } from "./tool-executor";
import { createAgentTools } from "./agent-tools";
import { stepCountIs, ToolLoopAgent } from "ai";
import { getAgentAI } from "../../ai";
import { renderMarkdownTerminal } from "../../tui/terminal-md";
import { runApprovalFollowUp } from "./approval";

export async function runAgentMode(){
    console.log(chalk.bold("\nAgent Mode\n"))
    const goal = await text({
        message: "What would you like the agent to do?",
        placeholder: "Concrete task for this codebase…",
    })
    
    if(isCancel(goal) || !goal.trim()) return

    const config = defaultActionConfig()
    const tracker = new ActionTracker()
    const executor = new ToolExecutor(tracker,config)
    const tools = createAgentTools(executor)

    const agent = new ToolLoopAgent({
        model: getAgentAI(),
        stopWhen: stepCountIs(40),
        instructions: [
          `Workspace root: ${config.CodeBasePath}`,
          "All mutations are staged until approval.",
        ].join("\n"),
        tools,
    })

    // Initialize the clack spinner
    const s = spinner();
    s.start('Agent is thinking and analyzing workspace...');

    try {
        const result = await agent.generate({
            prompt: goal.trim(),
            onStepFinish: ({ toolCalls }) => {
                // Temporarily pause the spinner to log the tool call
                s.stop('Executing tool:'); 
                
                for (const tc of toolCalls) {
                    const preview = JSON.stringify(tc.input).slice(0, 160);
                    console.log(
                        chalk.green("  ✓"),
                        chalk.bold(String(tc.toolName)),
                        chalk.dim(preview + (preview.length >= 160 ? "..." : "")),
                    );
                }
                
                // Restart the spinner for the next agent thought process
                s.start('Agent is evaluating results...');
            },
        });

        s.stop('Agent finished thinking.');

        if (result.text?.trim()) {
            console.log(renderMarkdownTerminal(result.text));
        }

        const ok = await runApprovalFollowUp(tracker)

        const { errors } = executor.applyApproved()

        if (errors.length) {
            console.log(chalk.red("\nSome operations reported errors:\n"));
            for (const e of errors) console.log(chalk.red(`  • ${e}`));
        } else {
            console.log(chalk.green('\n✓ Applied.\n'));
        }
        
    } catch (error: any) {
        s.stop('Agent encountered an error.');
        console.error(chalk.red("\nError during generation:"), error);
        if (error.statusCode === 429) {
    console.log(chalk.yellow("Reason: The AI provider is rate-limiting your requests. Try a different model."));
  } else {
    console.error(error.message || error);
  }
    } finally {
        executor.clearStaging()
    }
}