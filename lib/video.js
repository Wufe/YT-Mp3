var url = require( 'url' );
var fs = require( 'fs' );
var http = require( 'http' );
var request = require( 'request' );
var Downloader = require( './downloader' );

var Video = function(){
	
	if( this instanceof Video === false ){
		return new Video();
	}

	var video_obj = {};
	var resolutions = {};

	var downloader = new Downloader();
	var folder = "download";

	Object.prototype.length = function(){
		var obj = this;
	    var size = 0, key;
	    for( key in obj ){
	        if( obj.hasOwnProperty( key ) )size++;
	    }
	    return size;
	};

	this.fetchVideo = function( URI, callback, scope ){
		var sURI = url.parse( URI );
		video_obj.id = sURI.query.match( /v=(.+?)($|&)/i )[ 1 ];
		video_obj.URI = sURI;
		request( URI, function( error, response, body ){
			if( !error && response.statusCode == 200 ){
				fs.writeFile( "./debug/BODY.txt", body );
				video_obj.title = body.match( /<title>(.+?) \- Youtube/i )[ 1 ];
				var fmt_list = body.match( /fmt_list":"([^"]+?)"/i );
				if( fmt_list[ 1 ] !== undefined ){
					fmt_list = fmt_list[ 1 ].split( ',' );
					for( var i = 0; i < fmt_list.length; i++ ){
						var itag = fmt_list[ i ].match( /(\d*)\\/i )[ 1 ];
						var resolution = fmt_list[ i ].match( /\/(\d*x\d*)\\/i )[ 1 ];
						resolutions[ itag ] = resolution;
					}
				}
				video_obj.source = {};

				var stream_map = body.match( /url_encoded_fmt_stream_map":"([^"]+?)"/i )[ 1 ];
				var decStreams = stream_map.split( ',' ).map( function( x ){ return decodeURIComponent( x ); } );
				for( var i = 0; i < decStreams.length; i++ ){
					var ds = decStreams[ i ];
					var to = {};
					var itag = false;
					ds.split( "\\u0026" ).map( function( x ){
						var key = x.match( /^([^=]+)=/i )[ 1 ];
						var value = x.match( /=(.+?)$/i )[ 1 ];
						to[ key ] = value;
						if( key == 'itag' && resolutions[ value ] !== undefined ){
							to.resolution = resolutions[ value ];
						}
						if( key == 'itag' ){
							itag = value;
						}
						return x;
					});
					if( itag !== false ){
						video_obj.source[ itag ] = to;
					}
				}


				var afmt_list = body.match( /adaptive_fmts":"([^"]+?)"/i );
				if( afmt_list !== null && afmt_list[ 1 ] !== undefined ){
					var amap = afmt_list[ 1 ];
					fs.writeFile( './debug/AMAP.txt', amap );
					amap = amap.split( ',' ).map( function( x ){ return decodeURIComponent( x ); } );
					for( var i = 0; i < amap.length; i++ ){
						var dm = amap[ i ];
						var to = {};
						var itag = false;
						dm.split( "\\u0026" ).map( function( x ){
							var key = x.match( /^([^=]+)=/i )[ 1 ];
							var value = x.match( /=(.+?)$/i )[ 1 ];
							to[ key ] = value;
							if( key == 'itag' ){
								itag = value;
							}
							return x;
						});
						if( itag !== false ){
							video_obj.source[ itag ] = to;
						}
					}
				}
				
				fs.writeFile( "./debug/JSON.txt", JSON.stringify( video_obj ) );

				if( video_obj.source.length() > 0 ){
					if( typeof callback == 'function' ){
						callback.call( scope || this );
					}
				}

			}else{
				console.log( "Cannot get the video. Are you connected to internet?" );
			}
		});
	};

	this.downloadFile = function( filename, uri, callback, scope ){
		downloader.download( uri, './' + ( folder.substr( -1 ) == '/' ? folder : ( folder + '/' ) ) + filename, callback, scope );
		/*uri = url.parse( uri );
		fs.open( './download/' + filename, 'w', undefined, function( err, fd ){
			if( err !== null ){
				console.log( "Cannot write on file." );
				return false;
			}
			var options = {
				host: uri.host,
				port: uri.port || 80,
				path: uri.path,
				method: 'GET'
			};
			http.request( options, function( res ){
				res.on( 'data', function( data ){
					fs.write( fd, data, 0, data.length, undefined, function( err, writt, buff ){
						if( err !== null ){
							console.log( err );
						}
					});
				});
				res.on( 'end', function(){
					fs.close( fd );
					if( typeof callback == 'function' ){
						callback.call( scope || this );
					}else{
						console.log( "Download of \"" + filename + "\" ended." );
					}
				})
			}).end();
		})*/
	}

	this.getMP3 = function(){
		var sourceData = {};
		if( video_obj.source.length() > 0 ){
			if( video_obj.source[ '141' ] !== undefined ){  		// HQ MP3
				sourceData = video_obj.source[ '141' ];
			}else if( video_obj.source[ '140' ] !== undefined ){	// MQ MP3
				sourceData = video_obj.source[ '140' ];
			}else if( video_obj.source[ '22' ] !== undefined ){		// 720P MP4
				sourceData = video_obj.source[ '22' ];
			}else if( video_obj.source[ '135' ] !== undefined ){	// 480P MP4
				sourceData = video_obj.source[ '135' ];
			}else if( video_obj.source[ '18' ] !== undefined ){		// 360P MP4
				sourceData = video_obj.source[ '135' ];
			}else{
				console.log( "Quality of the video too low." );
				return false;
			}
			
			if( sourceData.type.indexOf( 'audio' ) > -1 ){ // Is a audio source
				this.downloadFile( video_obj.title + '.mp3', sourceData.url );
			}else{ // Need to be downloaded as video and converted to MP3 with ffmpeg

			}
		}else{
			console.log( "No data." );
		}
	};

};

module.exports = function(){
	return new Video();
};