$(function(){

    $('button.btn-add').click(function() {
        $('.popup-upload').show();
    });


    $('.popup-upload .close').click(function() {
        $('.popup-upload').hide();
    });




    $('.popup-upload .g-btn').click(function() {
        $('.wrapper').hide();
        $('.scaler-wrap').show();
        $('.popup-upload').hide();
    });


    $('.i_edit').click(function() {
        $('.scaler-wrap').addClass("none");
        $('.wrapper').show();
    });
});

