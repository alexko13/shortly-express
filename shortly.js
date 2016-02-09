var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

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


/////// Login //////////////
app.get('/', 
function(req, res) {
  //check if user is logged in -> if(req.session.username)
  if(req.session.username) {
    res.render('index');
  } else {
  //if not redirect to /login -> else
  //req.session.test = "i am inside session";
    res.redirect('/login');
  }
  console.log('/ get', req.session);
  //res.redirect('/login');
});

app.get('/login', 
function(req, res) {
  console.log('/login get', req.session);
  res.render('login');
});

app.post('/login',
function(req, res) {
  new User({
    username : req.body.username,
    password : req.body.password
  }).fetch().then(function(user) {
    if(!user) {
      console.log('Account not found! Please sign up.', user);
      res.redirect('/login');
    } else {
      // todo: save in session
      console.log('USER', user);
      console.log('USER.at.username', user.attributes.username);
      req.session.username = user.attributes.username;
      console.log('SEssion after username addition', req.session);

      //util.createSession();
      res.redirect('/');
    }
  });
});
/////////////////////
////// Sign up///////
app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.post('/signup',
function(req, res){
  // create a user
  // store in db
  console.log(req.body);
  var user = new User({ 
    username : req.body.username,
    password : req.body.password
  });
  user.save().then(function(newUser){
    Users.add(newUser);
    // todo: save in session
    //res.status(201);
    res.redirect('/'); //change?
  });
});
/////////////////////////

app.get('/create', 
function(req, res) {
  //check if user is logged in
  //res.render('index');
  //redirect if user isnt logged in
  res.redirect('login');
});

app.get('/links', 
function(req, res) {
  // if logged in:
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  // else: 
  // res.redirect('login');
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
