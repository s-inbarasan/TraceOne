const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

content = content.replace(
  /updated_content: parsedPatch\.modified/g,
  `updated_content: parsedPatch.modified,
                model: selectedModel`
);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
