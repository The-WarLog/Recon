export type ActionType= 
'create_folder' 
| 'create_file'
| 'delete_file'
| 'modify_file'
| 'code_analysis'
| 'tool_execute'
| 'read_file'
| 'list_files'
export type ActionStatus= 'pending' | 'approved' | 'rejected' | 'executed'


export interface ActionLog{
    id: string,
    timestamp: Date,
    path: string,
    type:ActionType,
    details: {
       before?: string,
       after?:string,
       toolName?: string,
       toolResult?: string,
       error?: string,
       command?: string
    },
    status: ActionStatus,
    userApproved?: boolean
}


export interface ActionConfig{
    CodeBasePath:string,
    ExcludedFiles: string[],
    maxFileSizeToRead: number,
    tools:{
        allowShellExecution: boolean,
        allowFileModifications: boolean,
        allowFileCreation: boolean,
        allowFolderCreation: boolean
    }
}

export const defaultActionConfig=(): ActionConfig=>({
    CodeBasePath:process.cwd(),
    maxFileSizeToRead:1024*1024,
    ExcludedFiles:[
          'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '*.log',
    '.env*',
    ],
    tools:{
        allowShellExecution: true,
        allowFileModifications:true,
        allowFileCreation:true,
        allowFolderCreation:true
        
    }
})

export function getTypeMutation(t: ActionType):boolean{
    return(
           t==='create_file' || t==='create_folder' 
        || t==='delete_file'|| t==='tool_execute'
        || t==='code_analysis' || t==='modify_file'
    )
}