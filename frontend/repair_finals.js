const fs = require('fs');
const files = [
  'c:/LeanPulse/frontend/src/app/teacher/page.tsx', 
  'c:/LeanPulse/frontend/src/app/admin/page.tsx', 
  'c:/LeanPulse/frontend/src/app/teacher/login/page.tsx', 
  'c:/LeanPulse/frontend/src/app/page.tsx'
];

files.forEach(file => {
  if(!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  
  // Undo my over-aggressive `;` and `} ` replacements:
  text = text.split('\`);').join('\');');
  text = text.split('\`} ').join('\'} ');
  
  // But now my dynamic fetch urls like `http://${window.location.hostname}:3001`); will become ');
  // So let's re-fix those specifically:
  text = text.replace(/:3001'\)/g, ':3001`)');
  text = text.replace(/:3001'\;/g, ':3001`;');
  text = text.replace(/:3001'\}/g, ':3001`}');
  
  fs.writeFileSync(file, text);
});

console.log('Fixed trailing stuff');
