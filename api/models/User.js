/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    username: {
      type: 'string',
      unique:true,
      required: true
    },
    cname: {
      type: 'string'
    },
    password: {
      type: 'string',
      required:true,
      columnName:'encryptedPassword'
    }
  },
  beforeCreate: function(values, next) {
    require('bcrypt').hash(values.password, 10, function(err, hash) {
      if(err) return next(err);
      values.password = hash;
      next();
    });
  }
};

