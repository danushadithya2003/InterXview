const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User document schema
const userSchema = new mongoose.Schema({
    username: {
        type: String
    },
    email: {
        type: String
    },
    password: {
        type: String
    }
});

// Interview experience document schema
const experienceSchema = new mongoose.Schema({
    companyKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },    
    position: String,
    feedback: String,
    result: String, 
    content: String,  
    date: String,
    userKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

// Company document schema
const companySchema = new mongoose.Schema({
    companyName: String,
    logoURL: String,
    description: String
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    try {
        this.password = await bcrypt.hash(this.password, 10);
        return next();
    } catch (error) {
        return next(error);
    }
});

userSchema.methods.comparePassword = async function(plaintext, callback) {
    try {
        const match = await bcrypt.compare(plaintext, this.password);
        return callback(null, match);
    } catch (error) {
        return callback(error);
    }
};

const userModel = mongoose.model('user', userSchema);
const experienceModel = mongoose.model('experience', experienceSchema);
const companyModel = mongoose.model('company', companySchema);

module.exports = {
    userModel,
    experienceModel,
    companyModel
};
