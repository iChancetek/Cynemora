const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    // skip node_modules and .git
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === '.firebase') return;
    
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if(file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.md') || file.endsWith('.json')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/chancellor/Cynemora');
let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if(content.includes('Cynemora')) {
    // Replace case-sensitively
    const newContent = content.replace(/Cynemora/g, 'CyneMora');
    fs.writeFileSync(file, newContent);
    count++;
    console.log('Updated:', file);
  }
});
console.log('Total files modified:', count);
