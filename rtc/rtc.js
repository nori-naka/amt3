const socketio = io.connect();

const $local_title = document.getElementById("local_title");
const $local_name = document.getElementById("local_name");
const $local_elm = document.getElementById("local_elm");
const $remote = document.getElementById("remote");
const remotes = {};
let local_id = null;
let local_stream = null;
let audioCtx;
let local_level_meter;
let local_elm_view_flag = true;

//-----------------------------------------
const LOG = function (msg) {
    socketio.emit("log", {
        id: local_id,
        func: msg.func,
        text: msg.text
    });
}
//------------------------------------------
let tv_conf_mode = false;

let constraints = {
    audio:
    {
        echoCancellationType: 'system'
    },
    video: {
        width: {
            min: 320,
            max: 640
        },
        height: {
            min: 240,
            max: 480
        },
        frameRate: 20,
        //facingMode: { exact: 'environment' }
        //facingMode: { exact: 'user' }
    }
}

const init = function (){
	local_video_start();
	
	$local_title.addEventListener("click", function (ev) {
            if (local_elm_view_flag) {
                $local_elm.style.display = "none";
                local_elm_view_flag = false;
            } else {
                $local_elm.style.display = "block";
                local_elm_view_flag = true;
            }
        })
}

local_video_start = function () {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            local_stream = stream;
            // setting state in console
            console.log(`AUDIO SETTING=${JSON.stringify(stream.getAudioTracks()[0].getSettings())}`);
            console.log(`VIDEO SETTING=${JSON.stringify(stream.getVideoTracks()[0].getSettings())}`);
            LOG({
                id: "none",
                func: "getUserMedia",
                text: `SETTING=${JSON.stringify(stream.getAudioTracks()[0].getSettings())}`
            });
            $local_elm.srcObject = local_stream;
            $local_elm.play();
            selectDevices();

            let $local_level = document.getElementById("local_level");
            //const local_color = window.getComputedStyle($local, null).getPropertyValue("color");
            local_level_meter = new Audio_meter(local_stream, $local_level, "#2d8fdd");
        })
        .catch(function (err) {
            console.log(`gUM error:${err}`);
        });
}

/*
$local_id.onchange = function (ev) {
    console.log(`$local_id:${ev.target.value}`);
    local_id = ev.target.value;
    $local_id.style.display = "none";
    $local_name.innerText = local_id;
    $local_name.style.display = "inline-block";
    $login_dialog.style.display = "none";

    setInterval(function () {
        socketio.emit("renew", JSON.stringify({ id: local_id, constraints: constraints }));
    }, 1500);
}
*/

const Create_elm = function (name, parent, a_class) {
    self = this;

    // -- user name --
    this.$name = document.createElement("span");
    this.$name.classList.add("text");
    this.$name.innerText = name;

    // -- load spiner --
    this.$spiner = document.createElement("div");
    this.$spiner.classList.add("dot-spin");
    this.$spiner.style.display = "none";
    this.$spiner.style.left = "30px";

    // -- level meter --
    this.$canvas = document.createElement("canvas");
    this.$canvas.classList.add("level_meter");
    //this.remote_color = window.getComputedStyle(this.$li, null).getPropertyValue("color");

    this.$user_title = document.createElement("div");
    this.$user_title.appendChild(this.$name);
    this.$user_title.appendChild(this.$spiner);
    this.$user_title.appendChild(this.$canvas);
    this.$user_title.classList.add("user_title");

    this.$media = document.createElement("video");
    this.$media.classList.add("video");
    this.$media.style.display = "none";
    this.$media.setAttribute("playsinline", true);

    // 以下はiOS対策 iOSは複数のVIDEO再生時、audioをミュートしないと再生出来ない.
    this.$media.muted = true;
    this.$audio = document.createElement("audio");
    this.$audio.style.display = "none";

    this.$remote_user = document.createElement("div");
    this.$remote_user.appendChild(this.$user_title);
    this.$remote_user.appendChild(this.$media);
    this.$remote_user.appendChild(this.$audio);
    //this.$remote_user.classList.add(a_class);

    parent.appendChild(this.$remote_user);
}

Create_elm.prototype.get_elm = function () {
    return this.$remote_user;
}

Create_elm.prototype.show = function (ev) {
    if (ev.track.kind == "video") {
        this.$media.srcObject = ev.streams[0];
        this.$media.style.display = "block";
        this.$media.play();

        this.$audio.srcObject = ev.streams[0];
        this.$audio.play();

        // ロードスピナーを消す
        this.$spiner.style.display = "none";

    } else {
        this.remote_level_meter = new Audio_meter(ev.streams[0], this.$canvas, "#2d8fdd");
    }
}

