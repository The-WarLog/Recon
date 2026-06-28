import chalk from "chalk";
import type { ActionTracker } from "./action-tracker";
import { composeBeforeAfter, formatPatch } from "./diff-view";
import type { ActionLog } from "./types";
import { select, isCancel } from "@clack/prompts";
import { idText } from "typescript";
import { renderMarkdownTerminal } from "../../tui/terminal-md";

interface ReviewGroup {
  label: string;
  actionsIDs: string[];
  patch: string | null;
}

function groupPending(pending: ActionLog[]): ReviewGroup[] {
  const byPath = new Map<string, ActionLog[]>();
  const shells: ActionLog[] = [];
  for (const t of pending) {
    if (t.type == "tool_execute") {
      shells.push(t);
      continue;
    }
    const key = t.path;
    if (!byPath.has(key)) {
      byPath.set(key, []);
    }
    byPath.get(key)!.push(t);
  }
  const groups: ReviewGroup[] = [];
  //sort the byPath entries from least to most IMP
  // [a]=key/Path, [b]=value/ActionLog[]
  const pathEntries = [...byPath.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [p, action] of pathEntries) {
    const sorted = action.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const ids = sorted.map((x) => x.id); // stores all the Ids from pendingtask(ActionLog)
    if (sorted.every((x) => x.type === "create_folder")) {
      //special case if there is folderCreation  then we do not need the diff
      groups.push({
        label: `Create folder: ${p}`,
        actionsIDs: ids,
        patch: null,
      });
    }

    const { before, after } = composeBeforeAfter(sorted);
    const patch = formatPatch(p, before, after);
    const kinds = [...new Set(sorted.map((x) => x.type))].join(", ");
    //unique set of actions like create_file and modify_file
    groups.push({ label: `${p} (${kinds})`, actionsIDs: ids, patch: patch });
  }
  for (const s of shells) {
    groups.push({
      label: `Shell: ${s.details.command ?? "(no command)"}`,
      actionsIDs: [s.id],
      patch: null,
    });
  }

  return groups; // returns all of the pending groups
}

export async function runApprovalFollowUp(
  tracker: ActionTracker,
): Promise<boolean> {
  const pendingActions = tracker.getAllPending();
  if (pendingActions.length === 0) {
    console.log(
      chalk.dim("\nNo staged file, folder, or shell changes to review.\n"),
    );
    return false;
  }
  const choice = await select({
    message: "Apply staged changes?",
    options: [
      { value: "all", label: "Approve and apply all" },
      { value: "select", label: "Review one by one" },
      { value: "cancel", label: "Cancel" },
    ],
  });
  if (isCancel(choice) || choice === "cancel") {
    for (const a of pendingActions)
      tracker.updateStatus(a.id, "rejected", false);
    return false;
  }
  if (choice === "all") {
    for (const a of pendingActions) {
      tracker.updateStatus(a.id, "approved", true);
    }
    return true;
  }
  // here we consider all the tasks that are pending from above
  for (const g of groupPending(pendingActions)) {
    while (true) {
      const choice = await select({
        message: chalk.bold(g.label),
        options: [
          { value: "accept", label: "Accept" },
          { value: "diff", label: "Show diff", hint: g.patch ? "" : "N/A" },
          { value: "reject", label: "Reject" },
        ],
      });

      if (isCancel(choice) || choice === "reject") {
        for (const id of g.actionsIDs) {
          tracker.updateStatus(id, "rejected", false);
        }
      }
      if (choice === "accept") {
        for (const id of g.actionsIDs) {
          tracker.updateStatus(id, "approved", true);
        }
        break;
      }
      if (choice === "diff") {
        if (g.patch != null) {
          console.log("\n" + renderMarkdownTerminal(g.patch) + "\n");
        }
        continue;
      }
    }
  }

  return tracker.getAllActions().some((a) => a.status === "approved");
}
