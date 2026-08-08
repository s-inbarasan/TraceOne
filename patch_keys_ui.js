const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/settings/keys/page.tsx', 'utf8');

code = code.replace(
  /value=\{showKey\[provider\.id\] \? "sk-••••••••••••••••••••••••••••••••••••" : "sk-\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\."\}/,
  `value={showKey[provider.id] ? keyData.encrypted_key : "sk-••••••••••••••••••••••••••••••••••••"}`
);

fs.writeFileSync('app/(dashboard)/settings/keys/page.tsx', code);