Create_elm.prototype.delete = function () {
    while (this.$remote_user.firstChild) {
        this.$remote_user.removeChild(this.$remote_user.firstChild);
    }
    this.$remote_user.parentNode.removeChild(this.$remote_user);
}

Create_elm.prototype.on = function (event, handler) {
    this.$remote_user.addEventListener(event, handler);
}

socketio.on("renew", function (msg) {
    //console.log(`renew=${msg}`)
    const data = JSON.parse(msg);

    if (!local_id) return;
    if (!local_stream) return;

    const cur_users = Object.keys(remotes)

    Object.keys(data).forEach(function (new_user) {
        if (!cur_users.includes(new_user) && new_user != local_id) {
            remotes[new_user] = {};
            remotes[new_user].obj = new Create_elm(new_user, $remote, "");
            remotes[new_user].elm = remotes[new_user].obj.get_elm();
            remotes[new_user].peer = new RTCPeerConnection({
                //sdpSemantics : "unified-plan",
                sdpSemantics: "plan-b",
                iceServers: [
                    { urls: "stun:stun.stunprotocol.org" },
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:23.21.150.121' },
                    { urls: "turn:numb.viagenie.ca", credential: "jrc@numb", username: "noriaki.nakamura@gmail.com" }
                ]
            });
            remotes[new_user].peer.onicecandidate = function (ev) {
                console.log(`onicecandidate:ev=${JSON.stringify(ev)}`);

                if (ev.candidate) {
                    socketio.emit("publish", JSON.stringify(
                        {
                            type: "candidate",
                            dest: new_user,
                            src: local_id,
                            candidate: ev.candidate
                        })
                    )
                } else {
                    remotes[new_user].count = 0;
                }
            }
            remotes[new_user].peer.ontrack = function (ev) {
                console.log(`ontrack ev=${JSON.stringify(ev)}`);

                if (ev.streams && ev.streams[0]) {
                    remotes[new_user].obj.show(ev);
                }
            }

            remotes[new_user].peer.onsignalingstatechange = function (ev) {
                LOG({
                    func: "onsignalingstatechange",
                    text: remotes[new_user].peer.signalingState
                });
            }

            remotes[new_user].count = 0;
            remotes[new_user].peer.onnegotiationneeded = function (ev) {
                console.log(`count=${remotes[new_user].count}`);

                if (remotes[new_user].peer.signalingState == "new" || remotes[new_user].peer.signalingState == "stable") {
                    console.log(`signalingState=${remotes[new_user].peer.signalingState}`);
                    // ---------- LOG to server -------------------
                    LOG({
                        func: "onnegotiationneeded",
                        text: `signalingState=${remotes[new_user].peer.signalingState}`
                    })

                    remotes[new_user].peer.createOffer()
                        .then(function (offer) {
                            console.log(`onnegotiationneeded: setLocalDescription`);
                            const local_sdp = new RTCSessionDescription(offer);
                            return remotes[new_user].peer.setLocalDescription(local_sdp);
                        })
                        .then(function () {
                            console.log(`offer emit to=${new_user}`);

                            socketio.emit("publish", JSON.stringify(
                                {
                                    type: "offer",
                                    dest: new_user,
                                    src: local_id,
                                    sdp: remotes[new_user].peer.localDescription
                                })
                            );
                        })
                        .catch(function (err) {
                            console.log(`count=${remotes[new_user].count}`)
                            console.log(`onnegotiationneeded: ${err}`);
                        })

                }
            }

            remotes[new_user].obj.on("click", function () {

                // ロードスピナーを表示
                remotes[new_user].obj.$spiner.style.display = "inline-block";

                if (tv_conf_mode) {
                    remotes[new_user].video_sender = remotes[new_user].peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
                    remotes[new_user].audio_sender = remotes[new_user].peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
                } else {

                    const stream = remotes[new_user].obj.$media.srcObject;
                    if (stream) {
                        stream.getTracks().forEach(function (track) { track.stop(); })
                        // stream_stop(stream);
                        remotes[new_user].obj.$media.play();
                    }
                    socketio.emit("publish", JSON.stringify(
                        {
                            type: "video_start",
                            dest: new_user,
                            src: local_id,
                        })
                    )
                }
            });

        }
    });

    cur_users.forEach(function (cur_user) {
        if (!Object.keys(data).includes(cur_user)) {
            console.log(`delete ${cur_user}`);
            remotes[cur_user].obj.delete();
            delete remotes[cur_user].peer;
            delete remotes[cur_user];
        }
    })
});

