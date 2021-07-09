const mongoose =require('mongoose')

const uploadSchema = new mongoose.model({
    fileName : {type:String},
    secureURL : {type:String},
    createdAt : {type:Date}
    
})


module.exports = mongoose.model("uploads",uploadSchema)