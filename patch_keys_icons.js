const fs = require('fs');

let code = fs.readFileSync('app/(dashboard)/settings/keys/page.tsx', 'utf8');

const regex = /<CardTitle className="text-base flex items-center gap-2">\s*\{provider\.name\}/;

const replacement = `<CardTitle className="text-base flex items-center gap-2">
                    {provider.name.toLowerCase().includes('gemini') && <div className="size-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><Bot className="size-3" /></div>}
                    {provider.name.toLowerCase().includes('openai') && <div className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Bot className="size-3" /></div>}
                    {provider.name.toLowerCase().includes('anthropic') && <div className="size-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center"><Bot className="size-3" /></div>}
                    {provider.name.toLowerCase().includes('nvidia') && <div className="size-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center"><Bot className="size-3" /></div>}
                    {provider.name.toLowerCase().includes('groq') && <div className="size-5 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Bot className="size-3" /></div>}
                    {provider.name}`;

code = code.replace(regex, replacement);

fs.writeFileSync('app/(dashboard)/settings/keys/page.tsx', code);
