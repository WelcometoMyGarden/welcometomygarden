const types = {
  EMAIL: 'email',
  TEXT: 'text',
  NUMBER: 'number',
  TOGGLE: 'toggle'
}

const { EMAIL, TEXT, NUMBER, TOGGLE } = types

export default {
  personalDetails: {
    title: "Personal details",
    fields: [
      {
        name: '',
        type: '',
        label: '',
        help: '',
        required: true
      },
      {
        name: '',
        type: '',
        label: '',
        help: '',
        required: true
      },
      {
        name: '',
        type: '',
        label: '',
        help: '',
        required: true
      },
    ]
  },
  facilities: {
    title: "Facilities",
    fields: [
    ]
  },
  additional: {
    title: "Additional information",
    fields: [
    ]
  },
  photo: {
    title: "Photo",
    fields: [
    ]
  }
}