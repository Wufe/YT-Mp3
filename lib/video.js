var url = require( 'url' );
var fs = require( 'fs' );
var request = require( 'request' );

var Video = function(){
	
	if( this instanceof Video === false ){
		return new Video();
	}

	this.fetchVideo = function( URI ){ // HTTP get of the video & fetch of the data

		request( URI, function( error, response, body ){
			if( !error && response.statusCode == 200 ){
				fs.writeFile( "test.txt", body, function(){
					console.log( "DONE" );
				});
			}
		});
	};

	this.downloadVideo = function(){};

	this.getMP3 = function(){};

};

module.exports = function(){
	return new Video();
};