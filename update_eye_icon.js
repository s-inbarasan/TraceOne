const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/settings/keys/page.tsx', 'utf8');

const regex = /<Input \s*type="password" \s*placeholder=\{`Enter your \$\{provider\.name\} API Key`\}\s*className="pl-9 font-mono"\s*value=\{newKeyValues\[provider\.id\] \|\| ''\}\s*onChange=\{\(e\) => setNewKeyValues\(prev => \(\{ \.\.\.prev, \[provider\.id\]: e\.target\.value \}\)\)\}\s*\/>/;

const replacement = `<Input 
                            type={showKey[provider.id] ? "text" : "password"} 
                            placeholder={\`Enter your \${provider.name} API Key\`}
                            className="pl-9 pr-9 font-mono"
                            value={newKeyValues[provider.id] || ''}
                            onChange={(e) => setNewKeyValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                          />
                          <button 
                            type="button"
                            onClick={() => toggleKey(provider.id)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          >
                            {showKey[provider.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>`;

content = content.replace(regex, replacement);
fs.writeFileSync('app/(dashboard)/settings/keys/page.tsx', content);
