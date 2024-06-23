const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const deleteFile = require('../../utils/deleteFile');
const Image = require('../../utils/image/Image');

const formatTranslations = require('./functions/formatTranslations');
const getProject = require('./functions/getProject');
const getProjectByLanguage = require('./functions/getProjectByLanguage');
const getProperties = require('./functions/getProperties');
const getSystemRequirements = require('./functions/getSystemRequirements');
const getURLs = require('./functions/getURLs');
const isProjectComplete = require('./functions/isProjectComplete');
const getImagePathFromUrl = require('../../utils/image/functions/getImagePathFromUrl');

const DEFAULT_DOCUMENT_COUNT_PER_QUERY = 20;
const DEFAULT_FIT_PARAMETER = 'cover';
const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;
const IMAGE_HEIGHT = 200;
const IMAGE_WIDTH = 200;
const IMAGE_NAME_PREFIX = 'klein project ';
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_DATABASE_LONG_TEXT_FIELD_LENGTH = 1e5;
const MAX_DOCUMENT_COUNT_PER_QUERY = 1e2;

const Schema = mongoose.Schema;

const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  chain_registry_identifier: { // A unique identifier for the project in the chain registry repo.
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  description: {
    type: String,
    default: null,
    trim: true,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  image: {
    type: Array,
    default: null
  },
  properties: { // Properties of the project.
    type: Object,
    default: {}
  },
  system_requirements: {
    type: Object,
    default: {}
  },
  search_name: { // Shadow search fields used for search queries. Includes translated values as well as real field, seperated by a space.
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DATABASE_LONG_TEXT_FIELD_LENGTH
  },
  search_description: { // Shadow search fields used for search queries. Includes translated values as well as real field, seperated by a space.
    type: String,
    default: null,
    trim: true,
    maxlength: MAX_DATABASE_LONG_TEXT_FIELD_LENGTH
  },
  urls: {
    type: Object,
    default: {}
  },
  translations: {
		type: Object,
		default: {}
	},
  is_completed: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
});

ProjectSchema.statics.createProject = function (data, callback) {
  const Project = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.name || typeof data.name != 'string' || !data.name.trim().length || data.name.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  if (!data.chain_registry_identifier || typeof data.chain_registry_identifier != 'string' || !data.chain_registry_identifier.trim().length || data.chain_registry_identifier.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  Project.findProjectCountByFilters({ is_deleted: false }, (err, count) => {
    if (err) return callback(err);

    const newProjectData = {
      name: data.name.trim(),
      search_name: data.name.trim(),
      chain_registry_identifier: data.chain_registry_identifier.trim(),
      properties: {
        is_active: false,
        is_incentivized: false,
        is_mainnet: false,
        is_visible: false
      }
    };

    const newProject = new Project(newProjectData);

    newProject.save((err, project) => {
      if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
        return callback('duplicated_unique_field');

      if (err) return callback('database_error');

      project.translations = formatTranslations(project, 'tr');

      Project.findByIdAndUpdate(project._id, { $set: {
        translations: project.translations
      }}, err => {
        if (err) return callback('database_error');

        Project.collection
          .createIndex(
            { search_name: 'text', search_description: 'text' },
            { weights: {
              search_name: 10,
              search_description: 1
            }}
          )
          .then(() => callback(null, project._id.toString()))
          .catch(_ => callback('index_error'));
      });
    });
  });
};

ProjectSchema.statics.findProjectById = function (id, callback) {
  const Project = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Project.findById(mongoose.Types.ObjectId(id.toString()), (err, project) => {
    if (err) return callback('database_error');
    if (!project) return callback('document_not_found');

    const is_completed = isProjectComplete(project);

    if (project.is_completed == is_completed)
      return callback(null, project);

    Project.findByIdAndUpdate(project._id, { $set: {
      is_completed
    }}, { new: true }, (err, project) => {
      if (err) return callback('database_error');

      callback(null, project);
    });
  });
};

ProjectSchema.statics.findProjectByIdAndFormat = function (id, callback) {
  const Project = this;

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    getProject(project, (err, project) => {
      if (err) return callback(err);

      callback(null, project);
    });
  });
};

