const fs = require('fs');
const path = require('path');

const classesToRemoveOrReplace = [
  { regex: /border-[24] border-black/g, replacement: 'border border-gray-200' },
  { regex: /border-b-[42] border-black/g, replacement: 'border-b border-gray-200' },
  { regex: /border-t-[42] border-black/g, replacement: 'border-t border-gray-200' },
  { regex: /border-y-[42] border-black/g, replacement: 'border-y border-gray-200' },
  { regex: /border-l-[42] border-black/g, replacement: 'border-l border-gray-200' },
  { regex: /border-r-[42] border-black/g, replacement: 'border-r border-gray-200' },
  { regex: /shadow-\[\d+px_\d+px(_0px_0px_rgba\(.*\))?\]/g, replacement: 'shadow-sm rounded-xl' },
  { regex: /\brounded-none\b/g, replacement: 'rounded-xl' },
  { regex: /\bfont-black\b/g, replacement: 'font-semibold' },
  { regex: /\buppercase\b/g, replacement: '' },
  { regex: /\btracking-widest\b/g, replacement: '' },
  { regex: /\btracking-tighter\b/g, replacement: '' },
  { regex: /tracking-\[.*?\]/g, replacement: '' },
  { regex: /\bitalic\b/g, replacement: '' },
  { regex: /bg-black text-white/g, replacement: 'bg-primary text-primary-foreground' },
  { regex: /hover:bg-black/g, replacement: 'hover:bg-primary' },
  { regex: /hover:text-white/g, replacement: 'hover:text-primary-foreground' },
  { regex: /text-\[10px\]/g, replacement: 'text-xs' },
  { regex: /text-\[9px\]/g, replacement: 'text-xs' },
  { regex: /text-\[8px\]/g, replacement: 'text-xs' },
  { regex: /border-dashed/g, replacement: 'border-solid' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const rule of classesToRemoveOrReplace) {
    newContent = newContent.replace(rule.regex, rule.replacement);
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Stripped neobrutalism safely from: ' + filePath);
  }
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        processDir(fullPath);
      }
    } else {
      if (['.tsx', '.ts', '.jsx', '.tsx'].some(ext => file.endsWith(ext))) {
         processFile(fullPath);
      }
    }
  }
}

processDir('./src/app');
processDir('./src/components');
processDir('./src/modules');
