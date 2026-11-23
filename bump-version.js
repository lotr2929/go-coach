/* Sets VERSION in sw.js to a new value so installed copies fetch the new files. Run by deploy.bat. */
const fs = require('fs');
const path = require('path').join(__dirname, 'sw.js');
const old = fs.readFileSync(path, 'utf8');
const next = old.replace(/VERSION = '[^']*'/, "VERSION = 'gocoach-" + Date.now() + "'");
if (next === old) { console.error('VERSION line not found in sw.js'); process.exit(1); }
fs.writeFileSync(path, next);
console.log('Cache version updated.');
