/**
 * @file upload.js
 * @description Route Express per l'upload di immagini tramite Cloudinary.
 * Espone un singolo endpoint POST che accetta un file 'image' (jpg, jpeg, png, webp),
 * lo carica nella cartella 'peakaware' su Cloudinary e restituisce l'URL pubblico.
 * Formato risposta compatibile con il plugin EditorJS Image Tool.
 */

const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'peakaware',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage });
const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: 0, message: 'Nessun file ricevuto' });
    }
    return res.json({
      success: 1,
      file: { url: req.file.path },
    });
  } catch (err) {
    return res.status(500).json({ success: 0, message: 'Errore upload' });
  }
});

module.exports = router;
