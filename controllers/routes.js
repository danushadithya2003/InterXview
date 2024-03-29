const express = require('express');
const mongoose = require('mongoose');
const emailValidator = require("validator");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { userModel, experienceModel, companyModel } = require("../models/Main");
const { session } = require('passport');

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

if (mm < 10) {z
    mm = '0' + mm;
}
today = mm + '-' + dd + '-' + yyyy;


// Route for home page
router.get("/", sessionChecker, (req, res) => {
    res.render("home");
});


// Route for about page
router.get("/about",async (req, res) => {
    const user = req.session.user
    res.render("about", { user });
});


// Routes for contact us page
router.route("/contact")
    .get(async (req, res) => {
        const user = req.session.user
        res.render("contact", { user });
    })
    .post(async (req, res) => {
        const {email, feedback} = req.body;

        try {
            if (!emailValidator.isEmail(email)) {
                res.status(401).send("Invalid email");
                return;
            }

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.TRANSPORT_EMAIL,
                    pass: process.env.TRANSPORT_EMAIL_PASSWORD
                }
            });

            const mailOptions = {
                from: process.env.TRANSPORT_EMAIL,
                to: process.env.TRANSPORT_EMAIL,
                subject: "Feedback Submission",
                text: `Email: ${email}\nFeedback: ${feedback}`
            };

            await transporter.sendMail(mailOptions);

            res.status(200).send("We have received your feedback. Rest assured, our team will contact you shortly")
        } catch (err) {
            console.error(err);
            res.status(500).send(err);
        }
    });


// Routes for user sign-up
router.route("/signup")
    .get(sessionChecker, (req, res) => {
        res.render("signup");
    })
    .post(async (req, res) => {
        const { username, email, password } = req.body;

        try {
            if (!emailValidator.isEmail(email)) {
                res.status(401).send("Invalid email");
                return;
            }

            const existingUser = await userModel.findOne({ email }).exec();
            if (existingUser) {
                res.status(401).send("An account is already registered with your email");
                return;
            }

            const otp = Math.floor(100000 + Math.random() * 900000);

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.TRANSPORT_EMAIL,
                    pass: process.env.TRANSPORT_EMAIL_PASSWORD
                }
            });

            const mailOptions = {
                from: process.env.TRANSPORT_EMAIL,
                to: email,
                subject: "Interxview - OTP Authentication",
                text: `Your OTP for signup is: ${otp}`
            };

            await transporter.sendMail(mailOptions);

            req.session.otp = otp;
            req.session.signupDetails = { username, email, password };

            res.redirect("/auth")
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });


// Routes for user authentication
router.route("/auth")
    .get(async (req, res) => {
        res.render("auth")
    })
    .post(async (req, res) => {
        const { otp } = req.body;
        const savedOtp = req.session.otp;

        try {
            if (otp && parseInt(otp) == savedOtp) {
                const { username, email, password } = req.session.signupDetails;
                const newUser = new userModel({ username, email, password });

                await newUser.save();

                res.redirect("/signin");
            } else {
                res.status(401).send("The OTP entered is incorrect")
            }
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
                res.status(401).send("The email or password you entered is incorrect")
                return;
            }

            user.comparePassword(password, (error, match) => {
                if (!match) {
                    res.status(401).send("The email or password you entered is incorrect")
                    return;
                }
                
                req.session.user = user;
                if (user.defaultRole == "admin") {
                    res.redirect("/main/admin");
                } else {
                    res.redirect("/main");
                }
            });
        } catch (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        }
    });


// Routes for forgot password
router.route("/forgot-password")
    .get(async (req, res) => {
        res.render("forgot-password");
    })
    .post(async (req, res) => {
        const email = req.body.email;

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // Token expires in 1 hour

        const existingUser = await userModel.findOneAndUpdate({ email }, {
            resetToken,
            resetTokenExpiry
        });

        if (!existingUser) {
            res.status(400).send("There is no exisiting user registered with this email");
            return;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.TRANSPORT_EMAIL,
                pass: process.env.TRANSPORT_EMAIL_PASSWORD
            }
        });

        const resetLink = `${process.env.SERVER_BASE_URL}/reset-password/${resetToken}`;

        const mailOptions = {
            to: email,
            from: process.env.TRANSPORT_EMAIL,
            subject: "InterxView - Password Reset Request",
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n`
            + `Please click on the following link to reset your password:\n\n`
            + resetLink + '\n\n'
            + `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                res.status(500).send("Error sending reset link email");
            } else {
                res.status(200).send("Password reset email sent. Please check your inbox");
            }
        });
    });


