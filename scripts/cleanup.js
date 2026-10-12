import { cleanupOrphans } from '../lib/media.js';import { db } from '../lib/db.js';
try{await cleanupOrphans();console.log('Foto orphan tercatat lebih dari 24 jam dan sesi kedaluwarsa dibersihkan.');}finally{await db.close();}
