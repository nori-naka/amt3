
socketio.on("publish", function(msg){
	
	const data = JSON.parse(msg);
	
	if (data.type == "hello") {
		alert("in hello");
		
		socketio.emit("publish", {
			type: "hello-hello",
			dest: data.src,
			src: local_id});
		console.log("hello resive");
		
		alert("out hello")
	} else if (data.type == "hello-hello") {
		alert("in hello hello");
		remotes[data.src].obj.$name.style.color = "green";
	
		start_audio_to(remotes[data.src]);
		alert("out hello hello");
	}

})

socketio.on("renew", function(msg){
	const data = JSON.parse(msg);
	
	Object.keys(data).forEach(function(id){
		socketio.emit("publish", 
			{
				type: "hello",
				dest: id,
				src :local_id
			});
	});
})
