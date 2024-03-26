const express = require('express');

const router = express.Router();

const loginGetController = require('../controllers/admin/login/get');
const logoutGetController = require('../controllers/admin/logout/get');

const loginPostController = require('../controllers/admin/login/post');

router.get(
  '/login',
    loginGetController
);
router.get(
  '/logout',
    logoutGetController
);

router.post(
  '/login',
    loginPostController
);

module.exports = router;
