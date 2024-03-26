module.exports = function (project, language, callback) {
  let translation = project.translations[language];

  if (!translation)
    translation = {
      name: project.name,
      description: project.description
    };

  return callback(null, {
    _id: project._id.toString(),
    name: translation.name,
    chain_registry_identifier: project.chain_registry_identifier,
    description: translation.description,
    image: project.image,
    properties: project.properties,
    system_requirements: project.system_requirements,
    urls: project.urls,
    is_completed: project.is_completed
  })
};