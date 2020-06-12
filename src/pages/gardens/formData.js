export default {
    title: 'Add new garden',
    subtitle: 'Share your garden with other users',
    fieldsets: [
        {
            title: 'Personal details',
            name: 'personal-details',
            fields: [
                {
                    name: 'email',
                    type: 'email',
                    label: 'Email',
                    info: 'Enter your email address',
                    placeholder: 'Email',
                    minLength: 4,
                    maxLength: 150,
                    required: true
                },
                {
                    name: 'name',
                    type: 'text',
                    label: 'Your name',
                    info: 'Enter your name',
                    placeholder: 'Name',
                    minLength: 1,
                    maxLength: 150,
                    required: true
                },
                {
                    name: 'street-name',
                    type: 'text',
                    label: 'Your street name',
                    info: 'Enter your street name',
                    placeholder: 'Street name',
                    minLength: 4,
                    maxLength: 150,
                    required: true
                },
                {
                    name: 'house-number',
                    type: 'number',
                    label: 'Your street number',
                    info: 'Enter your house number',
                    placeholder: 'House number',
                    min: 1,
                    max: 1000,
                    required: true
                },
                {
                    name: 'postal-code',
                    type: 'number',
                    label: 'Your postal code',
                    info: 'Enter your postal code',
                    placeholder: 'Postal code',
                    required: true
                },
                {
                    name: 'municipality',
                    type: 'text',
                    label: 'Your municipality',
                    info: 'Enter the name of your municipality',
                    placeholder: 'Municipality',
                    pattern: "^[A-Za-zÀ-ÖØ-öø-ÿ -']+",
                    required: true
                },
                {
                    name: 'description',
                    type: 'text',
                    label: 'Your campspace',
                    info:
                        'Please provide a short description of your garden and the camping spot you can offer',
                    placeholder: 'Campsite description',
                    minLength: 80,
                    maxLength: 250,
                    required: true
                },
                {
                    name: 'surface-area',
                    type: 'slider',
                    label: 'Surface area',
                    info: 'What is the surface area of your camping space?',
                    placeholder: 'Surface area'
                },
                {
                    name: 'type',
                    type: 'dropdown',
                    label: 'Type',
                    options: ['01', '02', '03'],
                    info: 'What type of camping space do you offer?',
                    placeholder: 'Campsite type',
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
                    info: 'Do you have an outside toilet that guests can use?',
                    icon: 'toilet',
                    required: true
                },
                {
                    name: 'inside-toilet-provided',
                    type: 'toggle',
                    label: 'Inside toilet',
                    info: 'Would you allow guests to use your inside toilet?',
                    icon: 'toilet',
                    required: true
                },
                {
                    name: 'drinkable-water-provided',
                    type: 'toggle',
                    label: 'Drinkable water',
                    info: 'Can guests have access to drinking water when staying with you?',
                    icon: 'water',
                    required: true
                },
                {
                    name: 'electricity-provided',
                    type: 'toggle',
                    label: 'Electricity',
                    info:
                        'Can you offer electricity (for phones or recharge batteries of electric bikes)',
                    icon: 'electricity',
                    required: true
                }
            ]
        }
    ],
    submitAction: 'Add garden'
};