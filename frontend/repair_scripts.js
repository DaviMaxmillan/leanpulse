const fs = require('fs');

const filePaths = [
  'c:/LeanPulse/frontend/src/app/teacher/page.tsx',
  'c:/LeanPulse/frontend/src/app/admin/page.tsx',
  'c:/LeanPulse/frontend/src/app/teacher/login/page.tsx'
];

for (const fp of filePaths) {
  if (!fs.existsSync(fp)) continue;
  let text = fs.readFileSync(fp, 'utf8');

  // Fix 1: The \http://\$\{window.location.hostname\}:3001/exams', { ...
  // It should be fetch(`http://${window.location.hostname}:3001/exams`, { ...
  
  // Actually, I can just replace \http://\$\{window.location.hostname\}:3001 with fetch('http://localhost:3001
  // Wait, no, I want the fix to actually WORK so they can play on LAN.
  text = text.replace(/\\http:\\\/\\\/\\\$\\\{window\.location\.hostname\\\}:3001/g, 'fetch(`http://${window.location.hostname}:3001');
  
  // Replace the trailing single quote with a backtick for fetch calls
  text = text.replace(/(fetch\(`http:\/\/\$\{window\.location\.hostname\}:3001[^']*)'/g, '$1`');

  // Fix newSocket = \http://...
  text = text.replace(/newSocket = fetch\(`http:\/\/\$\{window\.location\.hostname\}:3001`\)/g, 'newSocket = io(`http://${window.location.hostname}:3001`)');

  // Fix ternary bug: `: http://:3001/exams';` -> `: 'http://localhost:3001/exams';`
  text = text.replace(/: http:\/\/:(3001[^']*)';/g, ': `http://${window.location.hostname}:$1`;');

  // In login page, there might be: await fetch(`http://${window.location.hostname}:3001/auth/teacher`, {
  
  // Write back
  fs.writeFileSync(fp, text);
  console.log('Repaired ' + fp);
}
