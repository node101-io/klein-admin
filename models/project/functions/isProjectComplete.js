module.exports = project => {
  return project &&
    project.name &&
    project.chain_registry_identifier &&
    project.description &&
    Array.isArray(project.image) &&
    project.image.length ? true : false;
};