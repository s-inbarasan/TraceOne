const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

const oldPatchSave = `        // Try to save to patches table
        if (project?.repositories?.[0]?.id) {
           const supabase = require('@/lib/supabase/client').createClient()
           // In a full environment we would link this to an active investigation
           // For now we just insert if possible or rely on the UI state
           supabase.from('patches').insert({
              repository_id: project.repositories[0].id,
              file_path: parsedPatch.filePath || selectedFile,
              original_content: parsedPatch.original,
              updated_content: parsedPatch.modified,
              unified_diff: "Diff preview",
              investigation_id: null // Assuming nullable or we have a dummy
           }).then(({error}: any) => {
              if(error) console.error("Patch store error:", error)
           })
        }`;

const newPatchSave = `        if (project?.repositories?.[0]?.id) {
          fetch('/api/patches', {
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
            if (!data.success) console.error("Patch store error:", data.error)
          }).catch(err => console.error("Patch store fetch error:", err))
        }`;

content = content.replace(oldPatchSave, newPatchSave);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
