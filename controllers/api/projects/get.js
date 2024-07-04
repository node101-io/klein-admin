const Project = require('../../../models/project/Project');

module.exports = (req, res) => {
  if (req.query.id && typeof req.query.id == 'string' && req.query.id.trim().length) {
    Project.findProjectByIdAndFormat(req.query.id, (err, project) => {
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

    const filters = {
      is_deleted: false,
      is_completed: true,
      page
    };

    if (req.query.name && typeof req.query.name == 'string' && req.query.name.trim().length)
      filters.name = req.query.name.trim();

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

        return res.json({
          success: true,
          projects: data.projects,
          count,
          limit: data.limit,
          page: data.page,
          search: data.search
        });
      });
    });
  }
};