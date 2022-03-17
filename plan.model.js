const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PlanSchema = new Schema({
    description: String,
    location: String,
    date: String,
    time: String
})

mongoose.model('plan', PlanSchema)