const Project = require('../../../models/project/Project');

const TEN_SECONDS_IN_MS = 10 * 1000;

const lastRequestTime = {};
const lastRequestResponse = {};

module.exports = (req, res) => {
  if (req.query._id && typeof req.query._id == 'string' && req.query._id.trim().length) {
    Project.findProjectByIdAndFormat(req.query._id, (err, project) => {
      if (err) return res.json({
        success: false,
        error: err
      });

      return res.json({
        success: true,
        project
      });
    });
  } else {
    const page = !isNaN(req.query.page) && parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 0;

    console.log(page, lastRequestTime[page]);

    if (lastRequestTime[page] && lastRequestTime[page] > Date.now() - TEN_SECONDS_IN_MS)
      return res.json({
        success: true,
        projects: lastRequestResponse[page]
      });

    lastRequestTime[page] = Date.now();

    const filters = {
      is_deleted: false,
      is_completed: true,
      page
    };

    Project.findProjectCountByFilters(filters, (err, count) => {
      if (err) return res.json({
        success: false,
        error: err
      });

      Project.findProjectsByFilters(filters, (err, data) => {
        if (err) return res.json({
          success: false,
          error: err
        });

        lastRequestResponse[page] = {
          projects: data.projects,
          limit: data.limit,
          page: data.page,
          search: data.search
        };

        return res.json({
          success: true,
          projects: lastRequestResponse[page].projects,
          count,
          limit: lastRequestResponse[page].limit,
          page: lastRequestResponse[page].page,
          search: lastRequestResponse[page].search
        });
      });
    });
  }
};