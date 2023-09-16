const express = require('express');
const { userModel, experienceModel } = require("../models/Main");

const router = express.Router();

const sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect("/main");
    } else {
        next();
    }
};

var today = new Date();
var dd = today.getDate();
var mm = today.getMonth() + 1;
var yyyy = today.getFullYear();
if (dd < 10) {
    dd = '0' + dd;
}

if (mm < 10) {
    mm = '0' + mm;
}
today = mm + '-' + dd + '-' + yyyy;


// Route for home page
router.get("/", sessionChecker, (req, res) => {
    res.render("home");
});


// Routes for user sign-up
router.route("/signup")
    .get(sessionChecker, (req, res) => {
        res.render("signup");
    })
    .post(async (req, res) => {
        const { username, email, password } = req.body;

        try {
            const existingUser = await userModel.findOne({ email }).exec();
            if (existingUser) {
                return res.redirect("/signup");
            }

            const newUser = new userModel({ username, email, password });
            await newUser.save();

            res.redirect("/signin");
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });


// Routes for existing user login
router.route("/signin")
    .get(sessionChecker, (req, res) => {
        res.render("signin");
    })
    .post(async (req, res) => {
        const email = req.body.email;
        const password = req.body.password;

        try {
            const user = await userModel.findOne({ email }).exec();
            if (!user) {
                return res.redirect("/signin");
            }

            user.comparePassword(password, (error, match) => {
                if (!match) {
                    return res.render("signin");
                }

                req.session.user = user;

                res.redirect("/main");
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        }
    });


// Route for user's dashboard
router.get("/main", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const experiences = await experienceModel.find({}).exec();
            res.render("main", { experiences });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Routes for composing a new interview experience
router.route("/compose")
    .get((req, res) => {
        if (req.session.user && req.cookies.user_sid) {
            res.render("compose");
        } else {
            res.redirect("/signin");
        }
    })
    .post(async (req, res) => {
        const { postCompany, postPosition, feedBack, postBody } = req.body;

        if (!req.session.user || !req.cookies.user_sid) {
            return res.redirect("/signin");
        }

        const newExperience = new experienceModel({
            company: postCompany,
            position: postPosition,
            feedback: feedBack,
            content: postBody,
            date: today,
            user: req.session.user._id,
        });

        try {
            await newExperience.save();
            res.redirect("/main");
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });


// Route for user logout
router.get("/signout", async (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        try {
            await req.session.destroy();
            res.clearCookie("user_sid");
            res.redirect("/");
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/signin");
    }
});

module.exports = router;
