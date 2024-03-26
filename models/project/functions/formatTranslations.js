const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

module.exports = (project, language, data) => {
  if (!data)
    data = {};

  const translations = JSON.parse(JSON.stringify(project.translations));

  translations[language.toString().trim()] = {
    name: data.name && typeof data.name == 'string' && data.name.trim().length && data.name.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH ? data.name.trim() : project.name,
    description: data.description && typeof data.description == 'string' && data.description.trim().length && data.description.trim().length < MAX_DATABASE_TEXT_FIELD_LENGTH ? data.description.trim() : project.description,
  };

  return translations;
};