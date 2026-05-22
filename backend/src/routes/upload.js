const express = require('express');

const multer = require('multer');

const router = express.Router();

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, 'uploads/');
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            '-' +
            file.originalname;

        cb(null, uniqueName);

    }

});

const upload = multer({

    storage

});

router.post(
    '/',
    upload.single('image'),

    (req, res) => {

        try {

            console.log(req.file);

            if (!req.file) {

                return res.status(400).json({

                    success: 0,

                    message:
                    'Nessun file ricevuto'

                });

            }

            return res.json({

                success: 1,

                file: {

                    url:
                    `http://localhost:3000/uploads/${req.file.filename}`

                }

            });

        } catch (err) {

            console.log(err);

            return res.status(500).json({

                success: 0,

                message:
                'Errore upload'

            });

        }

    }
);

module.exports = router;