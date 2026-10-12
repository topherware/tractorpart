import { createBackup } from '../lib/backup.js';import { db } from '../lib/db.js';
try{console.log('Backup terverifikasi:',await createBackup());}catch(e){console.error('Backup gagal:',e.message);process.exitCode=1;}finally{db.close();}
