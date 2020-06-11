<script>
  import { PageContainer, Form, Field } from '../../components/UI';

  const data = {
    title: 'Add new garden',
    subtitle: 'Share your garden with other users',
    submitAction: 'Add garden',
    steps: [
      {
        title: 'Personal details',
        name: 'personal-details',
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            placeholder: 'Enter your email address',
            minLength: 4,
            maxLength: 150,
            required: true
          },
          {
            name: 'name',
            type: 'text',
            label: 'Your name',
            placeholder: 'Enter your name',
            minLength: 1,
            maxLength: 150,
            required: true
          },
          {
            name: 'street-name',
            type: 'text',
            label: 'Your street name',
            placeholder: 'Enter your street name',
            required: true
          },
          {
            name: 'house-number',
            type: 'number',
            label: 'Your street number',
            placeholder: 'Enter your house number',
            required: true
          },
          {
            name: 'postal-code',
            type: 'number',
            label: 'Your postal code',
            placeholder: 'Enter your postal code',
            required: true
          },
          {
            name: 'municipality',
            type: 'text',
            label: 'Your municipality',
            placeholder: 'Enter the name of your municipality',
            required: true
          },
          {
            name: 'description',
            type: 'text',
            label: 'Your campspace',
            placeholder:
              'Please provide a short description of your garden and the camping spot you can offer',
            required: true
          },
          {
            name: 'surface-area',
            type: 'slider',
            label: 'Surface area',
            placeholder: 'What is the surface area of your camping space?'
          },
          {
            name: 'type',
            type: 'dropdown',
            label: 'Type',
            options: ['01', '02', '03'],
            placeholder: 'What type of camping space do you offer?',
            required: true
          }
        ]
      },
      {
        name: 'facilities',
        title: 'Facilities',
        fields: [
          {
            name: 'outside-toilet-provided',
            type: 'toggle',
            label: 'Outside toilet',
            placeholder: 'Do you have an outside toilet that guests can use?',
            icon: 'toilet',
            required: true
          },
          {
            name: 'inside-toilet-provided',
            type: 'toggle',
            label: 'Inside toilet',
            placeholder: 'Would you allow guests to use your inside toilet?',
            icon: 'toilet',
            required: true
          },
          {
            name: 'drinkable-water-provided',
            type: 'toggle',
            label: 'Drinkable water',
            placeholder: 'Can guests have access to drinking water when staying with you?',
            icon: 'water',
            required: true
          },
          {
            name: 'electricity-provided',
            type: 'toggle',
            label: 'Electricity',
            placeholder:
              'Can you offer electricity (for phones or recharge batteries of electric bikes)',
            icon: 'electricity',
            required: true
          }
        ]
      }
    ]
  };

  const handleSubmit = e => console.log(e.detail.values);
</script>

<PageContainer>
  {#each data.steps as { name, title, fields, submitAction }}
    <Form {name} {title} {fields} {submitAction} on:submit={handleSubmit} />
  {/each}
</PageContainer>
