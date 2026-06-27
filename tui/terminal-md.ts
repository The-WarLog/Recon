import { marked, Marked } from "marked";
import { markedTerminal } from "marked-terminal";

let ready=false

function ensuremarked(): void{
    if(ready) return

    const w= Math.max(40, Math.min(process.stdout.columns || 80,120))
    //@ts-ignore
    marked.use(markedTerminal({width: w,reflowText: true},{}))
    ready=true  
}

export function renderMarkdownTerminal(source:string): string{
    ensuremarked()
    return marked.parse(source.trimEnd(),{async:false}) as string
}