const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

const regex = /const handleSendMessage = async \(\s*e\?: React\.FormEvent\s*\) => \{[\s\S]*?setIsGenerating\(false\)\s*\}/;

const newHandleSendMessage = `const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!promptInput.trim() || isGenerating) return
    const userText = promptInput.trim()
    setPromptInput("")
    addChatMessage(projectId, "user", userText)
    setIsGenerating(true)
    
    try {
      const fileContext = filesMap[selectedFile] || ""
      const promptContext = \`Project: \${project?.name}
Selected File: \${selectedFile}
Code:
\${fileContext}

User Query: \${userText}\`

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptContext,
          model: selectedModel,
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        addChatMessage(projectId, "assistant", \`Error: \${data.error || 'Failed to communicate with AI provider.'}\`)
        setIsGenerating(false)
        return
      }

      let aiResponse = data.text || ""
      
      // Try to parse JSON block
      const jsonMatch = aiResponse.match(/\`\`\`json\\s*(\\{[\\s\\S]*?\\})\\s*\`\`\`/)
      let parsedPatch = null
      
      if (jsonMatch) {
        try {
          parsedPatch = JSON.parse(jsonMatch[1])
          aiResponse = aiResponse.replace(jsonMatch[0], "").trim() // Remove JSON block from visual response
        } catch (e) {
          console.error("Failed to parse AI patch JSON", e)
        }
      }

      if (!aiResponse) {
         aiResponse = "I have analyzed the code and prepared a patch."
      }
      
      addChatMessage(projectId, "assistant", aiResponse)

      if (parsedPatch && parsedPatch.hasFix) {
        setDiffState({
          filePath: parsedPatch.filePath || selectedFile,
          original: parsedPatch.original,
          modified: parsedPatch.modified
        })
        
        // Try to save to patches table
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
        }
      }
    } catch (err: any) {
      addChatMessage(projectId, "assistant", "An error occurred while connecting to the AI provider. " + err.message)
    } finally {
      setIsGenerating(false)
    }
  }`;

content = content.replace(regex, newHandleSendMessage);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
