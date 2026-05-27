const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === '.firebase') return;
    
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if(file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/chancellor/Cynemora/src');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/color:\s*['"]white['"]/g, "color: 'var(--color-text-primary)'");
  
  if(content !== newContent) {
    fs.writeFileSync(file, newContent);
    count++;
    console.log('Updated color: white in', file);
  }
});
console.log('Total files modified:', count);
