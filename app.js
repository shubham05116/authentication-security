//jshint esversion:6

//  always remember the sequence of code before or after:


require('dotenv').config()

const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5  = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10 ;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy  = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();




app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//  to use session we have to mention that :
app.use(session({
  secret: 'Secret is our',
  resave: false,
  saveUninitialized: false,
}));

// to use passport and session:
app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true
});

// normal schema
// const userSchema = {
//   email: String,
//   password: String
// };


// encryption schema :
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret: String
});

//  use our passport-local- mongoose we plugin :
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// it will encrypt your particular database:
// userSchema.plugin(encrypt , {secret: process.env.SECRET, encryptedFields: ["password"] });   // always add this plugin before your model


const User = new mongoose.model("User", userSchema);


// create LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



//  this where we put this :
passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res) {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
);

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets page .
    res.redirect('/secrets');
  });

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
User.find({"secret":{$ne:null}}, function(err , foundUser){
  if(err){
    console.log(err);
  }else{
    if(foundUser){
      res.render("secrets" , {userWithSecrets:foundUser});
    }
  }
});
});


app.get("/submit",function(req , res ){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit",function(req , res ){
  const submitted = req.body.secret;

console.log(req.user.id);
  User.findById(  req.user.id , function(err ,foundUser){
    if(err){
      console.log(err);
    }else{
      foundUser.secret = submitted;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {
  //
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //       // Store hash in your password DB.

  //         const newUser = new User({
  //           email: req.body.username,
  //           // password: md5(req.body.password)  //hashing
  //           password: hash
  //         });
  //
  //
  //         newUser.save(function(err) {
  //           if (err) {
  //             console.log(err);
  //           } else {
  //             res.render("secrets");
  //           }
  //         });
  //       });

  ///////////////////////////////////now we are going to put hashing and salting using passport/////////////////////////

  User.register({
    username: req.body.username
  }, req.body.password, function(err, newUserRegister) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });


});


app.post("/login", function(req, res) {
  // const username = req.body.username;
  // const password = req.body.password;
  // // const password = md5(req.body.password);   //hashing
  //
  // User.findOne({
  //   email: username
  // }, function(err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       // Load hash from your password DB.
  // bcrypt.compare(password, foundUser.password, function(err, result) {
  //     // result == true
  //     if(result === true ){
  //       res.render("secrets");
  //
  //     }
  //
  // });
  //     }
  //   }
  // });

  ///////////////////////////////////now we are going to put hashing and salting using passport/////////////////////////


  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});





app.listen(3000, function() {
  console.log("server is started at port 3000");
});
