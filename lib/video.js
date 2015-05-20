var url = require( 'url' );
var fs = require( 'fs' );
var request = require( 'request' );

var Video = function(){
	
	if( this instanceof Video === false ){
		return new Video();
	}

	var video_obj = {};

	this.fetchVideo = function( URI ){ // HTTP get of the video & fetch of the data

		request( URI, function( error, response, body ){
			if( !error && response.statusCode == 200 ){
				var fmt_list = body.match( /fmt_list":"([^"]+?)"/i );
				if( fmt_list[ 1 ] !== undefined ){
					video_obj.resolutions = [];
					fmt_list = fmt_list[ 1 ].split( ',' );
					for( var i = 0; i < fmt_list.length; i++ ){
						var itag = fmt_list[ i ].match( /(\d*)\\/i )[ 1 ];
						var resolution = fmt_list[ i ].match( /\/(\d*x\d*)\\/i )[ 1 ];
						var tmpobj = { itag: itag, resolution: resolution };
						video_obj.resolutions.push( tmpobj );
					}
				}
				fs.writeFile( "body.txt", body );
				var stream_map = body.match( /url_encoded_fmt_stream_map":"([^"]+?)"/i )[ 1 ];
				var decStreams = stream_map.split( ',' ).map( function( x ){ return decodeURIComponent( x ); } );
				video_obj.data = [];
				for( var i = 0; i < decStreams.length; i++ ){
					var ds = decStreams[ i ];
					var to = {};
					ds.split( "\\u0026" ).map( function( x ){
						var key = x.match( /^([^=]+)=/i )[ 1 ];
						var value = x.match( /=(.+?)$/i )[ 1 ];
						to[ key ] = value;
						return x;
					});
					video_obj.data.push( to );
				}

				//for debug purpose
				fs.writeFile( "decoded.txt", JSON.stringify( video_obj ), function(){} );
				
			}else{
				console.log( "Cannot get the video. Are you connected to internet?" );
			}
		});
	};

	this.downloadVideo = function(){};

	this.getMP3 = function(){};

};

module.exports = function(){
	return new Video();
};