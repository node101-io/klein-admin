const express = require('express');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: './models/image/uploads/' });

const isSystemAdmin = require('../middleware/isSystemAdmin');
const createNavbarData = require('../middleware/createNavbarData');

const deleteGetController = require('../controllers/project/delete/get');
const editGetController = require('../controllers/project/edit/get');
const indexGetController = require('../controllers/project/index/get');

const createPostController = require('../controllers/project/create/post');
const deletePostController = require('../controllers/project/delete/post');
const editPostController = require('../controllers/project/edit/post');
const imagePostController = require('../controllers/project/image/post');
const restorePostController = require('../controllers/project/restore/post');
const translatePostController = require('../controllers/project/translate/post');

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
  '/image',
    upload.single('file'),
    isSystemAdmin,
    createNavbarData,
    imagePostController
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
    translatePostController
);

module.exports = router;
