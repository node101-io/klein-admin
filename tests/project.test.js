const mongoose = require('mongoose');

const { isMongoId } = require('validator');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Project = require('../models/project/Project');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Project Model - Methods Testing', () => {
  let projectId;

  it('should create a new project with given name and chain_registry_identifier and return a valid MongoDB ObjectId', done => {
    Project.createProject({
      name: 'Test Project',
      chain_registry_identifier: 'test-chain-identifier'
    }, (err, id) => {
      expect(err).toBeNull();
      expect(isMongoId(id.toString())).toBe(true);

      projectId = id;

      done();
    });
  });

  it('should find the project with the given id', done => {
    Project.findProjectById(projectId, (err, project) => {
      expect(err).toBeNull();
      expect(project._id.toString()).toBe(projectId.toString());

      done();
    });
  });

  it('should find the project with the given id and format its response', done => {
    Project.findProjectByIdAndFormat(projectId, (err, project) => {
      expect(err).toBeNull();
      expect(project._id.toString()).toBe(projectId.toString());

      done();
    });
  });

  it('should find the project with the given id and update it with the new data', done => {
    Project.findProjectByIdAndUpdate(projectId, {
      name: 'Updated Test Project',
      chain_registry_identifier: 'updated-chain-identifier',
      description: 'This is an updated test project.',
      properties: {
        is_active: true,
        is_incentivized: false,
        is_mainnet: true,
        is_visible: false
      },
      system_requirements: {
        os: 'Windows 10',
        ram: '8 GB',
        storage: '256 GB SSD'
      },
      urls: {
        web: 'https://example.com',
        faucet: 'https://faucet.example.com'
      },
    }, (err) => {
      expect(err).toBeNull();

      Project.findProjectById(projectId, (err, project) => {
        expect(err).toBeNull();
        expect(project.name).toBe('Updated Test Project'); // Make sure the project is updated

        done();
      });
    });
  });

  it('should find the projects with the given filters', done => {
    Project.findProjectsByFilters({
      name: 'Updated Test Project'
    }, (err, projects_data) => {
      expect(err).toBeNull();
      expect(projects_data.projects[0]._id.toString()).toBe(projectId.toString());

      done();
    });
  });

  it('should find the projects count with the given filters', done => {
    Project.findProjectCountByFilters({
      name: 'Updated Test Project'
    }, (err, count) => {
      expect(err).toBeNull();
      expect(count).toBe(1);

      done();
    });
  });

  it('should find the project with the given id and delete it', done => {
    Project.findProjectByIdAndDelete(projectId, (err) => {
      expect(err).toBeNull();

      Project.findProjectById(projectId, (err, project) => {
        expect(err).toBeNull();
        expect(project.is_deleted).toBe(true); // Make sure the project is deleted

        done();
      });
    });
  });

  it('should find the project with the given id and restore it', done => {
    Project.findProjectByIdAndRestore(projectId, (err) => {
      expect(err).toBeNull();

      Project.findProjectById(projectId, (err, project) => {
        expect(err).toBeNull();
        expect(project.is_deleted).toBe(false); // Make sure the project is restored

        done();
      });
    });
  });

  // findProjectByIdAndUpdateImage, findProjectByIdAndFormatByLanguage, and findProjectByIdAndUpdateTranslations are not tested here
});
