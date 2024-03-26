module.exports = project => {
  return project &&
  project.name &&
  project.chain_registry_identifier &&
  project.image ? true : false;
};