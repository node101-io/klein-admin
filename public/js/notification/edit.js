window.addEventListener('load', () => {
  const notification = JSON.parse(document.getElementById('notification-json').value);

  if (document.getElementById('notification-search-input')) {
    document.getElementById('notification-search-input').focus();
    document.getElementById('notification-search-input').select();

    document.getElementById('notification-search-input').addEventListener('keyup', event => {
      if (event.key == 'Enter' && event.target.value?.trim()?.length) {
        window.location = `/notification?search=${event.target.value.trim()}`;
      } else if (event.key == 'Enter') {
        window.location = '/notification';
      };
    });
  };

  document.addEventListener('click', event => {
    if (event.target.id == 'update-button') {
      const error = document.getElementById('update-error');
      error.innerHTML = '';

      const title = document.getElementById('title').value;
      const message = document.getElementById('message').value;
      const publishDate = document.getElementById('publish-date').value;
      const publishTime = document.getElementById('publish-time').value;

      const publishDateTime = new Date(`${publishDate}T${publishTime}`);

      if (!title || !title.trim().length)
        return error.innerHTML = 'Please enter a title for the notification.';

      if (!message || !message.trim().length)
        return error.innerHTML = 'Please enter a message for the notification.';

      serverRequest('/notification/edit?id=' + notification._id, 'POST', {
        title,
        message,
        publish_date: publishDateTime
      }, res => {
        if (!res.success && res.error == 'duplicated_unique_field')
          return error.innerHTML = 'There is already a notification with this title.'
        if (!res.success)
          return throwError(res.error);

          return createConfirm({
            title: 'Project is Updated',
            text: 'Project is updated. Close to reload the page.',
            accept: 'Close'
          }, _ => window.location.reload());
      });
    };

    if (event.target.id == 'update-turkish-button') {
      const error = document.getElementById('update-turkish-error');
      error.innerHTML = '';

      if (!notification.is_completed)
        return error.innerHTML = 'Please complete the notification before adding a translation.';

      const title = document.getElementById('turkish-title').value;
      const message = document.getElementById('turkish-message').value;

      if (!title || !title.trim().length)
        return error.innerHTML = 'Please enter a title for the notification.';

      if (!message || !message.trim().length)
        return error.innerHTML = 'Please enter a message for the notification.';

      serverRequest('/notification/translate?id=' + notification._id, 'POST', {
        language: 'tr',
        title,
        message,
      }, res => {
        if (!res.success && res.error == 'duplicated_unique_field')
          return error.innerHTML = 'There is already a notification with this title.'
        if (!res.success)
          return throwError(res.error);

          return createConfirm({
            title: 'Translation is Updated',
            text: 'Turkish translation is updated. Close to reload the page.',
            accept: 'Close'
          }, _ => window.location.reload());
      });
    };
  });
});