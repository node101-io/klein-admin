const express = require('express');

const router = express.Router();

const notificationsGetController = require('../controllers/api/notifications/get');
const projectsGetController = require('../controllers/api/projects/get');

router.get(
  '/notifications',
  notificationsGetController
);
router.get(
  '/projects',
  projectsGetController
);

module.exports = router;