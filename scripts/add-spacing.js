const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const files = walk(path.join(process.cwd(), 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // 1. Ensure empty line before 'class' definition (excluding start of file)
  // Look for newline followed immediately by (export) class
  // We want to verify if there's already a double newline.
  // Regex: Find a newline that is NOT preceded by another newline, followed by optional whitespace, then 'class'
  
  // Strategy: Replace all 'class' headers with \n\n class, then let Prettier fix the excess if any.
  // Actually Prettier collapses multiple blank lines to one (usually).
  // So if we just ensure there are at least 2 newlines before 'class', Prettier will handle it.
  
  content = content.replace(/([^\n])\n(export\s+default\s+|export\s+)?class\s+/g, '$1\n\n$2class ');

  // 2. Ensure empty line between methods/functions
  // This is heuristics-based. We look for '}', followed by a newline, followed by a method-like signature.
  // Signature: whitespace, optional modifiers, name, parens, brace.
  
  // Pattern to find: "}\n  methodName" -> "}\n\n  methodName"
  // We want to target lines that clearly look like methods inside a class or root functions.
  
  // A closing brace, newline, then some indentation, then a word (method name) or visibility modifier.
  content = content.replace(
    /(\n\s*})\n(\s*)(current|public|private|protected|static|async|get|set|[a-zA-Z0-9_$]+)(\s*\(|:)/g,
    '$1\n\n$2$3$4'
  );
  
  // Also handle typical function definitions 'function foo'
  content = content.replace(/([^\n])\n(async\s+)?function\s+/g, '$1\n\n$2function ');

  if (content !== originalContent) {
    console.log(`Updated spacing in ${file}`);
    fs.writeFileSync(file, content, 'utf8');
  }
});
