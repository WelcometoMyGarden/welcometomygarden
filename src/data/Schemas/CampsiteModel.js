import { Model, schema, field } from 'firestore-schema-validator'

const addressSchema = schema({
  boxNumber: field('boxNumber')
    .string()
    .trim(),
  city: field('city')
    .string()
    .trim(),
  country: field('country')
    .string()
    .trim(),
  houseNumber: field('houseNumber')
    .string()
    .trim(),
  postalCode: field('postalCode')
    .string()
    .trim()
})

const facilitiesSchema = schema({
  amountOfTents: field('amountOfTents')
    .number(),
  drinkableWater: field('drinkableWater')
    .boolean(),
  electricity: field('electricity')
    .boolean(),
  tent: field('tent')
    .boolean(),
  toilet: field('toilet')
    .boolean()
})

const photoSchema = schema({
  name: field('name')
    .string(),
  url: field('url')
    .string(),
  default: field('default')
    .boolean()
})


const campsiteSchema = schema({
  facilities: field('facilities')
    .objectOf(facilitiesSchema),
  address: field('address').objectOf(addressSchema),
  location: field('location'),
  photos: field('photos').arrayOf(photoSchema),
  contactEmail: field('contactEmail')
    .string()
    .email(),
  contactPhoneNumber: field('contactPhoneNumber')
    .string()
    .trim(),
  contactMethodes: field('contactMethodes')
    .oneOf([
      'email',
      'sms',
      'phone'
    ]),
  contactLanguages: field('contactLanguages')
    .array(),
  description: field('description')
    .string()
    .trim(),
  directions: field('directions')
    .string()
    .trim(),
  owner: field('owner')
  .string()
  .trim()
})

class UserModel extends Model {
  // Path to Cloud Firestore collection.
  static get _collectionPath() {
    return 'campsite'
  }

  // Model Schema.
  static get _schema() {
    return campsiteSchema
  }
}

export default UserModel;