ProjectSchema.statics.findProjectByIdAndFormatByLanguage = function (id, language, callback) {
  const Project = this;

  if (!language || !validator.isISO31661Alpha2(language.toString()))
    return callback('bad_request');

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    if (!project.is_completed)
      return callback('not_authenticated_request');

    getProjectByLanguage(project, language, (err, project) => {
      if (err) return callback(err);

      callback(null, project);
    });
  });
};

ProjectSchema.statics.findProjectByIdAndUpdate = function (id, data, callback) {
  const Project = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const updateData = {};

  if (data.name && typeof data.name == 'string' && data.name.trim().length && data.name.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.name = data.name.trim();

  if (data.chain_registry_identifier && typeof data.chain_registry_identifier == 'string' && data.chain_registry_identifier.trim().length && data.chain_registry_identifier.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.chain_registry_identifier = data.chain_registry_identifier.trim();

  if (data.description && typeof data.description == 'string' && data.description.trim().length && data.description.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    updateData.description = data.description.trim();

  if (data.properties && typeof data.properties == 'object')
    updateData.properties = getProperties(data.properties);

  if (data.system_requirements && typeof data.system_requirements == 'object')
    updateData.system_requirements = getSystemRequirements(data.system_requirements);

  if (data.urls && typeof data.urls == 'object')
    updateData.urls = getURLs(data.urls);

  if (!Object.keys(updateData).length)
    return callback('bad_request');

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);
    if (project.is_deleted) return callback('not_authenticated_request');

    const performUpdate = () => {
      Project.findByIdAndUpdate(project._id, { $set:
        updateData
      }, { new: true }, (err, project) => {
        if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
          return callback('duplicated_unique_field');
        if (err) return callback('database_error');

        project.translations = formatTranslations(project, 'tr', project.translations.tr);

        Project.findByIdAndUpdate(project._id, { $set: {
          translations: project.translations
        }}, { new: true }, (err, project) => {
          if (err) return callback('database_error');

          const searchName = new Set();
          const searchDescription = new Set();

          project.name.split(' ').forEach(word => searchName.add(word));
          project.translations.tr.name.split(' ').forEach(word => searchName.add(word));
          project.description.split(' ').forEach(word => searchDescription.add(word));
          project.translations.tr.description.split(' ').forEach(word => searchDescription.add(word));

          Project.findByIdAndUpdate(project._id, { $set: {
            search_name: Array.from(searchName).join(' '),
            search_description: Array.from(searchDescription).join(' ')
          }}, { new: true }, err => {
            if (err) return callback('database_error');

            Project.collection
              .createIndex(
                { search_name: 'text', search_description: 'text' },
                { weights: {
                  search_name: 10,
                  search_description: 1
                }}
              )
              .then(() => callback(null))
              .catch(_ => callback('index_error'));
          });
        });
      });
    };

    if (updateData.chain_registry_identifier != project.chain_registry_identifier) {
      const renameData = {
        name: IMAGE_NAME_PREFIX + updateData.chain_registry_identifier,
        url_list: project.image
      };

      Image.renameImages(renameData, (err, url_list) => {
        if (err) return callback(err);

        updateData.image = url_list;

        performUpdate();
      });
    } else {
      performUpdate();
    };
  });
};

