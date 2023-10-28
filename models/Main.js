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
    },
    defaultRole: {
        type: String,
        default: "student"
    },
    resetToken: {
        type: String,
    },
    resetTokenExpiry: {
        type: Date,
    }
});

// Interview experience document schema
const experienceSchema = new mongoose.Schema({
    companyKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },    
    companyName: String,
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

// Likes document schema
const likeSchema = new mongoose.Schema({
    experienceKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Experience"
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
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
const likeModel = mongoose.model('like', likeSchema);

module.exports = {
    userModel,
    experienceModel,
    companyModel,
    likeModel
};
