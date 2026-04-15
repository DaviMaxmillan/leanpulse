const fs = require('fs');
const files = [
  'c:/LeanPulse/frontend/src/app/teacher/page.tsx',
  'c:/LeanPulse/frontend/src/app/admin/page.tsx',
  'c:/LeanPulse/frontend/src/app/teacher/login/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  // the previous bad replacement was: text.replace(/'http:\/\/localhost:3001/g, '\`http://${window.location.hostname}:3001');
  // So it became: `http://${window.location.hostname}:3001/exams'   (notice the single quote at the end)
  
  // We want to replace `http://${window.location.hostname}:3001/something' with `http://${window.location.hostname}:3001/something`
  // Actually, we can just replace all occurrences of `http://${window.location.hostname}:3001
  // let's just find where it starts with `http://${window.location.hostname}:3001 and ends with '
  
  text = text.replace(/`http:\/\/\$\{window\.location\.hostname\}:3001([^']*)'/g, '`http://${window.location.hostname}:3001$1`');
  
  // Also fix socket.io connect: socket("http://${window.location.hostname}:3001") wait, socket used single quotes too
  // So it became io(`http://${window.location.hostname}:3001') -> change to `)
  
  fs.writeFileSync(file, text);
  console.log('Fixed ' + file);
}
