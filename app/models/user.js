var db = require('../config');
/// bcrypt: ///
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize : function(){
    this.on('creating', function(model, attrs, options) {
      var password = model.get('password');
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);
      model.set('password', hash);
    });
  }
});

module.exports = User;



// var Link = db.Model.extend({
//   tableName: 'urls',
//   hasTimestamps: true,
//   defaults: {
//     visits: 0
//   },
//   clicks: function() {
//     return this.hasMany(Click);
//   },
//   initialize: function(){
//     this.on('creating', function(model, attrs, options){
//       var shasum = crypto.createHash('sha1');

//       shasum.update(model.get('url'));
//       model.set('code', shasum.digest('hex').slice(0, 5));
//     });
//   }
// });

// module.exports = Link;