<script>
  import { PageContainer, FormStep, Form, Field } from '../../components/UI';
</script>

<PageContainer>
  <h2>Add garden</h2>
  <FormStep name="personal-details">
    <Form>
      <Field
        name="email"
        type="email"
        label="Email"
        placeholder="Enter your email address"
        required />
      <Field name="name" type="text" label="Your name" placeholder="Enter your name" required />
      <Field
        name="street-name"
        type="text"
        label="Your street name"
        placeholder="Enter your street name"
        required />
      <Field
        name="house-number"
        type="number"
        label="Your street number"
        placeholder="Enter your house number"
        required />
      <Field
        name="postal-code"
        type="number"
        label="Your postal code"
        placeholder="Enter your postal code"
        required />
      <Field
        name="municipality"
        type="text"
        label="Your municipality"
        placeholder="Enter the name of your municipality"
        required />
      <Field
        name="description"
        type="text"
        label="Your campspace"
        placeholder="Please provide a short description of your garden and the camping spot you can
        offer"
        required />
      <Field
        name="surface-area"
        type="slider"
        label="Surface area"
        placeholder="What is the surface area of your camping space?" />
      <Field
        name="type"
        type="dropdown"
        label="Type"
        options={['01', '02', '03']}
        placeholder="What type of camping space do you offer?" />
    </Form>
  </FormStep>
  <FormStep name="facilities">
    <Form>
      <Field
        name="outside-toilet-provided"
        type="toggle"
        label="Outside toilet"
        placeholder="Do you have an outside toilet that guests can use?"
        required />
      <Field
        name="inside-toilet-provided"
        type="toggle"
        label="Inside toilet"
        placeholder="Would you allow guests to use your inside toilet?"
        required />
      <Field
        name="drinkable-water-provided"
        type="toggle"
        label="Drinkable water"
        placeholder="Can guests have access to drinking water when staying with you?"
        required />
      <Field
        name="electricity-provided"
        type="toggle"
        label="Electricity"
        placeholder="Can you offer electricity (for phones or recharge batteries of electric bikes)"
        required />
    </Form>
  </FormStep>
</PageContainer>

<style>

</style>
