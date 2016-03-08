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
  var cache = (function(u){
    var localSuport = u.support.localStorage();
    _localSetValue = function(k,v){
      localStorage.setItem(k,v);
    }
    , _localGetValue = function(k){
      return localStorage.getItem(k);
    }
    , _cookieSetValue = function(k,v){
      //稍后兼容
    }
    , _cookieGetValue = function(k){
      //稍后兼容
    };
    return {
      get:function(k){
        return localSuport ? _localGetValue( k ) :_cookieGetValue( k );
      },
      set:function(k,v){
        if( k!== undefined && u.isString(k) ){
          localSuport ? _localSetValue( k, v ):_cookieSetValue( k, v );
        }
      }
    };
  })(Util);
  var initImgs = function(){
    var dirname = cache.get('dirname');
    if(dirname){
      //获取当前项目压缩质量
      $.ajax({
        url: '/pendanter/getprojectopt',
        data: 'dirname='+encodeURIComponent(dirname),
        type: 'POST',
        dataType: 'json',
        success: function(res){
          var currentQuality = res.opt;
          $("#optquality").html(currentQuality);
          $(".opt-options a[opt="+currentQuality+"]").addClass("active");
          $("#sizelist .img,#sizelist .img-opt").each(function(){
            var $this = $(this),
              imgname = $this.attr("imgname"),
              filePath = '';
            if($this.hasClass("img")){
              filePath = 'uploads/'+dirname+'/original/'+imgname+".png";
            }else{
              filePath = 'uploads/'+dirname+'/'+currentQuality+'/'+imgname+".png";
            }
            $this.find("img").attr("src",filePath);
          });
          getImageFileSize(dirname,currentQuality);
        }
      });
    }else{
      initImgHolder();
    }
  };

  var initAnimation = function(){
    var dirname = cache.get('dirname');
    if(dirname){
      //获取当前项目压缩质量
      $.ajax({
        url: '/pendanter/getFpsCount',
        data: 'dirname='+encodeURIComponent(dirname),
        type: 'POST',
        dataType: 'json',
        success: function(res){
          var filePath = 'uploads/'+dirname+'/zip/optmiezd/preview_new-188x222.png';
          var $aniFrame = $(".item-animation .img-opt-animation .animation-frame");
          $aniFrame.css("background-image",'url('+filePath+')');
          var animateAtStart = function (steps, duration) {  
            var current = 0;
            var interval = duration / steps;
            var timer = function () {
              current++;
              $aniFrame.css("background-position",current*-188+"px 0px");
              if (current > steps) {
                current = 0;
              }
              setTimeout(timer, interval);
            };
            timer();
          };
          animateAtStart(res.fpscount,1000);
        }
      });
    }
  };

  var initImgHolder = function(){
    $("#sizelist .img,#sizelist .img-opt").each(function(){
      var $this = $(this);
      filePath = 'img/holder.png';
      $this.find("img").attr("src",filePath);
      $(".sizetag").hide();
    });
  };

  var loading = {
    $dom:$(".loadingmask"),
    show:function(){
      this.$dom.removeClass("none");
    },
    hide:function(){
      this.$dom.addClass("none");
    }
  };

  var getImageFileSize = function( dirname , currentQuality ){
    var post = {
      dirname :dirname,
      quality : currentQuality
    }
    $.ajax({
      url: '/pendanter/checkimgsize',
      data: post,
      type: 'POST',
      dataType: 'json',
      success: function(res){
        if(res.length == 2){
          for(k in res[0]){
            var n = k.replace(".png","");
            var v = (res[0][k]/1024).toFixed(2)+'kb';
            $("#sizelist .img[imgname="+n+"] .sizetag").html(v);
          }
          for(k in res[1]){
            var n = k.replace(".png","");
            var v = (res[1][k]/1024).toFixed(2)+'kb';
            $("#sizelist .img-opt[imgname="+n+"] .sizetag").html(v);
          }
          $(".sizetag").fadeIn();
        }

      }
    });
  }

  //初始化当前图片
  ~function(){
    var dirname = cache.get('dirname');
    var pname = cache.get('pname');
    var hasimg = cache.get('hasimg');
    var haszip = cache.get('haszip');
    var $step1 = $(".step1");
    var $step2 = $(".step2");
    if(dirname && pname){
      $(".scaler-wrap").removeClass("none");
      $(".initaler").addClass("none");
      $(".pname").html(pname);
      $("#dropdirname").val(dirname);
      $(".table-list-wrap").css("height",$(window).height()-200+"px");
      //初始化iscroll.js
      // 固定高度的滚动条
      setTimeout(function() {
        var myScrolll = new iScroll($(".table-list-wrap")[0], {
          vScroll: true
        });
      }, 1000);
    }else{
      $(".initaler").removeClass("none");
      $(".scaler-wrap").addClass("none");
      $(".projectlist").css("height",$(window).height()-170+"px");
      setTimeout(function() {
        var myScrolll = new iScroll($(".projectlist")[0], {
          vScroll: true
        });
      }, 1000);
      
    }
    if(hasimg != 'false'){
      initImgs();
      $step1.addClass("done");
    }else{
      $step1.addClass("a-alert");
      setTimeout(function(){
        $step1.removeClass("a-alert");
      },1000);
      initImgHolder();
    }
    if(haszip != 'false'){
      initAnimation();
      $step2.addClass("done");

      if(hasimg != 'false'){
        $(".package-download").removeClass("disabled");
      }
    }else{
      $step2.addClass("a-alert");
       setTimeout(function(){
        $step2.removeClass("a-alert");
      },1000);
    }
  }();

  $(window).on("resize",function(){
    $(".table-list-wrap").css("height",$(window).height()-200+"px");
  });

  //退出登陆
  $(".logout").on("click",function(){
    $.ajax({
      url: '/login/logout',
      type: 'POST',
      dataType: 'html',
      success: function(res){
      location.href= '/';
      }
    });
  });

  $(".add-project").on("click",function(){
    var pname = $.trim($("#newproject_name").val());
    loading.show();
    $.ajax({
      url: '/pendanter/newproject',
      data: 'pname='+encodeURIComponent(pname),
      type: 'POST',
      dataType: 'json',
      success: function(res){
        loading.hide();
        if(res && res.pname && res.dirname){
          cache.set('pname',res.pname);
          cache.set('dirname',res.dirname);
          cache.set('hasimg',res.hasimg);
          cache.set('haszip',res.haszip);
          location.reload();
        }else{
          alert("新建项目失败");
        }
      }
    });
  });

  $(".exit-tolist").on("click",function(){
    cache.set("pname","");
    cache.set("dirname","");
    location.reload();
  });


  //图片上传中的回调
  Dropzone.prototype.onStart = function(file){
    loading.show();
  }
  //图片上传成功后的回调
  Dropzone.prototype.onComplete = function(file){
    loading.hide();
    if(file.xhr.status == 200){
      if(file.xhr.response == 'zipdone'){
        cache.set('haszip',true);
      }else if(file.xhr.response == 'pngdone'){
        cache.set('hasimg',true);
      }else if(file.xhr.response == 'err_type'){
        alert("文件格式有误，仅限png与zip文件");
        return;
      }
      location.reload();
    }else{
      alert("上传失败，请重试");
    }
  }

  //切换质量
  $(".opt-options").delegate("a","click",function(){
    var $this = $(this);
    var opt = $this.attr("opt");
    var dirname = cache.get("dirname");
    if($this.hasClass("active"))return;
    $(".opt-options a").removeClass("active");
    $this.addClass("active");
    $.ajax({
      url: '/pendanter/changeopt',
      data: {opt:opt,dirname:dirname},
      type: 'POST',
      dataType: 'html',
      success: function(res){
        if(res == 'done'){
          location.reload();
        }
      }
    });
  });

  //单个文件上传
  var sigleDropLoader = new Dropzone("div#dropuploader", { url: "/files"});

  //-1标记输入框的状态是添加，其他为编辑的index序号
  var g_editIndex = -1;
  
  var $original = $(".original"),
  $targetImg = $(".img-targetsize"),
  $originalOutline = $("#original_ourline"),
  $outline = $("#outline"),
  $width = $("#add_width"),
  $height = $("#add_height"),
    $x = $("#add_x"),
    $y = $("#add_y"),
    $name = $("#add_name"),
  heightNoChange = 0;

  //添加、编辑尺寸
  $(".add-section").on("click",function(){
    var oWidth = $original.width(),
    oHeight = $original.height(),
    originalSrc = $original.attr("src");
    g_editIndex = -1;
    $targetImg.attr("src",originalSrc).width(oWidth);
    $originalOutline.css({
    width:oWidth+"px",
    height:oHeight+"px"
    });
    $outline.css({
    width:oWidth+"px",
    height:oHeight+"px"
    });
    $width.val(oWidth);
    $height.val(oHeight);
  }).colorbox({inline:true, width:"70%"});
  $width.on("keyup",function(){
    var width = $(this).val(),
    oWidth = $original.width(),
    oHeight = $original.height(),
    per = oWidth/oHeight,
    height = parseInt(width/per);
    if(!isNaN(width)){
    $outline.width(width).height(height);
    $targetImg.width(width);
    $height.val(height);
    heightNoChange = height;
    }
  });
  $height.on("keyup",function(){
    var height = $(this).val();
    if(height!=heightNoChange){
    $outline.addClass("changed").height(height);
    }else{
    $outline.removeClass("changed").height(height);
    }
  });

  //保存尺寸
  $(".sava-size").on("click",function(){
    var data = {
      add_width:$("#add_width").val(),
      add_height:$("#add_height").val(),
      add_x:$("#add_x").val(),
      add_y:$("#add_y").val(),
      add_name:$("#add_name").val(),
      dirname:cache.get("dirname")
    };
    var url = g_editIndex < 0 ? '/pendanter/addnewsize':'/pendanter/sizemodify';
    var valied = true;
    data.sindex  = g_editIndex
    //检查是否重名
    $(".btn-edit").each(function(i){
      var $this=$(this);
      if((g_editIndex <0 && $this.attr("size-name") == data.add_name)
        || (g_editIndex >= 0 && i!=g_editIndex && $this.attr("size-name") == data.add_name)
      ){
        valied = false;
      }
    });
    //检查文件名后缀是否为png

    if(!/\.png/i.test(data.add_name)){
      alert("文件名必须以.png结尾");
      return;
    }
    if(valied){
      loading.show();
      $.ajax({
        url: url,
        data: data,
        type: 'POST',
        dataType: 'html',
        success: function(res){
          location.reload();
        }
      });
    }else{
      alert("存在同名文件，请更改文件名");
    }
    
  }); 
  
  //编辑按钮
  $("#sizelist").delegate(".btn-edit","click",function(){
    var $this =$(this),
      sindex = $this.attr("sindex"),
      size = {
        width:$this.attr("size-width"),
        height:$this.attr("size-height"),
        x:$this.attr("size-x"),
        y:$this.attr("size-y"),
        name:$this.attr("size-name"),
      }
    $.colorbox({href:"#addsection",inline:true, width:"70%"});
    g_editIndex = sindex;
    $width.val(size.width);
    $height.val(size.height);
    $x.val(size.x);
    $y.val(size.y);
    $name.val(size.name+".png");
  });

  //删除按钮
  $("#sizelist").delegate(".btn-delete","click",function(){
    var $this =$(this),
      sindex = $this.attr("sindex");
    $.ajax({
      url: '/pendanter/sizedelete',
      data: {'sindex':sindex,'dirname':cache.get("dirname")},
      type: 'POST',
      dataType: 'html',
      success: function(res){
        location.reload();
      }
    });
  });

  //打包下载
  $(".package-download").on("click",function(){
    var isDone = true;
    var dirname = cache.get("dirname");
    var pname = cache.get("pname");
    $(".step li").each(function(){
      var $this = $(this);
      if(!$this.hasClass("done")){
        isDone = false;
        $this.addClass("a-alert");
        setTimeout(function(){
          $this.removeClass("a-alert");
        },1000);
      }
    });
    if(isDone && dirname){
      loading.show();
       $.ajax({
        url: '/pendanter/getzip',
        data: {'dirname':dirname},
        type: 'POST',
        dataType: 'html',
        success: function(res){
          loading.hide();
          var url =  window.location.origin+'/uploads/'+dirname+'/'+pname+'.zip';
          Util.downloadFile(url);
        }
      });
    }
  });

  //进入项目
  $(".projectlist").delegate(".btn-modify","click",function(){
    var dirname = $(this).attr("dirname");
    loading.show();
     $.ajax({
      url: '/pendanter/editproject',
      data: {'dirname':dirname},
      type: 'POST',
      dataType: 'json',
      success: function(res){
        loading.hide();
        if(res && res.pname && res.dirname){
          cache.set('pname',res.pname);
          cache.set('dirname',res.dirname);
          cache.set('hasimg',res.hasimg);
          cache.set('haszip',res.haszip);
          location.reload();
        }else{
          alert("打开失败");
        }
      }
    });
  });

  //删除项目
  $(".projectlist").delegate(".btn-delete","click",function(){
    var dirname = $(this).attr("dirname");
    if(confirm("删除该挂件吗?")){
      loading.show();
      $.ajax({
        url: '/pendanter/deleteproject',
        data: {'dirname':dirname},
        type: 'POST',
        dataType: 'html',
        success: function(res){
          loading.hide();
          location.reload();
        }
      });
    }
  });

});

