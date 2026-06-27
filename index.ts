import {Command} from "commander"
import {RunWakeup} from "./tui/wakeup"

const program=new Command()

program.name("OPENCLAW")
.description("CLI TOOL")

program.command("wakeup")
.description("Choose the Pill")
.action(async ()=>{
    await RunWakeup()
})


program.parseAsync(process.argv)