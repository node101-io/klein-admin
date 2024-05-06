window.addEventListener('load', () => {
  const imageInput = document.querySelector('#navbar-image-input');

  document.addEventListener('click', event => {
    if (event.target.classList.contains('each-navbar-group-link') && event.target.href.includes('/project/create')) {
      event.preventDefault();

      createFormPopUp({
        title: 'Create a New Project',
        url: '/project/create',
        method: 'POST',
        description: 'You will be asked to complete project details once you create it.',
        inputs: [
          {
            name: 'name',
            placeholder: 'Name'
          },
          {
            name: 'chain_registry_identifier',
            placeholder: 'Chain Registry Identifier (must be unique)',
          }
        ],
        button: 'Create New Project',
        errors: {
          duplicated_unique_field: 'Each project must have a unique name. Please use edit & translations page to change this project\'s details.'
        }
      }, (error, res) => {
        if (error) return alert(error);
        if (!res) return;

        return window.location = '/project/edit?id=' + res.id;
      });
    };

    if (event.target.classList.contains('each-navbar-group-link') && event.target.href.includes('/notification/create')) {
      event.preventDefault();

      createFormPopUp({
        title: 'Create a New Notification',
        url: '/notification/create',
        method: 'POST',
        description: 'You will be asked to complete notification details once you create it.',
        inputs: [
          {
            name: 'title',
            placeholder: 'Title of the notification'
          }
        ],
        button: 'Create New Notification'
      }, (error, res) => {
        if (error) return alert(error);
        if (!res) return;

        return window.location = '/notification/edit?id=' + res.id;
      });
    };

    if (event.target.classList.contains('all-navbar-header-image') || event.target.classList.contains('all-navbar-header-image-icon')) {
      imageInput.click();
    };
  });
});