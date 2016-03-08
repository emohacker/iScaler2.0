/**
 * LoginController
 *
 * @description :: Server-side logic for managing logins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  authCheck:function(req,res){
    if (!req.session.authenticated) {
      return res.redirect('/login/logincheck');
    }
    res.view('homepage');
  },
  loginCheck:function(req,res){
    if (!req.session.authenticated) {
      res.view('login');
    }else{
      res.view('logindone');
    }
  },
	auth:function(req,res){
    if(req.session.authenticated){
      res.send('logged');
    }
    if(req.body && req.body.username && req.body.password ){
      User.find()
        .where({'username':req.body.username})
        .exec(function callBack(err,user){
          if(err){
            console.log(err);
            res.send("err");
          }
          if(user.length === 0){
            res.send("u_err")
          }else{
            require('bcrypt').compare(req.body.password,user[0].password,function(err, authres) {
              if(err){
                console.log(err);
                res.send("err");
              }
              if(authres){
                req.session.authenticated = true;
                req.session.username = req.body.username;
                res.send("s")
              }else{
                res.send("p_err")

              }
            });
          }
        });

    }else{
      res.send('err');
    }
  },
  logout:function(req,res){
    req.session.authenticated = false;
    res.send('logged');
  }
};

