const fs = require('fs');
const file = "/Users/kirolos3mad/Downloads/wedding-invite-main 2/frontend-iqxo/src/components/dashboard/upload-button.tsx";
let content = fs.readFileSync(file, 'utf8');

// 1. Optimize Memory using URL.createObjectURL
const processFilesRegex = /const newPreviews = await Promise\.all\([\s\S]*?\}\)/;
const processFilesReplacement = `const newPreviews = validFiles.map(file => {
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

content = content.replace(processFilesRegex, processFilesReplacement);


// 2. Fix input reset in handleFileSelect
const handleFileSelectRegex = /const files = Array\.from\(e\.target\.files \|\| \[\]\)/;
const handleFileSelectReplacement = `const files = Array.from(e.target.files || [])
      e.target.value = "" // Reset input to allow re-selecting same file`;

content = content.replace(handleFileSelectRegex, handleFileSelectReplacement);

fs.writeFileSync(file, content);
