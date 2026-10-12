if(process.env.DATABASE_URL||process.env.VERCEL)throw new Error('Perintah ini hanya untuk data SQLite lokal.');
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const source=process.argv[2],confirm=process.argv.includes('--confirm-replace');
if(!source||!confirm){console.error('Hentikan server. Jalankan: npm run restore -- <folder-backup> --confirm-replace. Data aktif akan diganti; salinan pra-pemulihan disimpan.');process.exit(1);}
const dir=path.resolve(source),target=path.resolve(process.env.DATA_DIR||'./data');
if(dir===target||dir.startsWith(target+path.sep)||target.startsWith(dir+path.sep))throw new Error('Folder backup dan data harus terpisah.');
const snapshot=new DatabaseSync(path.join(dir,'tractorpart.sqlite'),{readOnly:true});
try{if(snapshot.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup database tidak valid.');for(const a of snapshot.prepare('SELECT storage_key,size_bytes FROM media_assets').all()){if(!/^[a-f0-9-]+\.webp$/.test(a.storage_key))throw new Error('Nama file foto backup tidak valid.');if((await fs.stat(path.join(dir,'uploads',a.storage_key))).size!==a.size_bytes)throw new Error('Foto backup tidak lengkap.');}}finally{snapshot.close();}
await fs.mkdir(target,{recursive:true});
const stamp=Date.now(),staging=path.join(target,'.restore-'+stamp),previous=path.join(target,'.before-restore-'+stamp);
// Keep DATA_DIR itself intact: it may be a mounted Docker volume.
await fs.mkdir(staging);await fs.copyFile(path.join(dir,'tractorpart.sqlite'),path.join(staging,'tractorpart.sqlite'));await fs.cp(path.join(dir,'uploads'),path.join(staging,'uploads'),{recursive:true});
try{await fs.copyFile(path.join(dir,'DEMO'),path.join(staging,'DEMO'));}catch(e){if(e.code!=='ENOENT')throw e;}
const restored=new DatabaseSync(path.join(staging,'tractorpart.sqlite'));restored.exec('DELETE FROM sessions; PRAGMA wal_checkpoint(TRUNCATE);');restored.close();
await fs.mkdir(previous);const active=['tractorpart.sqlite','tractorpart.sqlite-wal','tractorpart.sqlite-shm','uploads','DEMO'],moved=[],activated=[];
try{for(const name of active)try{await fs.rename(path.join(target,name),path.join(previous,name));moved.push(name);}catch(e){if(e.code!=='ENOENT')throw e;}for(const name of ['tractorpart.sqlite','uploads','DEMO'])try{await fs.rename(path.join(staging,name),path.join(target,name));activated.push(name);}catch(e){if(e.code!=='ENOENT')throw e;}}
catch(e){for(const name of activated)await fs.rename(path.join(target,name),path.join(staging,name));for(const name of moved)await fs.rename(path.join(previous,name),path.join(target,name));throw e;}
await fs.rmdir(staging);console.log('Data dipulihkan. Sesi dicabut. Salinan sebelumnya:',previous);
