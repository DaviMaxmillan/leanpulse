const fs = require('fs');

function repairFile(fp) {
  if (!fs.existsSync(fp)) return;
  let text = fs.readFileSync(fp, 'utf8');

  // We know exact strings we want to replace globally
  
  // 1. Fixing fetch without quotes ending in ',
  text = text.split(`await \\http://\\$\\{window.location.hostname\\}:3001/`).join(`await fetch(\`http://\${window.location.hostname}:3001/`);
  text = text.split(`\\http://\\$\\{window.location.hostname\\}:3001/`).join(`fetch(\`http://\${window.location.hostname}:3001/`);

  // Fixing the trailing single quote
  // Exam page has many fetch calls: ', {
  text = text.split(`', {`).join(`\`, {`);
  text = text.split(`');`).join(`\`);`);
  text = text.split(`'} `).join(`\`} `);
  
  // 2. Fix socket.io connection
  text = text.split(`const newSocket = fetch(\`http://\${window.location.hostname}:3001\`);`).join(`const newSocket = io(\`http://\${window.location.hostname}:3001\`);`);
  text = text.split(`const newSocket = \\http://\\$\\{window.location.hostname\\}:3001\`);`).join(`const newSocket = io(\`http://\${window.location.hostname}:3001\`);`);

  // 3. Fix ternary editing exam URL
  text = text.split(`: http://:3001/exams';`).join(`: \`http://\${window.location.hostname}:3001/exams\`;`);

  // 4. Any remaining weird \http:
  text = text.split(`\\http://\\$\\{window.location.hostname\\}:3001`).join(`\`http://\${window.location.hostname}:3001\``);
  text = text.split(`: \`http://\${window.location.hostname}:3001\`/`).join(`: \`http://\${window.location.hostname}:3001/`);

  fs.writeFileSync(fp, text);
  console.log('Fixed ' + fp);
}

repairFile('c:/LeanPulse/frontend/src/app/teacher/page.tsx');
repairFile('c:/LeanPulse/frontend/src/app/admin/page.tsx');
repairFile('c:/LeanPulse/frontend/src/app/teacher/login/page.tsx');
repairFile('c:/LeanPulse/frontend/src/app/page.tsx');
