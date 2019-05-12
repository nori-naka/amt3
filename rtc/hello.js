
socketio.on("publish", function (msg) {

	const data = JSON.parse(msg);

	if (data.dest == local_id) {
		if (data.type == "hello") {
			console.log(`hello resive msg=${msg}`);

			if (remotes[data.src] && remotes[data.src].peer) {
				console.log("hello-hello send : offer ready");
				socketio.emit("publish", JSON.stringify(
					{
						type: "hello-hello",
						dest: data.src,
						src: local_id
					})
				);
			}

		} else if (data.type == "hello-hello") {

			if (remotes[data.src] && !remotes[data.src].audio_sender) {
				remotes[data.src].obj.$name.style.color = "green";
				start_audio_to(remotes[data.src]);
			}
		}
	}
})

socketio.on("renew", function (msg) {
	const data = JSON.parse(msg);

	if (!local_id) return;
	if (!local_stream) return;

	Object.keys(data).forEach(function (remote_id) {

		if (data.src != local_id) {
			socketio.emit("publish", JSON.stringify(
				{
					type: "hello",
					dest: remote_id,
					src: local_id
				})
			)
		}
	});
})
