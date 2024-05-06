const express = require('express');

const router = express.Router();

const isSystemAdmin = require('../middleware/isSystemAdmin');
const createNavbarData = require('../middleware/createNavbarData');

const deleteGetController = require('../controllers/notification/delete/get');
const editGetController = require('../controllers/notification/edit/get');
const indexGetController = require('../controllers/notification/index/get');
const publishGetController = require('../controllers/notification/publish/get');

const createPostController = require('../controllers/notification/create/post');
const deletePostController = require('../controllers/notification/delete/post')
const editPostController = require('../controllers/notification/edit/post');
const publishPostController = require('../controllers/notification/publish/post');
const restorePostController = require('../controllers/notification/restore/post');
const translationPostController = require('../controllers/notification/translate/post');

router.get(
  '/',
    isSystemAdmin,
    createNavbarData,
    indexGetController
);
router.get(
  '/delete',
    isSystemAdmin,
    createNavbarData,
    deleteGetController
);
router.get(
  '/edit',
    isSystemAdmin,
    createNavbarData,
    editGetController
);
router.get(
  '/publish',
    isSystemAdmin,
    createNavbarData,
    publishGetController
);

router.post(
  '/create',
    isSystemAdmin,
    createNavbarData,
    createPostController
);
router.post(
  '/delete',
    isSystemAdmin,
    createNavbarData,
    deletePostController
);
router.post(
  '/edit',
    isSystemAdmin,
    createNavbarData,
    editPostController
);
router.post(
  '/publish',
    isSystemAdmin,
    createNavbarData,
    publishPostController
);
router.post(
  '/restore',
    isSystemAdmin,
    createNavbarData,
    restorePostController
);
router.post(
  '/translate',
    isSystemAdmin,
    createNavbarData,
    translationPostController
);

module.exports = router;