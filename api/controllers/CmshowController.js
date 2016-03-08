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

var appPath = sails.config.appPath+'/assets/dist';
var IScaler = {
  basePath:appPath + "/uploads/cmshow/temp/"
  , copyfile : function(src,dist,next){
    var readable = fs.createReadStream( src );
    var writable = fs.createWriteStream( dist );  
    readable.pipe( writable );
    readable.on('end', function() {
      if(next)next();
    });
  }
  //创建目录
  , generateDir : function(dir){
    if(fs.existsSync(dir)){
      rimraf.sync(dir);
    }
    fs.mkdirSync(dir);
  }
  //生成序列串
  , mergeImgs:function(mergeConfig,callback){
    var distDir = IScaler.basePath+mergeConfig.dirname+'/zip/';
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
          // 188,222,
          mergeConfig.sWidth ,mergeConfig.sHeight,
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
        .write(targetDir+"cmshow-merged.png", function (err) {
          if (err) {
            console.log('append error:');
            console.log(err);
          }
          execFile(pngquant, ['--quality=50-50', targetDir+"cmshow-merged.png"], function (err) {
              if (err) {
                console.log("png8a error:");
                console.log(err);
              }
              var tempFile = targetDir + "cmshow-merged-fs8.png"
              var optedFile = optDir + "cmshow-merged.png"
              IScaler.copyfile(tempFile,optedFile,function(){
                fs.unlinkSync(tempFile);
                callback();
              });
          });
        }); 
      });
    });
  }
}
module.exports = {
  init:function(req,res){
    res.view('cmshow',{
      currentProject:'cmshow',
    });
  },
  zipupload:function(req,res){
    if (req.method === 'POST') {           
      req.file('file').upload(function (err, files) {
        if(err){
          console.log(err);
          res.send("err");
          return;
        }
        var dirname = 'cmshow';
        var dir = IScaler.basePath + dirname;
        var config = {
          dirname:dirname,
          sWidth:req.body.swidth,
          sHeight:req.body.sheight
        };
        if(files[0].filename.indexOf(".zip")!=-1){
          var zip = new AdmZip(files[0].fd);
          if(fs.existsSync(dir+'/zip')){
            rimraf.sync(dir+'/zip');
          }
          if(fs.existsSync(dir+'/package')){
            rimraf.sync(dir+'/package');
          }
          _.each(['zip','package','zip/original','zip/optmiezd','zip/merge','zip/optmiezd/aio_file/'],function(v){
            var subdir = dir + '/'+ v;
            IScaler.generateDir(subdir);
          });
          zip.extractAllTo( dir + "/zip/original/",true);
          async.each([config],IScaler.mergeImgs,function(){
            IScaler.copyfile(dir+'/zip/merge/cmshow-merged.png',dir+'/package/soruce.png',function(){
              IScaler.copyfile(dir+'/zip/optmiezd/cmshow-merged.png',dir+'/package/optmiezd.png',function(){
                //生成下载文件
                setTimeout(function(){
                  var zipProject = new require('node-zip')();
                    packSoruceDir = dir +'/package/';
                    files = fs.readdirSync(packSoruceDir);
                    for(var i=0,len=files.length;i<len;i++){
                      if(files[i].indexOf(".png")>=0 || files[i].indexOf(".gif")>=0 || files[i].indexOf(".zip")>=0){
                        if(fs.existsSync(packSoruceDir+files[i])){
                          var stream = fs.readFileSync(packSoruceDir+files[i]);
                          zipProject.file(files[i],stream);
                        }
                      }
                    }
                  fs.writeFileSync( dir+"/"+config.dirname+".zip", zipProject.generate({base64:false,type:"nodebuffer"}), 'binary');
                  res.send("s");
                },1000);
              });
            });
          }); 
          }else{
            res.send("err_type");
          }
        });
    } else {
      res.send("err_type");
    }
  },
}