const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

content = content.replace(/const supabase = require\('@\/lib\/supabase\/client'\)\.createClient\(\)\s*\/\/ In a full environment we would link this to an active investigation\s*\/\/ For now we just insert if possible or rely on the UI state\s*supabase\.from\('patches'\)\.insert\(\{\s*repository_id: project\.repositories\[0\]\.id,\s*file_path: parsedPatch\.filePath \|\| selectedFile,\s*original_content: parsedPatch\.original,\s*updated_content: parsedPatch\.modified,\s*unified_diff: "Diff preview",\s*investigation_id: null \/\/ Assuming nullable or we have a dummy\s*\}\)\.then\(\(\{error\}: any\) => \{\s*if\(error\) console\.error\("Patch store error:", error\)\s*\}\)/m, `fetch('/api/patches', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                project_id: project.id,
                repository_id: project.repositories[0].id,
                file_path: parsedPatch.filePath || selectedFile,
                original_content: parsedPatch.original,
                updated_content: parsedPatch.modified
             })
           }).then(res => res.json()).then(data => {
              if (data.error) console.error("Patch store error:", data.error)
              else {
                 // Store investigation id in diff state to use for PR creation later
                 setDiffState(prev => prev ? { ...prev, investigation_id: data.investigation_id } : prev)
              }
           })`);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
