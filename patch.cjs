const fs = require('fs');
const file = "/Users/kirolos3mad/Downloads/wedding-invite-main 2/frontend-iqxo/src/components/dashboard/upload-button.tsx";
let content = fs.readFileSync(file, 'utf8');

// The file got messed up by a bad replacement. I will clean up the handleFileSelect duplicates.
// Find the start of the first handleFileSelect
const startIndex = content.indexOf('const handleFileSelect = useCallback');
const endIndex = content.indexOf('  const handleDrop = useCallback', startIndex);

const replacement = `const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      
      // Reset input value so re-selecting same file works
      e.target.value = ""
      
      if (files.length === 0) {
        if (previews.length === 0) handleClose()
        return
      }
      
      void processFiles(files)
    },
    [handleClose, previews, processFiles]
  )

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, content);
