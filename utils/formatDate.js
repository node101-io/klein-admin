module.exports = _date => {
  if (!_date || isNaN(new Date(_date)))
    return '';

  const date = new Date(_date);
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  return date.toLocaleDateString('en-US', options)
};