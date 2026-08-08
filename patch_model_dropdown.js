const fs = require('fs');

let code = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

const oldDropdown = /{configuredProviders\.some\(p => p\.name\.toLowerCase\(\) === 'anthropic'\) && \([\s\S]*?<\/select>/;

const newDropdown = `{configuredProviders.some(p => p.name.toLowerCase() === 'anthropic') && (
                        <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    )}
                    {configuredProviders.some(p => p.name.toLowerCase() === 'nvidia') && (
                        <option value="meta/llama-3.1-405b-instruct">NVIDIA Llama 3.1 405B</option>
                    )}
                    {configuredProviders.some(p => p.name.toLowerCase() === 'groq') && (
                        <option value="llama-3.1-70b-versatile">Groq Llama 3.1 70B</option>
                    )}
                  </select>`;

code = code.replace(oldDropdown, newDropdown);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', code);
