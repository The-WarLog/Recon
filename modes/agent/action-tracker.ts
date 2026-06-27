import { getTypeMutation, type ActionLog, type ActionStatus } from "./types";


export class ActionTracker{
    private actions: ActionLog[]=[]

   log(
        entry: Omit<ActionLog, "id" | "timestamp"> &{
            id?:string,
            timestamp?: Date
        } 
    ): ActionLog{
        const action: ActionLog={
            id: entry.id ?? `action_${this.actions.length}`,
            timestamp:entry.timestamp ?? new Date(),
            path: entry.path,
            type:entry.type,
            details: {...entry.details},
            status: entry.status,
            userApproved: entry.userApproved,
        }
        this.actions.push(action)
        return action

    }

    getAllActions() : readonly ActionLog[] {
        return this.actions
        
    }

    getAllPending() : ActionLog[]{
        return this.actions.filter((t)=>  getTypeMutation(t.type) && t.status==='pending')
   }

   
   updateStatus(id:string ,status: ActionStatus, UserApproved?: boolean) :void{
     const search=this.actions.find((t)=> t.id===id)
     if(!search) return
     search.status=status
     if(UserApproved!==undefined) {
        search.userApproved=UserApproved
     }
   }
}