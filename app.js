const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const routes = require('./controllers/routes');

const app = express();
const port = process.env.PORT || 8080;

mongoose.connect("mongodb://127.0.0.1:27017/InterXviewDB", {
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
    secret: "somerandonstuffs",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 600000
    },
  })
);

app.use('/', routes);

app.listen(port, () => {
  console.log(`App started at the port ${port}`);
});