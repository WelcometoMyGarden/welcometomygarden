const { init, teardown } = require('./init')

describe('Deny all routes by default', () => {

  afterAll(async () => { 
    teardown()
  })

  test('Deny read on "users"', async () => {
    const db = await init()
    const ref = db.collection('users')
    expect(ref.get()).toDeny();
  })

  test('Deny read on "campsites"', async () => {
    const db = await init()
    const ref = db.collection('campsites')
    expect(ref.get()).toDeny()
  })
})
