require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const routes = require('./controllers/routes');

const app = express();
const port = process.env.PORT || 8080;
const mongoURI = process.env.MONGO_URI

mongoose.connect(mongoURI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(
  session({
    key: "user_sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 1800000
    },
  })
);

app.use('/', routes);

app.listen(port, () => {
  console.log(`App started at the port ${port}`);
});