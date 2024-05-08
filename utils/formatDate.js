const fromDateToHTMLTimeInputString = require('./fromDateToHTMLTimeInputString');

const months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'
];

const getSuffix = day => {
  if (day > 3 && day < 21) {
    return 'th';
  } else if (day % 10 === 1) {
    return 'st';
  } else if (day % 10 === 2) {
    return 'nd';
  } else if (day % 10 === 3) {
    return 'rd';
  } else {
    return 'th';
  };
};

module.exports = _date => {
  if (!_date || isNaN(new Date(_date)))
    return '';

  const date = new Date(_date);

  return `On ${
    months[date.getMonth()]
  } ${
    date.getDate()
  }${
    getSuffix(date.getDate())
  }, ${
    date.getFullYear()
  }, at ${
    fromDateToHTMLTimeInputString(date)
  }`;
};