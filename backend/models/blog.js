const mongoose = require('mongoose');

//const Schema = mongoose.Schema; or below by de structure
const {Schema} = mongoose;

const blogSchema = new Schema(
  {
    //in its constructure we will define our models
    title: { type: String, required: true },
    content: { type: String, required: true },
    photoPath: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true } //every time created/updated will be saved
);
module.exports = mongoose.model('Blog',blogSchema,'blogs');
//first argument is required when importing, 2nd is model schema, and third is name where data will be saved by this name
