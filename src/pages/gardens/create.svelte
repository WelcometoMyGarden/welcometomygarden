<script>
  import data from './formData.js';
  import { PageContainer, Form, Field } from '../../components/UI';

  let garden = {};

  const handleSubmit = e => (garden = { ...garden, [e.detail.name]: { ...e.detail.values } });
</script>

<PageContainer>
  <p>{JSON.stringify(garden)}</p>
  <h1>{data.title}</h1>
  <h2>{data.subtitle}</h2>
  <hr />
  {#each data.steps as { name, title, fields, submitAction }}
    <Form {name} {title} {fields} {submitAction} on:submit={handleSubmit} />
  {/each}
</PageContainer>
