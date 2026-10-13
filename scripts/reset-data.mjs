import fs from 'node:fs';
if(process.argv[2]!=='--confirm'){console.error('Stop the app, preserve evidence, then run npm run reset-data -- --confirm to replace only runtime/state.json.');process.exit(1);}
fs.mkdirSync('runtime',{recursive:true});fs.copyFileSync('data/seed.json','runtime/state.json');console.log('Training data reset.');