ProjectSchema.statics.findProjectByIdAndUpdateImage = function (id, file, callback) {
  const Project = this;

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    if (project.is_deleted) return callback('not_authenticated_request');

    const imageData = {
      file_name: file.filename,
      name: IMAGE_NAME_PREFIX + project.chain_registry_identifier,
      fit: DEFAULT_FIT_PARAMETER,
      resize_parameters: [{
        width: IMAGE_WIDTH * 1/4,
        height: IMAGE_HEIGHT * 1/4
      }, {
        width: IMAGE_WIDTH * 1/2,
        height: IMAGE_HEIGHT * 1/2
      }, {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT
      }],
      delete_uploaded_file: true
    };

    Image.uploadImages(imageData, (err, url_list) => {
      if (err) return callback(err);

      if (!project.image.length || !Array.isArray(project.image)) {
        Project.findByIdAndUpdate(project._id, { $set: {
          image: url_list
        }}, err => {
          if (err) return callback('database_error');

          if ('delete_uploaded_file' in imageData) {
            if (!!imageData.delete_uploaded_file) {
              deleteFile(file, err => {
                if (err) return callback(err);

                return callback(null, imagesToBeKept);
              });
            } else {
              return callback(null, imagesToBeKept);
            };
          } else {
            deleteFile(file, err => {
              if (err) return callback(err);

              return callback(null, imagesToBeKept);
            });
          };
        });
      };

      const imagesToBeDeleted = [], imagesToBeKept = [];
      const existingImagePaths = [], uploadedImagePaths = [];

      for (let i = 0; i < project.image.length; i++) {
        getImagePathFromUrl(project.image[i].url, (err, imagePath) => {
          if (err) return callback(err);

          existingImagePaths.push(imagePath);
        });
      };

      for (let i = 0; i < url_list.length; i++) {
        getImagePathFromUrl(url_list[i].url, (err, imagePath) => {
          if (err) return callback(err);

          uploadedImagePaths.push(imagePath);
        });
      };

      const pathsToBeDeleted = existingImagePaths.filter(existingImagePath => !uploadedImagePaths.includes(existingImagePath));

      for (let i = 0; i < uploadedImagePaths.length; i++) {
        const imageIndex = uploadedImagePaths.indexOf(uploadedImagePaths[i]);

        imagesToBeKept.push(url_list[imageIndex]);
      };

      for (let i = 0; i < pathsToBeDeleted.length; i++) {
        const imageIndex = existingImagePaths.indexOf(pathsToBeDeleted[i]);

        imagesToBeDeleted.push(project.image[imageIndex]);
      };

      Image.deleteImages(imagesToBeDeleted, err => {
        if (err) return callback(err);

        Project.findByIdAndUpdate(project._id, { $set: {
          image: imagesToBeKept
        }}, err => {
          if (err) return callback('database_error');

          if ('delete_uploaded_file' in imageData) {
            if (!!imageData.delete_uploaded_file) {
              deleteFile(file, err => {
                if (err) return callback(err);

                return callback(null, imagesToBeKept);
              });
            } else {
              return callback(null, imagesToBeKept);
            };
          } else {
            deleteFile(file, err => {
              if (err) return callback(err);

              return callback(null, imagesToBeKept);
            });
          };
        });
      });
    });
  });
};

ProjectSchema.statics.findProjectByIdAndUpdateTranslations = function (id, data, callback) {
  const Project = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.language || !validator.isISO31661Alpha2(data.language.toString()))
    return callback('bad_request');

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    if (!project.is_completed) return callback('not_authenticated_request');

    const translations = formatTranslations(project, data.language, data);

    Project.findByIdAndUpdate(project._id, { $set: {
      translations
    }}, { new: true }, (err, project) => {
      if (err) return callback('database_error');

      const searchName = new Set();
      const searchDescription = new Set();

      project.name.split(' ').forEach(word => searchName.add(word));
      project.translations.tr.name.split(' ').forEach(word => searchName.add(word));

      project.description.split(' ').forEach(word => searchDescription.add(word));
      project.translations.tr.description.split(' ').forEach(word => searchDescription.add(word));

      Project.findByIdAndUpdate(project._id, { $set: {
        search_name: Array.from(searchName).join(' '),
        search_description: Array.from(searchDescription).join(' ')
      }}, err => {
        if (err) return callback('database_error');

        Project.collection
          .createIndex(
            { search_name: 'text', search_description: 'text' },
            { weights: {
              search_name: 10,
              search_description: 1
            }}
          )
          .then(() => callback(null))
          .catch(_ => callback('index_error'));
      });
    })
  });
};

