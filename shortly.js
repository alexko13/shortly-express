var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

//// Session stuff //////////
//app.use(express.cookieParser('shhhh, very secret'));
app.use(session({
  secret : 'mySecret',
  // forces a session to be saved back to the session store:
  resave: false,
  saveUninitialized: false
}));


/////// Login /////////////////
app.get('/', 
  function(req, res) {
    util.isLoggedIn(req, res, function(response){
      response.render('index');
    });
  });

app.get('/login', 
  function(req, res) {
    res.render('login');
  });

app.post('/login',
  function(req, res) {
    new User({
    username : req.body.username//,
    //password : req.body.password
  }).fetch().then(function(user) {
    if(!user) {
      console.log('Username not found. Please sign up.')
      res.redirect('/login'); //to sign up
    } else {
      var hash = user.get('password');
      if(!bcrypt.compareSync(req.body.password, hash)) {
        //wrong pw
        console.log('Password not found! Forgot password?');
        // todo: popup or alert msg/div
        res.redirect('/login'); // shouldn't this be signup?
      } else {
        // user found in database
        // save username in session
        util.createSession(req, user);
        res.redirect('/');
      }
    }
  });
});
//////////////////////////////
////// Sign up/////////////////
app.get('/signup', 
  function(req, res) {
    res.render('signup');
  });

app.post('/signup',
  function(req, res){
    new User({
      username : req.body.username,
      password : req.body.password
    }).fetch().then(function(user){
      if(user){
        console.log('You are already signed up. Please log in.');
        res.redirect('/login');
      } else {
        console.log(req.body);
        var newUser = new User({ 
          username : req.body.username,
          password : req.body.password
        });

        newUser.save().then(function(newUser){
          Users.add(newUser);
        // todo: save in session
        util.createSession(req, newUser);
        res.redirect('/'); 
      });

      }
    });
  });
/////////////////////////

app.get('/create', 
  function(req, res) {
    util.isLoggedIn(req, res, function(response){
      response.render('index');
    });
  //check if user is logged in
  //res.render('index');
  //redirect if user isnt logged in
  //res.redirect('login');
});

app.get('/links', 
  function(req, res) {
  // if logged in:
  util.isLoggedIn(req, res, function(response){
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.post('/links', 
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }
// check if this link is already in the database
new Link({ url: uri }).fetch().then(function(found) {
  if (found) {
    res.send(200, found.attributes);
  } else {
    util.getUrlTitle(uri, function(err, title) {
      if (err) {
        console.log('Error reading URL heading: ', err);
        return res.send(404);
      }
// create new link
var link = new Link({
  url: uri,
  title: title,
  base_url: req.headers.origin
});

link.save().then(function(newLink) {
  Links.add(newLink);
  res.send(200, newLink);
});
});
  }
});
});

app.get('/logout',
  function(req, res) {
    req.session.destroy(function() {
      res.redirect('/');
    });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

//app.func that saves user to session
//app.func that checks if user is logged in;

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
        .where('code', '=', link.get('code'))
        .update({
          visits: link.get('visits') + 1,
        }).then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);


