$(function(){
  var Util = {
    support : {
      touch: "ontouchend" in document ,
      localStorage : function(){
        try {  
          return 'localStorage' in window && window['localStorage'] !== null;  
        } catch (e) {  
          return false;  
        }  
      }
    }
    , isString : function(t){
      return Object.prototype.toString.call(t) === '[object String]' ? true : false;
    }
    , downloadFile : function(link){
      var aLink = document.createElement('a');
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("click", false, false);//initEvent 不加后两个参数在FF下会报错
      aLink.href = link;
      aLink.dispatchEvent(evt);
    }
  };

  //图片上传中的回调
  var $uploading = $(".uploading-mask");
  Dropzone.prototype.onStart = function(file){
    $uploading.show();
  }
  //图片上传成功后的回调
  Dropzone.prototype.onComplete = function(file){
    $uploading.hide();
    if(file.xhr.status == 200 && file.xhr.response == 's'){
      console.log("xxx")
      var url =  window.location.origin+'/uploads/cmshow/temp/cmshow/cmshow.zip';
      Util.downloadFile(url);
    }else{
      alert("上传失败，请重试");
    }
  }
  var sigleDropLoader = new Dropzone("div#dropuploader", { url: "/files"});

});