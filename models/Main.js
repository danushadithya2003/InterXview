const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const passport = require("passport")
const LocalStrategy = require("passport-local")
const passportLocalMongoose = require("passport-local-mongoose")

mongoose.connect("mongodb://127.0.0.1:27017/InterXviewDB",  { useUnifiedTopology:true});

// user document schema
const userSchema = new mongoose.Schema({
    username:{
        type: String
    }, 
    email: {
        type: String
    }, 
    password: {
        type: String
    }
});

// interview experience document schema
const experienceSchema = new mongoose.Schema({
    title: {
        type: String
    },
    content: {
        type: String
    },
    feedback: {
        type: String
    },
    date: {
        type: String
    }
});

userSchema.pre("save", function(next) {
    if(!this.isModified("password")) {
        return next();
    }
    this.password = bcrypt.hashSync(this.password, 10);
    next();
});

userSchema.methods.comparePassword = function(plaintext, callback) {
    return callback(null, bcrypt.compareSync(plaintext, this.password));
};

const userModel = mongoose.model('user', userSchema);

const experienceModel = mongoose.model('experience', experienceSchema);

module.exports = {
    userModel,
    experienceModel
};
