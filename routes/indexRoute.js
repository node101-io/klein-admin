const express = require('express');

const router = express.Router();

const createNavbarData = require('../middleware/createNavbarData');
const isSystemAdmin = require('../middleware/isSystemAdmin');

const indexGetController = require('../controllers/index/index/get');

router.get(
  '/',
    isSystemAdmin,
    createNavbarData,
    indexGetController
);

module.exports = router;
