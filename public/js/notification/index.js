window.addEventListener('load', () => {
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
    if (event.target.classList.contains('delete-each-notification-button')) {
      createConfirm({
        title: 'Are you sure you want to delete this notification?',
        text: 'You can restore the notification whenever you like from the \`Deleted Notifications\` page.',
        reject: 'Cancel',
        accept: 'Delete'
      }, res => {
        if (res) {
          serverRequest('/notification/delete', 'POST', {
            id: event.target.parentNode.parentNode.id
          }, res => {
            if (!res.success) return throwError(res.error);

            return location.reload();
          });
        };
      });
    };

    if (event.target.classList.contains('publish-each-notification-button')) {
      createConfirm({
        title: 'Are you sure you want to publish this notification?',
        text: 'This notification will be visible to all users and cannot be unpublished.',
        reject: 'Cancel',
        accept: 'Publish'
      }, res => {
        if (res) {
          serverRequest('/notification/publish', 'POST', {
            id: event.target.parentNode.parentNode.id
          }, res => {
            if (!res.success) return throwError(res.error);

            return location.reload();
          });
        };
      });
    };
  });
});