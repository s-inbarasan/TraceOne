const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

const inputRegex = /<Input \s*placeholder="Ask AI to explain error, refactor function, or generate patch\.\.\."\s*value=\{promptInput\}\s*onChange=\{\(e\) => setPromptInput\(e\.target\.value\)\}\s*className="text-xs h-9 bg-secondary\/20"\s*\/>/;
content = content.replace(inputRegex, `<Input 
                      placeholder={keysLoaded && configuredProviders.length === 0 ? "Configure AI provider to start chatting" : "Ask AI to explain error, refactor function, or generate patch..."}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      className="text-xs h-9 bg-secondary/20"
                      disabled={isGenerating || (keysLoaded && configuredProviders.length === 0)}
                    />`);

const buttonRegex = /<Button type="submit" size="sm" disabled=\{isGenerating \|\| !promptInput\.trim\(\)\} className="h-9 px-3">/;
content = content.replace(buttonRegex, `<Button type="submit" size="sm" disabled={isGenerating || !promptInput.trim() || (keysLoaded && configuredProviders.length === 0)} className="h-9 px-3">`);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
