export default {
    title: 'Add new garden',
    subtitle: 'Share your garden with other users',
    fieldsets: [
        {
            title: 'Personal details',
            name: 'personal-details',
            fields: [
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
                    name: 'city',
                    type: 'text',
                    label: 'Your city',
                    info: 'Enter the name of your city',
                    placeholder: 'City',
                    pattern: "^[A-Za-zÀ-ÖØ-öø-ÿ -']+",
                    required: true
                },
                {
                    name: 'description',
                    type: 'text',
                    label: 'Describe your campspace',
                    info:
                        'Please provide a short description of your garden and the camping spot you can offer',
                    placeholder: 'Campsite description',
                    minLength: 80,
                    maxLength: 250,
                    required: true
                }
            ]
        },
        {
            name: 'facilities',
            title: 'Facilities',
            fields: [
                {
                    name: 'drinkable-water-provided',
                    type: 'toggle',
                    label: 'Drinkable water',
                    info: 'Can guests have access to drinking water when staying with you?',
                    icon: 'water'
                },
                {
                    name: 'toilet',
                    type: 'toggle',
                    label: 'Toilet',
                    info: 'Do you have a toilet that guests can use?',
                    icon: 'toilet'
                },
                {
                    name: 'electricity-provided',
                    type: 'toggle',
                    label: 'Electricity',
                    info:
                        'Can you offer electricity (for phones or recharge batteries of electric bikes)',
                    icon: 'electricity'
                },
                {
                    name: 'tent',
                    type: 'toggle',
                    label: 'Tent',
                    info: 'Do you have a tent that guests can use?',
                },
                {
                    name: 'amount-of-tents',
                    type: 'slider',
                    label: 'Amount of tents',
                    info: 'For how many tents do you provide space?',
                    placeholder: 'Surface area'
                }
            ]
        }
    ],
    submitAction: 'Add garden'
};