// Routes for reset password
router.route("/reset-password/:token")
    .get(async (req, res) => {
        const token = req.params.token;

        res.render("reset-password", { token })
    })
    .post(async (req, res) => {
        const token = req.params.token;
        const newPassword = req.body.newPassword;

        const user = await userModel.findOne({ resetToken: token });

        if (!user) {
            return res.status(400).send("Invalid or expired reset token");
        }

        if (user.resetTokenExpiry <= new Date()) {
            return res.status(400).send("The reset token has expired");
        }

        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        await user.save();

        res.redirect("/signin");
    });


// Route for user dashboard
router.get("/main", async (req, res) => {
    const user = req.session.user;

    try {
        if (user && req.cookies.user_sid) {
            const companies = await companyModel.find({}).exec();

            res.render("main", { companies, user });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route for admin dashboard
router.get("/main/admin", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const companies = await companyModel.find({}).exec();
            res.render("admin", { companies });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route for explore all interview experiences
router.get("/explore", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const experiences = await experienceModel.find({}).sort({ date: -1 }).exec();
            const user = req.session.user

            res.render("explore", { experiences, user });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route for a company specific interview experience
router.get("/:companyId/experiences", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const companyId = req.params.companyId;
            const user = req.session.user

            const experiences = await experienceModel.find({ companyKey: companyId }).exec();
            
            res.render("experience", { experiences, user });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Route for liking/unliking experiences
router.post("/experiences/:experienceId/like", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const experienceId = req.params.experienceId;
            const userId = req.session.user._id;

            const experience = await experienceModel.findById(experienceId).exec();
            const hasLiked = experience.likedBy.includes(userId);

            if (hasLiked) {
                // Unlike the experience
                experience.likedBy.pull(userId);
            } else {
                // Like the experience
                experience.likedBy.push(userId);
            }

            await experience.save();
            
            res.status(200).json({ liked: !hasLiked });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Route for search, filter and sort functionality
router.get("/search-control", async (req, res) => {
    try {
        if (req.session.user && req.cookies.user_sid) {
            const user = req.session.user;
            const searchBy = req.query.searchBy;
            const searchTerm = req.query.searchTerm;
        
            let searchResult = [];

            if (searchBy === "role") {
                const filter = req.query.filter;
                const sort = req.query.sort;
                const companyID = req.query.companyID;

                let filterQuery = { position: { $regex: searchTerm, $options: "i" } };

                if (filter === "offered" || filter === "rejected") {
                    filterQuery.result = { $regex: filter, $options: "i" };
                }

                if (companyID) {
                    filterQuery.companyKey = companyID;
                }

                switch (sort) {
                    case "recent":
                        searchResult = await experienceModel.find(filterQuery).sort({ date: -1 }).lean();
                        break;
                    
                    case "liked":
                        searchResult = await experienceModel.find(filterQuery).lean();

                        searchResult.sort((a, b) => b.likedBy.length - a.likedBy.length);
                        break;
                        
                    case "difficulty":
                        const difficultyMap = {
                            "🙂Easy": 1,
                            "😯Intermediate": 2,
                            "😡Hard": 3
                        };
                    
                        searchResult = await experienceModel.find(filterQuery).lean();
                    
                        searchResult.sort((a, b) => difficultyMap[a.feedback] - difficultyMap[b.feedback]);
                        break;
                    default:
                        searchResult = await experienceModel.find(filterQuery).lean();
                }
            } else if (searchBy === "company") {
                searchResult = await companyModel.find({
                    companyName: { $regex: searchTerm, $options: "i" }
                }).lean();
            } else {
                return res.status(400).json({ error: "Invalid search parameter" });
            }

            res.status(200).json({ results: searchResult, userID: user._id });
        } else {
            res.redirect("/signin");
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
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

    if (!req.session.user || !req.cookies.user_sid) {
        return res.redirect("/signin");
    }

    const newCompany = new companyModel({
        companyName: postCompany,
        logoURL: postLogo,
        description: postDescription
    });

    try {
        await newCompany.save();
        res.redirect("/main/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to add company details...");
    }
});

// Route for deleting a existing company
router.post("/company/delete/:companyId", async (req, res) => {
    const companyId = req.params.companyId;

    try {
        const companyIdObj = new mongoose.Types.ObjectId(companyId);
        await companyModel.findByIdAndRemove(companyIdObj).exec();
        res.redirect("/main/admin");
    } catch (error) {
        console.log(error);
        res.status(500).send("Failed to delete company...");
    }
});

module.exports = router;
