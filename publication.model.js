const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PublicationSchema = new Schema({
    description: String,
    location: String,
    date: String,
    time: String,
    telegram_id: String,
    first_name: String,
    last_name: String,
    username: String
}, {
    versionKey: false
})

mongoose.model('publication', PublicationSchema)