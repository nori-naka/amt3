socketio.on("hello", function(msg){
	const data = JSON.parse(msg);
	
	socketio.emit("hello-hello", {
		dest: data.src,
		src: local_id});
	console.log("hello resive");
});


socketio.on("renew", function(msg){
	const data = JSON.parse(msg);
	
	Object.keys(data).forEach(function(id){
		socketio.emit("hello", 
			{
				dest: id,
				src :local_id
			});
	});
})


socketio.on("hello-hello", function(msg){
	const data = JSON.parse(msg);
	remotes[data.src].obj.$name.style.color = "green";
	
	start_audio_to(remotes[data.src]);
	
});