const start_video_to = function (remote) {
	
	if (remote.video_sender) {
		// 既に接続済みで
		if (remote.video_sender.track) {
			// trackがある場合には一旦削除して
			remote.peer.removeTrack(remote.video_sender)
		} else {
			remote.video_sender = remote.peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
		}
	} else {
		// 未接続の場合にはtrackの追加
		remote.video_sender = remote.peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
	}
}

const start_audio_to = function (remote) {
	
	if (remote.audio_sender) {
		// 既に接続済みで
		if (remote.audio_sender.track) {
			// trackがある場合には一旦削除して
			remote.peer.removeTrack(remote.audio_sender)
		} else {
			remote.audio_sender = remote.peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
		}
	} else {
		// 未接続の場合にはtrackの追加
		remote.audio_sender = remote.peer.addTrack(local_stream.getAuioTracks()[0], local_stream);
	}
}

socketio.on("publish", function (msg) {
    const data = JSON.parse(msg);

    if (data.dest == local_id) {
        if (data.type == "offer") {

            if (tv_conf_mode) {
                if (!remotes[data.src].video_sender) {
                    remotes[data.src].video_sender = remotes[data.src].peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
                }
                if (!remotes[data.src].audio_sender) {
                    remotes[data.src].audio_sender = remotes[data.src].peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
                }
            }

            const remote_sdp = new RTCSessionDescription(data.sdp);
            remotes[data.src].peer.setRemoteDescription(remote_sdp)
                .then(function () {
                    console.log(`socket_on offer: createAnswer`);
                    // ---------LOG to server-------------
                    socketio.emit("log", {
                        from: data.src,
                        to: local_id,
                        func: "createAnswer"
                    });

                    return remotes[data.src].peer.createAnswer();
                })
                .then(function (answer) {
                    console.log(`socket_on offer: setLocalDescription answer`);
                    // ---------LOG to server-------------
                    socketio.emit("log", {
                        from: data.src,
                        to: local_id,
                        func: "setLocalDescription answer"
                    });

                    const local_sdp = new RTCSessionDescription(answer);
                    return remotes[data.src].peer.setLocalDescription(local_sdp);
                })
                .then(function () {
                    socketio.emit("publish", JSON.stringify(
                        {
                            type: "answer",
                            dest: data.src,
                            src: local_id,
                            sdp: remotes[data.src].peer.localDescription
                        })
                    );
                })
                .catch(function (err) {
                    console.log(`signal: ${err}`)
                });
        } else if (data.type == "answer") {
            console.log(`setRemoteDescription`);
            // ---------LOG to server-------------
            socketio.emit("log", {
                id: local_id,
                func: "recive answer"
            });

            const remote_sdp = new RTCSessionDescription(data.sdp);
            remotes[data.src].peer.setRemoteDescription(remote_sdp)
        } else if (data.type == "candidate") {
            console.log(`addIceCandidate`);
            const candidate = new RTCIceCandidate(data.candidate);
            remotes[data.src].peer.addIceCandidate(candidate);
        } else if (data.type == "video_start") {
            //------------LOG to server-------------------
            socketio.emit("log", {
                id: local_id,
                func: "on video_start"
            });
            console.log("video_start");
			
			start_video_to(remotes[data.src]);
			//start_audio_to(remotes[data.src]);

/*
            if (remotes[data.src].video_sender) {
                if (remotes[data.src].video_sender.track) {
                    remotes[data.src].peer.removeTrack(remotes[data.src].video_sender);
                } else {
                    remotes[data.src].video_sender = remotes[data.src].peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
                }
            } else {
                remotes[data.src].video_sender = remotes[data.src].peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
            }

            if (remotes[data.src].audio_sender) {
                if (remotes[data.src].audio_sender.track) {
                    remotes[data.src].peer.removeTrack(remotes[data.src].audio_sender);
                } else {
                    remotes[data.src].audio_sender = remotes[data.src].peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
                }
            } else {
                remotes[data.src].audio_sender = remotes[data.src].peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
            }
*/

            /*
            if (remotes[data.src].video_sender) {
                if (remotes[data.src].video_sender.track) {
                    remotes[data.src].peer.removeTrack(remotes[data.src].video_sender);
                }
            }
            setTimeout(function () {
                remotes[data.src].video_sender = remotes[data.src].peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
            }, 500);

            if (remotes[data.src].audio_sender) {
                if (remotes[data.src].audio_sender.track) {
                    remotes[data.src].peer.removeTrack(remotes[data.src].audio_sender);
                }
            }
            setTimeout(function () {
                remotes[data.src].audio_sender = remotes[data.src].peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
            }, 500);
            */

        }
    }
})

init();