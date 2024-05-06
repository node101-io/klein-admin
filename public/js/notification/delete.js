window.addEventListener('load', () => {
  if (document.getElementById('notification-search-input')) {
    document.getElementById('notification-search-input').focus();
    document.getElementById('notification-search-input').select();

    document.getElementById('notification-search-input').addEventListener('keyup', event => {
      if (event.key == 'Enter' && event.target.value?.trim()?.length) {
        window.location = `/notification/delete?search=${event.target.value.trim()}`;
      } else if (event.key == 'Enter') {
        window.location = '/notification/delete';
      };
    });
  };

  document.addEventListener('click', event => {
    if (event.target.classList.contains('restore-each-notification-button')) {
      createConfirm({
        title: 'Are you sure you want to restore this notification?',
        text: 'All restored notifications are ordered according to the alphabetical order.',
        reject: 'Cancel',
        accept: 'Restore'
      }, res => {
        if (res) {
          serverRequest('/notification/restore', 'POST', {
            id: event.target.parentNode.parentNode.id
          }, res => {
            console.log(res);
            if (!res.success) return throwError(res.error);

            return location.reload();
          });
        };
      });
    };
  });
});
