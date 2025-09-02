const express = require("express");
const app = express();
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require("method-override");
const homeRoutes = require("./routes/home.js");
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const donorRoutes = require("./routes/donor.js");
const agentRoutes = require("./routes/agent.js");
const path = require("path"); // Add this line
require("dotenv").config();
require("./config/dbConnection.js")();
require("./config/passport.js")(passport);



app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.use("/assets", express.static(path.join(__dirname, "assets"), {
  maxAge: '1d',
  immutable: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
	secret: "secret",
	resave: true,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(methodOverride("_method"));
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	res.locals.warning = req.flash("warning");
	next();
});



// Routes
app.use(homeRoutes);
app.use(authRoutes);
app.use(donorRoutes);
app.use(adminRoutes);
app.use(agentRoutes);

// Update error handlers
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Simplified error handling for production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).send('Internal Server Error. Please try again later.');
  }
  res.status(500).render("404page", { title: "Something went wrong" });
});

app.use((req, res) => {
  // Simplified 404 handling for production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Page not found. Please check the URL and try again.');
  }
  res.status(404).render("404page", { title: "Page not found" });
});


const port = process.env.PORT || 5000;
app.listen(port, console.log(`Server is running at http://localhost:${port}`));
