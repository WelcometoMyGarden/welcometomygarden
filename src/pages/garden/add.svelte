<script>
  import data from './formData.js';
  const { title, subtitle, fieldsets, submitAction } = data;
  import { Form, Field } from '../../components/UI';

  let garden = {};

  const handleSubmit = e => {
    console.log(e.detail);
  };
</script>

  <h1>{title}</h1>
  <h2>{subtitle}</h2>
  <hr />
  <Form {fieldsets} {submitAction} on:submit={handleSubmit} />
