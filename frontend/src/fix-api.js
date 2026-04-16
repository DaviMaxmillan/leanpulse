const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const files = walk('.');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  const target = 'const API = () => `${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}`;';
  
  if (c.includes(target)) {
    c = c.replace(target, '');
    
    // add import for API if missing
    if (!c.includes('import { getApiUrl as API }')) {
       let rel = path.relative(path.dirname(f), 'lib/api.ts').replace(/\\/g, '/');
       if (!rel.startsWith('.')) rel = './' + rel;
       rel = rel.replace('.ts', '');
       c = `import { getApiUrl as API } from '${rel}';\n` + c;
    }
    
    fs.writeFileSync(f, c);
    console.log('Fixed:', f);
  }
});
