(function(window, doc){
	if( Dropzone === undefined ){
		try{console.log("请先载入Dropzone.js");}catch(e){};
	}else{
		Function.prototype.before = function( func ){
		    var __self = this;
		    return function(){
		        if( func.apply(this,arguments) === false ){
		            return false;
		        } 
		        return __self.apply( this, arguments );
		    }
		}
		Dropzone.prototype.onComplete = function( file ){}
		Dropzone.prototype.onStart = function( file ){}
		
		Dropzone.prototype.defaultOptions.complete = Dropzone.prototype.defaultOptions.complete.before(function(file){
			this.onComplete(file);
		});
		Dropzone.prototype.defaultOptions.processing = Dropzone.prototype.defaultOptions.processing.before(function(file){
			this.onStart(file);
		});
		
	}
})(window, document);
