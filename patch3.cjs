const fs = require('fs');
const file = "/Users/kirolos3mad/Downloads/wedding-invite-main 2/frontend-iqxo/src/components/dashboard/upload-button.tsx";
let content = fs.readFileSync(file, 'utf8');

const target = "const files = Array.from(e.target.files || [])";
const replacement = "const files = Array.from(e.target.files || [])\n      e.target.value = '' // Reset input so re-selecting the same file works";

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
