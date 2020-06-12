<script>
  import data from './formData.js';
  const { title, subtitle, fieldsets, submitAction } = data;
  import { PageContainer, Form, Field } from '../../components/UI';

  let garden = {};
  let currentStep = 0;

  const handleSubmit = e => {
    console.log(e.detail);
  };
</script>

<PageContainer>
  <h1>{title}</h1>
  <h2>{subtitle}</h2>
  <hr />
  <!-- {#each steps as { name, title, fields, submitAction }} -->
  <!-- <Form {name} {title} {fields} {submitAction} on:submit={handleSubmit} /> -->
  <!-- {/each} -->
  <Form {fieldsets} {submitAction} on:submit={handleSubmit} />
</PageContainer>
