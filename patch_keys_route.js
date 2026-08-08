const fs = require('fs');
let code = fs.readFileSync('app/api/keys/route.ts', 'utf8');
code = code.replace(
  /\.select\('id, provider_id, updated_at'\)/,
  `.select('id, provider_id, updated_at, encrypted_key')`
);
code = code.replace(
  /updated_at: k\.updated_at,/,
  `updated_at: k.updated_at,
         encrypted_key: k.encrypted_key,`
);
fs.writeFileSync('app/api/keys/route.ts', code);
