// utils/pulisciUploads.js
const fs = require('fs');
const path = require('path');
const Notizie = require('../models/Notizie');

const pulisciUploads = async () => {
  try {
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const filesSuDisco = fs.readdirSync(uploadsDir);

    // Recupera tutte le URL immagini usate nel DB
    const notizie = await Notizie.find({});
    const urlUsate = new Set();

    for (const notizia of notizie) {
      const blocks = notizia.contenuto?.blocks ?? [];
      for (const block of blocks) {
        if (block.type === 'image' && block.data?.file?.url) {
          const filename = block.data.file.url.split('/uploads/')[1];
          if (filename) urlUsate.add(filename);
        }
      }
    }

    // Elimina i file non referenziati
    for (const file of filesSuDisco) {
      if (file === '.gitkeep') continue; 
      if (!urlUsate.has(file)) {
        fs.unlinkSync(path.join(uploadsDir, file));
        console.log('🗑️ File orfano rimosso:', file);
      }
    }

    console.log('✅ Pulizia uploads completata');
  } catch (err) {
    console.error('❌ Errore pulizia uploads:', err.message);
  }
};

module.exports = pulisciUploads;