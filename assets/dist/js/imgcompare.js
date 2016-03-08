$(function(){
  $(".btn").on("click",function(){
     $.ajax({
        url: '/imgcompare/compare',
        data: '',
        type: 'POST',
        dataType: 'html',
        success: function(res){
          console.log(res);
        }
      });
  });  
}); 