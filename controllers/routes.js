const express = require('express');
const { userModel, experienceModel, companyModel } = require("../models/Main");

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
            const companies = await companyModel.find({}).exec();
            res.render("main", { companies });
        } else {
            res.redirect("/signin")
        }
    } catch (error) {
        console.error(error)
        res.status(500).send("Internal Server Error");
    }
});


// Route for explore all interview experiences
router.get("/explore", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const experiences = await experienceModel.find({}).exec();
            res.render("explore", { experiences });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route for a company specific interview exxperience
router.get("/:companyId/experiences", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const companyId = req.params.companyId;
            const experiences = await experienceModel.find({ companyKey: companyId }).exec();
            res.render("experience", { experiences });
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
    .get(async (req, res) => {
        try {
            if (req.session.user && req.cookies.user_sid) {
                const companies = await companyModel.find({}).exec();
                res.render("compose", { companies });
            } else {
                res.redirect("/signin");
            }
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    })
    .post(async (req, res) => {
        const { postCompanyKey, postPosition, feedBack, offerStatus, postBody } = req.body;

        if (!req.session.user || !req.cookies.user_sid) {
            return res.redirect("/signin");
        }

        const selectedCompany = await companyModel.findOne({_id: postCompanyKey });

        if (!selectedCompany) {
            return res.status(400).send("Invalid company selected")
        }

        const newExperience = new experienceModel({
            companyKey: postCompanyKey,
            companyName: selectedCompany.companyName,
            position: postPosition,
            feedback: feedBack,
            result: offerStatus,
            content: postBody,
            date: today,
            userKey: req.session.user._id,
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


// Route to add new company details
router.post("/company/new", async (req, res) => {
    const { postCompany, postLogo, postDescription } = req.body
    const newCompany = new companyModel({
        companyName: postCompany,
        logoURL: postLogo,
        description: postDescription
    });

    try {
        await newCompany.save();
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to add company details...");
    }
});

module.exports = router;
