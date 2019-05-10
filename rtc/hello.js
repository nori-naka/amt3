socketio.on("hello", function(msg){
	alert("in hello")
	const data = JSON.parse(msg);
	
	socketio.emit("hello-hello", {
		dest: data.src,
		src: local_id});
	console.log("hello resive");
	alert("out hello")
});


socketio.on("renew", function(msg){
	alert("in renew");
	const data = JSON.parse(msg);
	
	Object.keys(data).forEach(function(id){
		socketio.emit("hello", 
			{
				dest: id,
				src :local_id
			});
	});
	alert("out renew");
})


socketio.on("hello-hello", function(msg){
	alert("in hello hello")
	const data = JSON.parse(msg);
	remotes[data.src].obj.$name.style.color = "green";
	
	start_audio_to(remotes[data.src]);
	alert("out hello hello")
});
