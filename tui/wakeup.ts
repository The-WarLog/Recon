import { isCancel, select } from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import string from "figlet/fonts/babyface-lame";
import { runCliMode } from "../modes/cli";

const FONT_T = "ANSI SHADOW";
const SHADOW = chalk.hex("#5b4d9e");
const FACE = chalk.hex("#714da0").bold;

function printbanner(ascii: string) {
  const banner = ascii.replace(/\s+$/, "").split("\n"); //remove the spaces from the end
  const maxLength = Math.max(...banner.map((l) => l.length), 0); //longest single line in the entire text block
  const rowWidth = maxLength + 2;
  for (const line of banner) {
    console.log(SHADOW("  " + line).padEnd(rowWidth));
  }
  process.stdout.write(`\x1b[${banner.length}A`); // prevents cursor from writing in terminal

  for (const line of banner) {
    console.log(FACE(line.padEnd(rowWidth)));
  }
  console.log();
}

export async function RunWakeup() {
  let ascii: string;
  try {
    ascii = figlet.textSync("recon", { font: FONT_T });
  } catch (error) {
    ascii = figlet.textSync("recon", { font: "Standard" });
  }

  printbanner(ascii);
  const mode = await select({
    message: "What Mode would You like to run?",
    options: [
      { value: "cli", label: "CLI" },
      { value: "exit", label: "EXIT" },
    ],
  });

  if (isCancel(mode || mode === "exit")) {
    console.log(chalk.dim("\nBYE\n"));
    return;
  }
  if (mode === "cli") {
    await runCliMode();
  }
}
