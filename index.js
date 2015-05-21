var Video = require( './lib/video' );

var video = new Video();
//video.fetchVideo( "https://www.youtube.com/watch?v=89DHFeSVxrg" );
//video.fetchVideo( "https://www.youtube.com/watch?v=heJBwBUStXU&index=2&list=RDVPu9vdrP4LI" );
video.fetchVideo( "https://www.youtube.com/watch?v=mmqv5SJH7Ko", function(){
	video.getMP3();
});