/**
 * PendanterController
 *
 * @description :: Server-side logic for managing pendanters
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var fs = require('fs')
  , util = require('util')
  , gm = require('gm'),
  _ = require('underscore'),
  async = require('async');

var execFile = require('child_process').execFile;
var pngquant = require('pngquant-bin').path;
var rimraf = require('rimraf');//删除非空目录
//压缩与解压功能
var AdmZip = require('adm-zip');

var cache = (function(){
  var cache = {};
  return {
    set:function(k,v){
      cache[k] = v;
    },
    get:function(v){
      return cache[v];
    }
  }
}());

var appPath = sails.config.appPath+'/assets/dist';

var IScaler = {
  basePath:appPath + "/uploads/"
  , configPath:appPath +"/config/"
  , copyfile : function(src,dist,next){
    var readable = fs.createReadStream( src );
    var writable = fs.createWriteStream( dist );  
    readable.pipe( writable );
    readable.on('end', function() {
      if(next)next();
    });
  }
  , configDataToMongo:function(){
    //原有json文件 数据导入 Mongo
    // var p = appPath + "/config/projects.json";
    // var oldData = eval('('+fs.readFileSync(p)+')');
    // _.each(oldData,function(val,key){
    //   var dater = new Date(parseInt(val.dirname.replace("p","")));
    //   val.datetime = dater.getFullYear()+'-'+(1+dater.getMonth())+'-'+dater.getDate();
    //   Pendanter.create(val).exec(function createCB(err, created){
    //     console.log(err);
    //     console.log(created);
    //   });
    // });
  }
  , deleteFolder : function( path ) {
    var _self = this;
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) {  
          _self.deleteFolder(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }
  , getProjectConfig : function(){
    var p = appPath + "/config/projects.json";
    return eval('('+fs.readFileSync(p)+')');
  }
  , setProjectConfig : function(arr){
    var p = appPath + "/config/projects.json";
    fs.writeFileSync(p, util.format('%j', arr));
  }
  , getSizeConfig:function(){
    var p = appPath + "/config/sizeconfig.json";
    return eval('('+fs.readFileSync(p)+')');
  }
  , setSizeConfig : function(arr){
    var p = appPath + "/config/sizeconfig.json";
    fs.writeFileSync(p, util.format('%j', arr));
  }
  , newProject : function( projectName ){
    var _self = this;
    var pendanter = {};
    var dater = new Date();
    pendanter.pname = projectName;
    pendanter.datetime = dater.getFullYear()+'-'+(1+dater.getMonth())+'-'+dater.getDate();
    pendanter.dirname = "p"+ dater.getTime();
    pendanter.opt = 100;
    var dir = this.basePath + pendanter.dirname;
    _self.generateDir(dir);
    _.each([
      55,50,60,70,80,90,100,'original','final',
      'zip','zip/original','zip/optmiezd','zip/merge','zip/optmiezd/aio_file/'],function(v){
      var subdir = dir +'/'+v;
      _self.generateDir(subdir);
    });
    return pendanter;
  }
  //生成尺寸图片
  , creatImgBySize : function(size,callback){
    var distDir = appPath+'/uploads/'+size.dirname+'/';
    var filepath = distDir+'o.png';
    var targetFile = distDir+'original/'+size.add_name;
    if( size.add_x == 0 && size.add_y==0 ){ //仅缩放
      gm(filepath).thumb(
        size.add_width,
        size.add_height,
        targetFile,100, function (err) {
          if (err){
            console.log("gm thumb err from:"+filepath);
            console.log("to:"+targetFile);
            console.log(err);
          }
        
          IScaler._optmiezdImg(size.add_name,size.dirname,callback);
        // callback();
      });
    }else{
      gm(filepath).size(function(err, value){
        var retio = value.width/value.height,
          baseHeight = size.add_width/retio;
        gm(filepath).thumb(
          size.add_width,
          baseHeight,
          targetFile,100, function (err) {
            if (err){
              console.log("gm thumb err from:"+filepath);
              console.log("t0:"+targetFile);
              console.log(err);
            }else{
              gm(targetFile).size(function(err, value){
              this.options({imageMagick: true})
                .crop(value.width,size.add_height,size.add_x,size.add_y)
                .write(targetFile, function (err) {
                    if (err) {
                      console.log('crop error:');
                      console.log(err);
                    }
                    IScaler._optmiezdImg(size.add_name,size.dirname,callback);
                  // callback();
                }); 
            });
            }
        }); 
      });
    }
  }
  //生成序列串
  , mergeImgs:function(dirname,callback){
    var distDir = appPath+'/uploads/'+dirname+'/zip/';
    var sourceDir = distDir+'original/';
    var targetDir = distDir+'merge/';
    var optDir = distDir+'optmiezd/';
    var files = fs.readdirSync(sourceDir);
    var filesCount = 0;
    var appender = [];
    for(var i=0,len=files.length;i<len;i++){
      if(files[i].indexOf(".png")){
        var t = files[i].split(".");
        if(!t[0].isNaN && t[1]=='png'){
          filesCount++;
        }
      }
    }
    //优化 250x295的图片序列
    async.times( filesCount ,function(n,next){
      var n = n+1;
      var sourceFile = sourceDir+n+'.png';
      // 
      execFile(pngquant, ['--quality=50-50', sourceFile], function (err) {
          if (err) {
              console.log("png8a error:");
              console.log(err);
          }
          var tempFile = sourceFile.replace(".png","-fs8.png");
          var optedFile = optDir+'aio_file/'+n+'.png';
          IScaler.copyfile(tempFile,optedFile,next);
      });
    },function(){
      //合并前缩放成 188x222 的尺寸
      async.times( filesCount ,function(n,next){
        var n = n+1;
        var sourceFile = sourceDir+n+'.png';
        //删除上一步产生的多余 -fs8.png文件
        fs.unlinkSync(sourceDir+n+'-fs8.png');
        gm(sourceFile).thumb(
          188,222,
          // 440 ,516,
          targetDir+n+'.png',100, function (err) {
            if (err){
              console.log(err);
            }
            next();
        });
      },function(){
        for(var i=2;i<=filesCount;i++){
          appender.push(targetDir+i+'.png');
        }
        gm(targetDir+'1.png')
        .append(appender,true)
        .write(targetDir+"preview_new-188x222.png", function (err) {
          if (err) {
            console.log('append error:');
            console.log(err);
          }
          execFile(pngquant, ['--quality=50-50', targetDir+"preview_new-188x222.png"], function (err) {
              if (err) {
                console.log("png8a error:");
                console.log(err);
              }
              var tempFile = targetDir + "preview_new-188x222-fs8.png"
              var optedFile = optDir + "preview_new-188x222.png"
              IScaler.copyfile(tempFile,optedFile,function(){
                fs.unlinkSync(tempFile);
                callback();
              });
          });
        }); 
      });
    });
  }
  //创建目录
  , generateDir : function(dir){
    if(fs.existsSync(dir)){
      rimraf.sync(dir);
    }
    fs.mkdirSync(dir);
  }
  //生成50-100质量的png8a优化图
  , _optmiezdImg : function(sizeName ,dirname ,parentCallback){
    var _self = this;
    var distDir = appPath+'/uploads/'+dirname+'/';
    async.eachSeries([55,50,60,70,80,90,100], function(maxQuality, callback) {
      _self.copyfile(distDir+'original/'+sizeName,distDir+maxQuality+'/'+sizeName,function(){
        var targetFile = distDir+maxQuality+'/'+sizeName;
        execFile(pngquant, ['--quality=50-'+maxQuality, targetFile], function (err) {
          if (err) {
              console.log("png8a error:by opt "+maxQuality);
              console.log(err);
          }
          var tempFile = distDir+maxQuality+'/'+sizeName.replace(".png","-fs8.png");
          if(fs.existsSync(tempFile)){
            fs.unlinkSync(targetFile);
            fs.renameSync(tempFile,targetFile);
          }
          callback();
        });
      });
    },function(){
      parentCallback();
    }); 
  }
  , zipProject :function( project ){
    
  }
}


module.exports = {
  configDataToMongo:function(){
    res.send("err")
    // IScaler.configDataToMongo();
  },
	homeInit:function(req,res){
    var configFile = IScaler.getSizeConfig();
    Pendanter.count().then(function(pendanterCount){
      var pageCount = parseInt(pendanterCount/15)+1;
      var currentPage = req && req.param('page') ? req.param('page') : 1;
      currentPage = isNaN(currentPage)?1:currentPage;
      Pendanter.find({sort: 'createdAt DESC'}).paginate({page: currentPage, limit: 15}).then(function(pendanters){
        res.render('homepage',{
          size:configFile.size,
          projects:pendanters,
          username:req.session.username,
          currentProject:'home',
          page:{
            count:pageCount,
            currentPage:currentPage
          }
        });
      });
    });
  },
  //获得序列帧个数
  getFpsCount:function(req,res){
    var dirname = req.body.dirname;
    var orgZipPathDir = IScaler.basePath+dirname+'/zip/original/';
    var files = fs.readdirSync(orgZipPathDir);
    var filesCount = 0;
    res.send({'fpscount':files.length});
  },
  newproject:function(req,res){
    var pname = req.body.pname;
    if(pname){
      var pendanter = IScaler.newProject(pname);
      var dirname =  pendanter.dirname;
      var orgImgPath = IScaler.basePath+dirname+'/o.png';
      var orgZipPath = IScaler.basePath+dirname+'/zip/optmiezd/aio_file/1.png';
      var resSender = {};
      resSender.pname = pname;
      resSender.dirname= dirname;
      resSender.hasimg = false;
      resSender.haszip = false;
      resSender.opt = 100;
      if(fs.existsSync(orgImgPath)){
        resSender.hasimg = true;
      }
      if(fs.existsSync(orgZipPath)){
        resSender.haszip = true;
      }
      Pendanter.create(pendanter).exec(function createCB(err, created){
        if(err){
          console.log(err);
          res.send('err');
        }
        res.send(resSender);
      });
    }
  },
  editproject:function(req,res){
    var dirname = req.body.dirname;
    if(dirname){
      Pendanter.find({where:{'dirname':dirname}}).then(function(pendanter){
        if(pendanter && pendanter.length>=1){
          var pendanter = pendanter[0];
          var orgImgPath = IScaler.basePath+dirname+'/o.png';
          var orgZipPath = IScaler.basePath+dirname+'/zip/optmiezd/aio_file/1.png';
          var resSender = {};
          resSender.pname = pendanter.pname;
          resSender.dirname= dirname;
          resSender.opt = pendanter.opt;
          resSender.hasimg = false;
          resSender.haszip = false;
          if(fs.existsSync(orgImgPath)){
            resSender.hasimg = true;
          }
          if(fs.existsSync(orgZipPath)){
            resSender.haszip = true;
          }
          res.send(resSender);
        }else{
          res.send('err');
        }
      });
    }
  },
  deleteproject:function(req, res){
    if(req && req.body && req.body.dirname){
      var dirname = req.body.dirname;
      var dir = IScaler.basePath+dirname;
      if(dirname){
        Pendanter.destroy({dirname:dirname}).exec(function deleteCB(err){
          if(err){
            console.log(err);
            res.send('err');
            return
          }
          IScaler.deleteFolder(dir);
          res.send('done');
        });
      }
    }else{
      res.send('err');
    }
  },
  //上传 
  fileupload:function(req, res){
    if (req.method === 'POST') {           
        req.file('file').upload(function (err, files) {
          if(err){
            console.log(err);
            res.send("err");
            return;
          }
          var dirname = req.body.dirname;
          var dir = IScaler.basePath + dirname;
          if(files[0].type == 'image/png'){
            fs.readFile(files[0].fd, function (err, data) {
              var newPath = dir + "/o.png";
              fs.writeFile(newPath, data, function (err) {
                var sizeConfig = IScaler.getSizeConfig();
                sizeConfig.size = _.each(sizeConfig.size,function(v){
                  v.dirname = dirname;
                  return v;
                });
                async.eachSeries(sizeConfig.size,IScaler.creatImgBySize,function(){
                  res.send("pngdone");
                });
              });
            });
          //step2 上传压缩包序列
          }else if(files[0].filename.indexOf(".zip")!=-1){
          var zip = new AdmZip(files[0].fd);
            if(fs.existsSync(dir+'/zip')){
              rimraf.sync(dir+'/zip');
            }
            _.each(['zip','zip/original','zip/optmiezd','zip/merge','zip/optmiezd/aio_file/'],function(v){
              var subdir = dir + '/'+ v;
              IScaler.generateDir(subdir);
            });
            zip.extractAllTo( dir + "/zip/original/",true);
            async.each([dirname],IScaler.mergeImgs,function(){
              res.send("zipdone");
            }); 
          }else{
            res.send("err_type");
          }
        });
    } else {
        res.view();
    }
    
  },
  getprojectopt: function(req, res){
    var dirname = req.body.dirname;
    var opt = 100;
    Pendanter.find({where:{dirname:dirname}}).then(function(pendanter){
      if(pendanter && pendanter.length>0){
        res.send({opt:pendanter[0].opt});
      }
    });
  },
  checkimgsize:function(req,res){
    var dirname = req.body.dirname;
    var quality = req.body.quality;
    var osize = {};
    var apngsize = {};
    var dir = IScaler.basePath+dirname+'/';
    var oFileDir = dir +'/original/';
    var apngFileDir = dir +'/'+quality+'/';
    var stats = fs.statSync(oFileDir);
      if(stats.isDirectory()){
      var subFiles = fs.readdirSync(oFileDir);
      for(k in subFiles){
        if(subFiles[k].indexOf('.png')>0){
          var fileStats = fs.statSync(oFileDir+subFiles[k]);
          osize[subFiles[k]] = fileStats["size"];
        }
      }
    }
    //获取序列帧原始大小
    var fpsFilePath = dir +'/zip/merge/preview_new-188x222.png';
    if(fs.existsSync(fpsFilePath)){
      var fileStats = fs.statSync(fpsFilePath);
      osize['preview_new-188x222.png'] = fileStats["size"];
    }

    stats = fs.statSync(apngFileDir);
    if(stats.isDirectory()){
      var subFiles = fs.readdirSync(apngFileDir);
      for(k in subFiles){
        if(subFiles[k].indexOf('.png')>0){
          var fileStats = fs.statSync(apngFileDir+subFiles[k]);
          apngsize[subFiles[k]] = fileStats["size"];
        }
      }
    }
    //获取序列帧优化后大小
    fpsFilePath = dir +'/zip/optmiezd/preview_new-188x222.png';
    if(fs.existsSync(fpsFilePath)){
      var fileStats = fs.statSync(fpsFilePath);
      apngsize['preview_new-188x222.png'] = fileStats["size"];
    }
    res.send([osize,apngsize]);
  },
  changeopt: function(req, res){
    var dirname = req.body.dirname;
    var opt = req.body.opt;
    Pendanter.update({where:{dirname:dirname}},{opt:opt}).exec(function afterwards(err, updated){
      if (err) {
        console.log(err);
        res.send("err");
        return;
      }
      res.send("done");
    });
  },
  getzip: function(req, res){
    var dirname = req.body.dirname;
    var sizeConfig = IScaler.getSizeConfig();
    var currentProject = {};
    var opt = 100;
    var sourceDir = IScaler.basePath+dirname;
    
    Pendanter.find({where:{dirname:dirname}}).then(function(pendanter){
      if(pendanter && pendanter.length>0){
        var pendanter = pendanter[0];
        opt = pendanter.opt;
        //copy 对应质量图片到 final 
        _.each(sizeConfig.size,function(v){
          var sourceFile = sourceDir+'/'+opt+'/'+v.add_name;
          if(fs.existsSync(sourceFile)){
            IScaler.copyfile(sourceFile,sourceDir+'/final/'+v.add_name);
          }
        });
        //copy两张空白图到final (兼容旧版手Q)
        var emptySourceFile1 = IScaler.basePath+'/compatibility/aio-100x108.gif';
        var emptySourceFile2 = IScaler.basePath+'/compatibility/aio-100x108.png';
        var emptySourceFile1Target = sourceDir+'/final/aio-100x108.gif';
        var emptySourceFile2Target = sourceDir+'/final/aio-100x108.png';
        if(fs.existsSync(emptySourceFile1) && !fs.existsSync(emptySourceFile1Target)){
          IScaler.copyfile(emptySourceFile1,emptySourceFile1Target);
        }
        if(fs.existsSync(emptySourceFile2) && !fs.existsSync(emptySourceFile2Target)){
          IScaler.copyfile(emptySourceFile2,emptySourceFile2Target);
        }
        //打包序列优化后（50质量）的zip到final
        var zip = new require('node-zip')();
        var packSoruceDir = sourceDir +'/zip/optmiezd/aio_file/';
        var files = fs.readdirSync(packSoruceDir);
        var filesCount = 0;
        var appender = [];
        for(var i=0,len=files.length;i<len;i++){
          if(files[i].indexOf(".png")){
            var t = files[i].split(".");
            if(!t[0].isNaN && t[1]=='png'){
              filesCount++;
            }
          }
        }
        for(var i=1,len=files.length;i<=len;i++){
          if(fs.existsSync(packSoruceDir+i+'.png')){
            zip.file(i+'.png',fs.readFileSync(packSoruceDir+i+'.png'));
          }
        }
        fs.writeFileSync( sourceDir+"/final/aio_file.zip", zip.generate({base64:false,type:"nodebuffer"}) , 'binary');
        

        //copy序列最终图（50质量）到final
        var seriImgs = sourceDir+'/zip/optmiezd/preview_new-188x222.png'
        if(fs.existsSync(seriImgs)){
          IScaler.copyfile(seriImgs,sourceDir+'/final/preview_new-188x222.png',function(){
            //生成下载文件
            setTimeout(function(){
              var zipProject = new require('node-zip')();
                packSoruceDir = sourceDir +'/final/';
                files = fs.readdirSync(packSoruceDir);
              for(var i=0,len=files.length;i<len;i++){
                if(files[i].indexOf(".png")>=0 || files[i].indexOf(".gif")>=0 || files[i].indexOf(".zip")>=0){
                  if(fs.existsSync(packSoruceDir+files[i])){
                    var stream = fs.readFileSync(packSoruceDir+files[i]);
                    zipProject.file(files[i],stream);
                  }
                }
              }
              fs.writeFileSync( sourceDir+"/"+pendanter.pname+".zip", zipProject.generate({base64:false,type:"nodebuffer"}), 'binary');
              res.send("done");
            },1000);
          });
        }else{
          res.send('err');
        }
      }else{
        res.send('err');
      }
    });
  },
  addnewsize:function(req, res){
    var c = req.body;
    if(c && c.add_width && c.add_height && c.add_x && c.add_y && c.add_name && c.dirname){
      var sizeConfig = IScaler.getSizeConfig();
      var arrStream = null;
      var isExist = false;
      _.each(sizeConfig,function(v){
        if(v.add_name == c.add_name){
          isExist = true;
        }
      });
      if(isExist){
        res.send("exist"); 
        return 
      }else{
        sizeConfig.size.push(c);
        IScaler.setSizeConfig(sizeConfig);
        async.each([c],IScaler.creatImgBySize,function(){
          res.send("done");
        });
      }
    }else{
      res.send("error"); 
    }
  },
  sizedelete:function(req, res){
    var sindex = req.body.sindex;
    var dirname = req.body.dirname;
    var sizeConfig = IScaler.getSizeConfig();
    var sizeName = sizeConfig.size[sindex].add_name;
    sizeConfig.size.splice(sindex,1);
    IScaler.setSizeConfig(sizeConfig);
    _.each([55,50,60,70,80,90,100,'original','final'],function(v){
      var targetFile = IScaler.basePath+dirname+'/'+v+'/'+sizeName;
      if(fs.existsSync(targetFile)){
        fs.unlinkSync(targetFile);
      }
    });
    res.send("done");
  },
  sizemodify : function(req, res){
    var sindex = req.body.sindex;
    var newConfig = req.body;
    var sizeConfig = IScaler.getSizeConfig();
    delete newConfig.sindex;
    sizeConfig.size[sindex] = newConfig;
    IScaler.setSizeConfig(sizeConfig);
    async.each([newConfig],IScaler.creatImgBySize,function(){
      res.send("done");
    });
  }
};

