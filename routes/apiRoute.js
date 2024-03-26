const express = require('express');

const router = express.Router();

const projectsGetController = require('../controllers/api/projects/get');

router.get(
  '/projects',
  projectsGetController
);

module.exports = router;