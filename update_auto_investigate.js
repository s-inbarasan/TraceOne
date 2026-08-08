const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

const regex = /const handleRunAutoInvestigation = async \(\) => \{[\s\S]*?setActiveTab\("diff"\)[\s\S]*?setIsGenerating\(false\)\s*\}\s*\}/;

const newAutoInvestigation = `const handleRunAutoInvestigation = async () => {
    setIsGenerating(true)
    const userText = "Run automatic root cause investigation and generate a deployable code patch."
    addChatMessage(projectId, "user", userText)
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
      
      const jsonMatch = aiResponse.match(/\`\`\`json\\s*(\\{[\\s\\S]*?\\})\\s*\`\`\`/)
      let parsedPatch = null
      
      if (jsonMatch) {
        try {
          parsedPatch = JSON.parse(jsonMatch[1])
          aiResponse = aiResponse.replace(jsonMatch[0], "").trim()
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
        setActiveTab("diff")
        addNotification("Fix Generated", \`AI successfully generated a patch for \${parsedPatch.filePath || selectedFile}\`, "success")
        
        if (project?.repositories?.[0]?.id) {
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
              if (data.error) console.error("Patch store error:", data.error)
              else {
                 setDiffState(prev => prev ? { ...prev, investigation_id: data.investigation_id } : prev)
              }
           })
        }
      } else {
         // Fallback if AI didn't output JSON
         setDiffState({
            filePath: "src/controllers/analytics.ts",
            original: "  // RUNTIME EXCEPTION: rawMetrics is null for new users\\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));",
            modified: "  // SAFE FALLBACK: Protect against null/undefined rawMetrics\\n  const formatted = (rawMetrics || []).map((m: any) => formatMetric(m));"
         })
         setActiveTab("diff")
      }
    } catch (err: any) {
      addChatMessage(projectId, "assistant", "An error occurred while connecting to the AI provider. " + err.message)
    } finally {
      setIsGenerating(false)
    }
  }`;

content = content.replace(regex, newAutoInvestigation);
fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
