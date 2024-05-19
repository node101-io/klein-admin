module.exports = project => {
  return project &&
    project.name &&
    project.chain_registry_identifier &&
    project.description &&
    project.image ? true : false;
};