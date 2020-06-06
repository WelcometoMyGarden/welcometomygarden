<script>
  import { FormStep, Form, Field} from '../../components/UI'
</script>

<style>
</style>

<h1>Add garden</h1>
<FormStep name="personal-details">
  <Form>
    <Field name="email" type="email" label="Email" help="Enter your email address" required/>
    <Field name="name" type="text" label="Your name" help="Enter your name" required/>
    <Field name="street-name" type="text" label="Your street name" help="Enter your street name" required/>
    <Field name="house-number" type="number" label="Your street number" help="Enter your house number" required/>
    <Field name="postal-code" type="number" label="Your postal code" help="Enter your postal code" required/>
    <Field name="municipality" type="text" label="Your municipality" help="Enter the name of your municipality" required/>
    <Field name="description" type="text" label="Your campspace" help="Please provide a short description of your garden and the camping spot you can offer" required/>
  </Form>
</FormStep>
<FormStep name="facilities">
  <Form>
    <Field name="outside-toilet-provided" type="toggle" label="Outside toilet" help="Do you have an outside toilet that guests can use?" required/>
    <Field name="inside-toilet-provided" type="toggle" label="Inside toilet" help="Would you allow guests to use your inside toilet?" required/>
    <Field name="drinkable-water-provided" type="toggle" label="Drinkable water" help="Can guests have access to drinking water when staying with you?" required/>
    <Field name="electricity-provided" type="toggle" label="Electricity" help="Can you offer electricity (for phones or recharge batteries of electric bikes)" required />
  </Form>
</FormStep>