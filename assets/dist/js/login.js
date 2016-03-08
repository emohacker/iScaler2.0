$(function(){
  $(window).on("keyup",function(e){
    if(e.keyCode == 13)$(".btn-commit").click();
  });
  $(".btn-logout").on("click",function(){
    $.ajax({
      url: '/login/logout',
      type: 'POST',
      dataType: 'html',
      success: function(res){
        location.href= '/';
      }
    });
  });
  $(".btn-commit").on("click",function(){
    var username = $(".username").val();
    var password = $(".password").val();
    var isvalied = true;
    if($.trim(username)==""){
      alert("用户名不能为空");
      isvalied = false;
    }else if($.trim(password)==""){     
      alert("密码不能为空");
      isvalied = false;
    }
    if(!isvalied)return;
    $.ajax({
      url: '/login/auth',
      data: 'username='+encodeURIComponent(username)+'&password='+encodeURIComponent(password),
      type: 'POST',
      dataType: 'html',
      success: function(res){
        if(res=='u_err' || res=='p_err'){
          $(".notification").addClass("err").html("用户名密码错误")
        }else if(res=='err' ){
          $(".notification").addClass("err").html("系统错误，请刷新后重试")
        }else if(res=='s'){
          $(".notification").removeClass("err").addClass("succed").html("登陆成功")
          location.href= '/';
        }
      }
    });

  });
})