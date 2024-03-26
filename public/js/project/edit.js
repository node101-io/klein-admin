window.addEventListener('load', () => {
  const project = JSON.parse(document.getElementById('project-json').value);

  if (document.getElementById('project-search-input')) {
    document.getElementById('project-search-input').focus();
    document.getElementById('project-search-input').select();

    document.getElementById('project-search-input').addEventListener('keyup', event => {
      if (event.key == 'Enter' && event.target.value?.trim()?.length) {
        window.location = `/project?search=${event.target.value.trim()}`;
      } else if (event.key == 'Enter') {
        window.location = '/project';
      }
    });
  }

  document.addEventListener('click', event => {
    if (event.target.id == 'update-button') {
      const error = document.getElementById('update-error');
      error.innerHTML = '';

      const name = document.getElementById('name').value;
      const chainRegistryIdentifier = document.getElementById('chain-registry-identifier').value;
      const description = document.getElementById('description').value;
      const properties = {};
      const systemRequirements = {};
      const URLs = {};

      const propertyInputs = document.querySelectorAll('.property-input');
      const systemRequirementInputs = document.querySelectorAll('.system-requirement-input');
      const URLInputs = document.querySelectorAll('.social-account-input');

      for (let i = 0; i < propertyInputs.length; i++)
        properties[propertyInputs[i].id]= propertyInputs[i].checked;

      for (let i = 0; i < systemRequirementInputs.length; i++)
        if (systemRequirementInputs[i].value && systemRequirementInputs[i].value.trim().length)
          systemRequirements[systemRequirementInputs[i].id]= systemRequirementInputs[i].value.trim();

      for (let i = 0; i < URLInputs.length; i++)
        if (URLInputs[i].value && URLInputs[i].value.trim().length)
          URLs[URLInputs[i].id]= URLInputs[i].value.trim();

      if (!name || !name.trim().length)
        return error.innerHTML = 'Please enter a name for the project.';

      if (!chainRegistryIdentifier || !chainRegistryIdentifier.trim().length)
        return error.innerHTML = 'Please enter a chain registry identifier for the project.';

      if (!description || !description.trim().length)
        return error.innerHTML = 'Please enter a description for the project.';

      serverRequest('/project/edit?id=' + project._id, 'POST', {
        name,
        chain_registry_identifier: chainRegistryIdentifier,
        description,
        properties,
        system_requirements: systemRequirements,
        urls: URLs
      }, res => {
        if (!res.success && res.error == 'duplicated_unique_field')
          return error.innerHTML = 'There is already a project with this name.'
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

      if (!project.is_completed)
        return error.innerHTML = 'Please complete the project before adding a translation.';

      const name = document.getElementById('turkish-name').value;
      const description = document.getElementById('turkish-description').value;

      if (!name || !name.trim().length)
        return error.innerHTML = 'Please enter a name for the project.';

      if (!description || !description.trim().length)
        return error.innerHTML = 'Please enter a description for the project.';

      serverRequest('/project/translate?id=' + project._id, 'POST', {
        language: 'tr',
        name,
        description,
      }, res => {
        if (!res.success && res.error == 'duplicated_unique_field')
          return error.innerHTML = 'There is already a project with this name.'
        if (!res.success)
          return throwError(res.error);

          return createConfirm({
            title: 'Translation is Updated',
            text: 'Turkish translation is updated. Close to reload the page.',
            accept: 'Close'
          }, _ => window.location.reload());
      });
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id == 'image') {
      const file = event.target.files[0];
      const wrapper = event.target.parentNode;

      wrapper.style.cursor = 'progress';
      wrapper.childNodes[1].innerHTML = 'Loading...';
      wrapper.childNodes[0].type = 'text';

      serverRequest('/project/image?id=' + project._id, 'FILE', {
        file
      }, res => {
        if (!res.success) return throwError(res.error);

        return createConfirm({
          title: 'Project Image is Updated',
          text: 'Project image is updated. Close to reload the page.',
          accept: 'Close'
        }, _ => window.location.reload());
      });
    }
  });
});