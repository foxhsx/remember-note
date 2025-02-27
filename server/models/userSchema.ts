import genSchema from './genSchema.js'

const userSchema = genSchema({
  name: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  avatar: {
    type: String,
  },
  uid: {
    type: String,
  },
  hobby: {
    type: Array,
  },
  token: {
    type: String,
  },
})

export default userSchema
