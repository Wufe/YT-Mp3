var Downloader = function(){

	if( false === ( this instanceof Downloader ) ){
        return new Downloader();
    }

    var url = require( 'url' );
    var fs = require( 'fs' );
    var path = require( 'path' );
    var http = require( 'http' );
    var https = require( 'https' );

    var Chunk = function( parent, data ){
    	var parent = parent;
    	var index = data.index;

    	var URI = data.URI;
    	var filename = data.filename;

    	var start = data.start;
    	var end = data.end;

    	var chunk_size = data.chunk_size;
    	var content_length = data.content_length;
    	var file_descriptor = data.file_descriptor;

    	var range = "bytes=" + start + "-" + end;
    	var onEndCallback = data.onEndCallback;
    	var stack = new Buffer( 0 );
    	var written = 0;
    	var classScope = this;

    	this.ended = false;

    	var onData = function( data ){
    		stack = Buffer.concat( [ stack, data ] );
    		if( stack.length >= chunk_size ){
    			var newB = stack;
    			stack = new Buffer( 0 );
    			var pos = start + written;
    			write( newB, pos, function(){
    				written += newB.length;
    			}, this );
    		}
    	}

    	var onEnd = function(){
    		var pos = start + written;
    		write( stack, pos, function(){
    			classScope.ended = true;
    			if( typeof onEndCallback.callback == 'function' ){
    				onEndCallback.callback.call( onEndCallback.scope || classScope );
    			}
    		});
    	}

    	var write = function( buffer, position, callback, scope ){
    		fs.write( file_descriptor, buffer, 0, buffer.length, position, function( err, writt, buff ){
    			if( typeof callback == 'function' ){
    				callback.call( scope || this );
    			}
    		});
    	}

    	var startDownload = function(){
    		var options = {
    			host: URI.host,
    			port: URI.port || 80,
    			path: URI.path,
    			method: 'GET',
    			headers: ( content_length !== undefined ? { "range": range } : undefined )
    		};
    		//console.log( 'Thread #' + index + ' range: ' + range );
    		var ssl = URI.protocol.indexOf( 'https' ) === 0 ? true : false;
    		if( ssl ){
    			var req = https.request( options, function( res ){
    				res.on( 'data', onData );
    				res.on( 'end' , onEnd );
    			}).end();
    		}else{
    			var req = http.request( options, function( res ){
    				res.on( 'data', onData );
    				res.on( 'end', onEnd );
    			}).end();
    		}
    	};

    	startDownload();

    };

    var mode = 'multi';
    var thread_count = 4;
    var chunk_size = 512*1024;
    var chunks = [];
    var file_descriptor = undefined;
    var URI = undefined;
    var filename = undefined;

    this.download = function( URI, filename, callback, scope ){ // download( URI, [ filename, ] callback, scope )
    	URI = url.parse( URI );
    	if( typeof filename == 'function' || ( typeof filename == 'undefined' && typeof callback == 'undefined' ) ){
    		filename = undefined;
    		scope = callback;
    		callback = filename;
    	}
    	filename = typeof filename == 'undefined' ? path.basename( URI[ 'path' ] ) : filename;
    	console.log( "\nDownloading " + filename + ".." );
    	this.getHeaders( URI, function( headers ){
			content_length = headers[ 'content-length' ] === undefined ? undefined : parseInt( headers[ 'content-length' ] );
			this.createDummy( filename, content_length, function(){

                var onEndCallback = {
                    callback : function(){
                        var ended = true;
                        for( var a = 0; a < chunks.length; a++ ){
                            if( chunks[ a ].ended == false ){
                                ended = false;
                            }
                        }
                        if( ended ){
                            fs.close( file_descriptor );
                            console.log( "Ended." );
                            if( typeof callback == 'function' ){
                                callback.call( scope || this );
                            }
                        }
                    },
                    scope: this
                };

                if( content_length !== undefined ){
                    var chunk_length = Math.floor( content_length / thread_count );
                    var chunk_count = 0;
                    for( var i = 0; i < thread_count; i++ ){
                        var thread_obj = {
                            index: i,
                            start: chunk_count,
                            end: ( i == ( thread_count -1 ) ? content_length : chunk_count + chunk_length ),
                            stack: new Buffer( 0 ),
                            written: 0,
                            content_length: content_length,
                            filename: filename,
                            URI: URI,
                            chunk_size: chunk_size,
                            file_descriptor: file_descriptor,
                            onEndCallback: onEndCallback
                        };
                        var chunk = new Chunk( this, thread_obj );
                        chunk_count += chunk_length;
                        chunks.push( chunk );
                    }
                }else{
                    var thread_obj = {
                        index: 0,
                        filename: filename,
                        URI: URI,
                        chunk_size: chunk_size,
                        file_descriptor: file_descriptor,
                        onEndCallback: {
                            callback: function(){
                                fs.close( file_descriptor );
                                console.log( "Ended.\n" );
                                if( typeof callback == 'function' ){
                                    callback.call( scope || this );
                                }
                            },
                            scope: this
                        }
                    };
                    var chunk = new Chunk( this, thread_obj );
                    chunks.push( chunk );
                }
				
			}, this );

    		
    	}, this );


    };


	this.getHeaders = function( URI, callback, scope ){
		var options = {
			'method': 'HEAD',
			'host': URI.host,
			'port': URI.port || 80,
			'path': URI.path
		};
		var req = http.request( options, function( res ){
			if( typeof callback == 'function' ){
				callback.call( scope || this, res.headers );
			}
			req.abort();
		});
		req.end();
	};

	this.bytesWritten = 0;
	this.dummyLength = 0;
	this.maxLength = 1073741823;

	this.createDummy = function( filename, length, callback, scope ){
		var me = this;
		this.bytesWritten = 0;
		this.dummyLength = 0;
		fs.open( './' + filename, 'w', undefined, function( err, fd ){
			file_descriptor = fd;
			if( length === undefined ){
                if( typeof callback == 'function' ){
                    callback.call( scope || this );
                }
            }else{
                me.writeFunction( function(){
                    if( typeof callback == 'function' ){
                        callback.call( scope || this );
                    }
                }, this );
            }
		});
	};



	this.writeFunction = function( callback, scope ){
		this.writeDummy( this.dummyLength > this.maxLength ? this.maxLength : this.dummyLength, this.bytesWritten, function( written ){
			if( written + this.bytesWritten < this.dummyLength ){
				this.bytesWritten += written;
				this.dummyLength -= written;
				this.writeFunction( callback, scope );
			}else{
				if( typeof callback == 'function' ){
					callback.call( scope || this );
				}
			}
		}, this );
	};

	this.writeDummy = function( length, position, callback, scope ){
		var me = this;
		fs.write( file_descriptor, new Buffer( length ), 0, length, position, function( sth, error, written ){
			if( typeof callback == 'function' ){
				callback.call( scope || this, written );
			}
		});
	};

};


module.exports = function(){
	return new Downloader();
};