ProjectSchema.statics.findProjectsByFilters = function (data, callback) {
  const Project = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const filters = {};

  const limit = data.limit && !isNaN(parseInt(data.limit)) && parseInt(data.limit) > 0 && parseInt(data.limit) < MAX_DOCUMENT_COUNT_PER_QUERY ? parseInt(data.limit) : DEFAULT_DOCUMENT_COUNT_PER_QUERY;
  const page = data.page && !isNaN(parseInt(data.page)) && parseInt(data.page) > 0 ? parseInt(data.page) : 0;
  const skip = page * limit;

  if ('is_deleted' in data)
    filters.is_deleted = data.is_deleted ? true : false;

  if (data.name && typeof data.name == 'string' && data.name.trim().length && data.name.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    filters.name = { $regex: data.name.trim(), $options: 'i' };

  if (data.chain_registry_identifier && typeof data.chain_registry_identifier == 'string' && data.chain_registry_identifier.trim().length && data.chain_registry_identifier.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    filters.chain_registry_identifier = { $regex: data.chain_registry_identifier.trim(), $options: 'i' };

  if (!data.search || typeof data.search != 'string' || !data.search.trim().length) {
    Project
      .find(filters)
      .sort({
        is_completed: 1
      })
      .limit(limit)
      .skip(skip)
      .then(projects => async.timesSeries(
        projects.length,
        (time, next) => Project.findProjectByIdAndFormat(projects[time]._id, (err, project) => next(err, project)),
        (err, projects) => {
          if (err) return callback(err);

          return callback(null, {
            search: null,
            limit,
            page,
            projects
          });
        })
      )
      .catch(_ => callback('database_error'));
  } else {
    filters.$text = { $search: data.search.trim() };

    Project
      .find(filters)
      .sort({
        score: { $meta: 'textScore' },
        is_completed: 1
      })
      .limit(limit)
      .skip(skip)
      .then(projects => async.timesSeries(
        projects.length,
        (time, next) => Project.findProjectByIdAndFormat(projects[time]._id, (err, project) => next(err, project)),
        (err, projects) => {
          if (err) return callback(err);

          return callback(null, {
            search: data.search.trim(),
            limit,
            page,
            projects
          });
        })
      )
      .catch(_ => callback('database_error'));
  };
};

ProjectSchema.statics.findProjectCountByFilters = function (data, callback) {
  const Project = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  const filters = {};

  if ('is_deleted' in data)
    filters.is_deleted = data.is_deleted ? true : false;

  if (data.name && typeof data.name == 'string' && data.name.trim().length && data.name.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    filters.name = { $regex: data.name.trim(), $options: 'i' };

  if (data.chain_registry_identifier && typeof data.chain_registry_identifier == 'string' && data.chain_registry_identifier.trim().length && data.chain_registry_identifier.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH)
    filters.chain_registry_identifier = { $regex: data.chain_registry_identifier.trim(), $options: 'i' };

  if (!data.search || typeof data.search != 'string' || !data.search.trim().length) {
    Project
      .countDocuments(filters)
      .then(count => callback(null, count))
      .catch(err => callback('database_error'));
  } else {
    filters.$text = { $search: data.search.trim() };

    Project
      .countDocuments(filters)
      .then(count => callback(null, count))
      .catch(err => callback('database_error'));
  };
};

ProjectSchema.statics.findProjectByIdAndDelete = function (id, callback) {
  const Project = this;

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    if (project.is_deleted) return callback(null);

    Project.findByIdAndUpdate(project._id, { $set: {
      chain_registry_identifier: project.chain_registry_identifier + project._id.toString(),
      is_deleted: true
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

ProjectSchema.statics.findProjectByIdAndRestore = function (id, callback) {
  const Project = this;

  Project.findProjectById(id, (err, project) => {
    if (err) return callback(err);

    if (!project.is_deleted) return callback(null);

    Project.findByIdAndUpdate(project._id, { $set: {
      chain_registry_identifier: project.chain_registry_identifier.replace(project._id.toString(), ''),
      is_deleted: false
    }}, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  })
};

module.exports = mongoose.model('Project', ProjectSchema);