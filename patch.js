const fs = require('fs');
const file = "/Users/kirolos3mad/Downloads/wedding-invite-main 2/frontend-iqxo/src/components/dashboard/upload-button.tsx";
let content = fs.readFileSync(file, 'utf8');

const regex = /const handleFileSelect = useCallback\([\s\S]*?\[handleClose, previews, processFiles\]\n  \)/;

const replacement = `const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      
      // Reset input value so re-selecting same file works
      e.target.value = ""
      
      if (files.length === 0) {
        if (previews.length === 0) handleClose()
        devLog('Upload', 'File picker cancelled')
        return
      }
      
      void processFiles(files)
    },
    [handleClose, previews, processFiles]
  )`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
