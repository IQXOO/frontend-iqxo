const fs = require('fs');
const file = "/Users/kirolos3mad/Downloads/wedding-invite-main 2/frontend-iqxo/src/components/dashboard/upload-button.tsx";
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /const newPreviews = await Promise\.all\([\s\S]*?\}\)/;

const replacement = `const newPreviews = validFiles.map(file => {
      return {
        name: file.name,
        type: file.type,
        size: formatSize(file.size),
        dataUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        base64: "", // Not used anymore
        mediaType: file.type,
        file: file,
      } as FilePreview
    })

    if (newPreviews.length > 0) {
      setPreviews(newPreviews)
      setState("preview")
    }`;

content = content.replace(targetRegex, replacement);

fs.writeFileSync(file, content);
