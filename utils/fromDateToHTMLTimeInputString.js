module.exports = _date => {
  if (!_date || isNaN(new Date(_date)))
    return '';

  const date = new Date(_date);

  return `${
    (date.getHours() < 10) ?
    '0' + date.getHours() :
    date.getHours()
  }:${
    (date.getMinutes() < 10) ?
    '0' + date.getMinutes() :
    date.getMinutes()
  }`
};