import { createTwoFilesPatch } from "diff";
import type { ActionLog } from "./types";


export function composeBeforeAfter(sorted: ActionLog[]):{
    before: string,
    after: string
}{
   const first=sorted[0]
     const last = sorted[sorted.length - 1]!
     let before: string =""
     let after: string =""
     if(first?.type=="create_file"){
        before=""
     }else{
        before= first?.details.before ?? ""
     }

     if(last?.type==="delete_file"){
        after=""
     }else{
        after= last?.details.after ?? ""
     }
    return {before,after}
}

export function formatPatch(path: string, before: string, after: string): string {
    // ✅ Fixed: Replaced hardcoded "" with before and after arguments
    return createTwoFilesPatch(path, path, before, after);
}