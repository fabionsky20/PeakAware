const express = require('express');
const router = express.Router();
const { getLivelli, creaLivello, aggiornaLivello, eliminaLivello } = require('../controllers/livelloController');
const { proteggi, soloAdmin } = require('../middleware/auth');

router.get('/',     proteggi,            getLivelli);
router.post('/',    proteggi, soloAdmin, creaLivello);
router.put('/:id',  proteggi, soloAdmin, aggiornaLivello);
router.delete('/:id', proteggi, soloAdmin, eliminaLivello);

module.exports = router;
