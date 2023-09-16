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
    company: String,    
    position: String,
    feedback: String, 
    content: String,  
    date: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
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

module.exports = {
    userModel,
    experienceModel
};
