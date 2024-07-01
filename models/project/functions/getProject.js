module.exports = (project, callback) => {
  if (!project || !project._id)
    return callback('document_not_found');

  return callback(null, {
    _id: project._id.toString(),
    name: project.name.replace(project._id.toString(), ''),
    chain_registry_identifier: project.chain_registry_identifier,
    description: project.description,
    image: project.image,
    non_generic_tx_commands: project.non_generic_tx_commands,
    properties: project.properties,
    system_requirements: project.system_requirements,
    urls: project.urls,
    translations: project.translations,
    is_completed: project.is_completed,
  });
};
