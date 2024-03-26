const Project = require('../../../models/project/Project');

module.exports = (req, res) => {
  const properties = {
    is_active: {
      name: 'Node',
      true: 'Active',
      false: 'Inactive'
    },
    is_incentivized: {
      name: 'Incentivized',
      true: 'Incentivized',
      false: 'Not Incentivized'
    },
    is_mainnet: {
      name: 'Network',
      true: 'Mainnet',
      false: 'Testnet'
    },
    is_visible: {
      name: 'Visibility',
      true: 'Production',
      false: 'Development'
    }
  };

  const systemRequirements = {
    cpu: 'CPU',
    ram: 'RAM',
    storage: 'Storage',
    os: 'Operating System'
  };

  const URLs = {
    web: 'Website',
    faucet: 'Faucet'
  };

  Project.findProjectByIdAndFormat(req.query.id, (err, project) => {
    if (err) return res.redirect('/error?message=' + err);

    return res.render('project/edit', {
      page: 'project/edit',
      title: project.name,
      includes: {
        external: {
          css: ['confirm', 'create', 'form', 'formPopUp', 'general', 'header', 'items', 'navbar', 'navigation', 'text'],
          js: ['ancestorWithClassName', 'createConfirm', 'createFormPopUp', 'form', 'navbarListeners', 'page', 'serverRequest']
        }
      },
      project,
      properties,
      systemRequirements,
      URLs
    });
  });
};
