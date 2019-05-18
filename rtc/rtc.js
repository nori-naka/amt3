const socketio = io.connect();

const $local_title = document.getElementById("local_title");
const $local_name = document.getElementById("local_name");
const $local_elm = document.getElementById("local_elm");
const $remote = document.getElementById("remote");
const remotes = {};
let local_id = null;
let local_stream = null;
// let audioCtx;
let local_level_meter;

let i_send_hello = false;
let i_recive_hello = false;
let i_recive_vedio_start = false;

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

// let constraints = {
//     audio: true,
//     video: true
// }


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

const init = function () {
    local_video_start();

    $local_title.addEventListener("click", function (ev) {
        if ($local_elm.style.display == "block") {
            $local_elm.style.display = "none";
        } else {
            $local_elm.style.display = "block";
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
            LOG({ func: "gMU", text: `${err}` });
        });
}

const Create_elm = function (name, parent, a_class) {
    const self = this;

    this.$remote_user = document.createElement("div");
    this.$remote_user.innerHTML = `<div id="${name}_user_title" class="user_title">
            <div id="${name}_name" class="text">${name}</div>
            <span id="${name}_spiner" class="dot-spin" style="display:none, left:30px"></span>
            <canvas id="${name}_level_meter" class="level_meter"></canvas>
        </div>
        <div class="media_box">
            <video id="${name}_media" class="video" style="display:none" playsinline muted></video>
            <div id="${name}_record_btn" class="raised_red" style="display:none">REC</div>
        </div>
        <audio id="${name}_audio" style="display:none"></audio>`;

    parent.appendChild(this.$remote_user);

    this.$user_title = document.getElementById(`${name}_user_title`);
    this.$name = document.getElementById(`${name}_name`);
    this.$spiner = document.getElementById(`${name}_spiner`);
    this.$record_btn = document.getElementById(`${name}_record_btn`);
    this.$canvas = document.getElementById(`${name}_level_meter`);
    this.$media = document.getElementById(`${name}_media`);
    this.$a_media = document.getElementById(`${name}_a_media`);
    this.$audio = document.getElementById(`${name}_audio`);
}

Create_elm.prototype.get_elm = function () {
    return this.$remote_user;
}

Create_elm.prototype.show = function (ev) {
    if (ev.track.kind == "video") {
        this.$media.srcObject = ev.streams[0];
        this.$media.style.display = "block";
        this.$media.play();

        this.record = new Record(this.$media, this.$record_btn, this.$a_media);
        this.$record_btn.style.display = "block";

        // ロードスピナーを消す
        this.$spiner.style.display = "none";
    }
    this.$audio.srcObject = ev.streams[0];
    this.$audio.play();

    this.remote_level_meter = new Audio_meter(ev.streams[0], this.$canvas, "#2d8fdd");
}

Create_elm.prototype.delete = function () {
    while (this.$remote_user.firstChild) {
        this.$remote_user.removeChild(this.$remote_user.firstChild);
    }
    //$remote.removeChild(this.$remote_user);
}

Create_elm.prototype.on = function (event, handler) {
    this.$user_title.addEventListener(event, handler);
}

socketio.on("renew", function (msg) {
    //console.log(`renew=${msg}`)
    const data = JSON.parse(msg);

    if (!local_id) return;
    if (!local_stream) return;

    const cur_users = Object.keys(remotes)

    Object.keys(data).forEach(function (new_user) {
        if (!cur_users.includes(new_user) && new_user != local_id) {

            new Promise(function (resolve, reject) {
                remotes[new_user] = {};
                remotes[new_user].obj = new Create_elm(new_user, $remote, "");

                resolve();
            }).then(function () {
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
                // 初期化時
                LOG({
                    func: "onsignalingstatechange　-- initial",
                    text: remotes[new_user].peer.signalingState
                });

                remotes[new_user].peer.onicecandidate = on_icecandidate(new_user);
                remotes[new_user].peer.ontrack = on_track(new_user);
                remotes[new_user].peer.onsignalingstatechange = on_signalingstatechange(new_user);
                remotes[new_user].peer.onnegotiationneeded = on_negotiationneeded(new_user);
                remotes[new_user].obj.$user_title.onclick = on_click(new_user);

				if (!i_recive_hello) {
					socketio.emit("publish", JSON.stringify(
						{
							type: "hello",
							dest: new_user,
							src: local_id,
						})
                	);
					i_send_hello = true;
				}

            })
        }
    });

    cur_users.forEach(function (cur_user) {
        if (!Object.keys(data).includes(cur_user)) {
            delete_remote(cur_user);
        }
    })
});


const start_video_to = function (remote) {
    if (remote.video_sender) {
        // 既に接続済みで
        if (remote.video_sender.track) {
            // trackがある場合には一旦削除して
            remote.peer.removeTrack(remote.video_sender)
        }
        delete remote.video_sender;
    }
    remote.video_sender = remote.peer.addTrack(local_stream.getVideoTracks()[0], local_stream);
}

const stop_video_to = function (remote) {
    if (remote.video_sender) {
        remote.peer.removeTrack(remote.video_sender)
    }
    delete remote.video_sender;
}

const start_audio_to = function (remote) {
    if (!remote.audio_sender) {
        // 未接続の場合にはtrackの追加
        remote.audio_sender = remote.peer.addTrack(local_stream.getAudioTracks()[0], local_stream);
    }
}

socketio.on("publish", function (msg) {
    const data = JSON.parse(msg);

    LOG({ func: "on publish", text: `from ${data.src} -> to ${data.dest} : ${data.type}` });
    console.log(`on publish  from ${data.src} -> to ${data.dest} : ${data.type}`);


    if (!local_id || !remotes[data.src]) {

        if (data.type == "hello") return;

    } else if (data.dest == local_id) {
        if (data.type == "hello") {
			i_recive_hello = true;
			if (i_send_hello && data.src > local_id) return;
			
            socketio.emit("publish", JSON.stringify(
                {
                    type: "hello-hello",
                    dest: data.src,
                    src: local_id,
                })
            );

        } else if (data.type == "hello-hello") {
			i_recive_hello = false;
			i_send_hello = false;

            if (remotes[data.src] && !remotes[data.src].audio_sender) {
                if (remotes[data.src].peer.signalingState == "stable") {
                    remotes[data.src].obj.$name.style.color = "green";
                    start_audio_to(remotes[data.src]);
                }
            }

        } else if (data.type == "offer") {
			i_recive_hello = false;
			i_recive_vedio_start = false;
			i_send_hello = false;
			
            const remote_sdp = new RTCSessionDescription(data.sdp);
            remotes[data.src].peer.setRemoteDescription(remote_sdp)
                .then(function () {

                    remotes[data.src].obj.$name.style.color = "green";
                    start_audio_to(remotes[data.src]);

                    console.log(`socket_on offer: createAnswer`);
                    LOG({ func: "offer", text: "createAnswer" });

                    return remotes[data.src].peer.createAnswer();
                })
                .then(function (answer) {
                    console.log(`socket_on offer: setLocalDescription answer`);
                    LOG({ func: "offer", text: "setLocalDescription" });

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
                    console.log(`signal: ${err} delete user: ${data.src}`);
                    LOG({ func: "offer", text: `err=${err}` });

                });
        } else if (data.type == "answer") {

            const remote_sdp = new RTCSessionDescription(data.sdp);
            remotes[data.src].peer.setRemoteDescription(remote_sdp)

        } else if (data.type == "candidate") {

            const candidate = new RTCIceCandidate(data.candidate);
            remotes[data.src].peer.addIceCandidate(candidate);

        } else if (data.type == "video_start") {
			i_recive_vedio_start = true;
            start_video_to(remotes[data.src]);

        } else if (data.type == "video_stop") {
            stop_video_to(remotes[data.src]);

        }
    }
})

function on_click(new_user) {
	if (i_recive_vedio_start) return;
	
    return function (ev) {
        remotes[new_user].obj.$spiner.style.display = "inline-block";
        const stream = remotes[new_user].obj.$media.srcObject;
        if (stream) {
            tracks = stream.getVideoTracks();
            if (tracks.length == 0) {
                // 接続数が０の場合(切断状態)
                socketio.emit("publish", JSON.stringify({
                    type: "video_start",
                    dest: new_user,
                    src: local_id,
                }));
            }
            else {
                // もし、既に接続があった場合、切断
                tracks.forEach(function (track) { track.stop(); });
                socketio.emit("publish", JSON.stringify({
                    type: "video_stop",
                    dest: new_user,
                    src: local_id,
                }));
                remotes[new_user].obj.$spiner.style.display = "none";
                remotes[new_user].obj.$media.style.display = "none";
                remotes[new_user].obj.$record_btn.style.display = "none";
            }
        }
        else {
            // 接続がなければ、video_startを送信する。
            // remotes[new_user].obj.$media.play();
            socketio.emit("publish", JSON.stringify({
                type: "video_start",
                dest: new_user,
                src: local_id,
            }));
        }
    };
}

function on_negotiationneeded(new_user) {
    return function (ev) {
        console.log(`count=${remotes[new_user].count}`);
        if (remotes[new_user].peer.signalingState == "stable") {
            console.log(`signalingState=${remotes[new_user].peer.signalingState}`);
            // ---------- LOG to server -------------------
            LOG({
                func: "onnegotiationneeded",
                text: `signalingState=${remotes[new_user].peer.signalingState}`
            });
            remotes[new_user].peer.createOffer()
                .then(function (offer) {
                    console.log(`onnegotiationneeded: setLocalDescription`);
                    const local_sdp = new RTCSessionDescription(offer);
                    return remotes[new_user].peer.setLocalDescription(local_sdp);
                })
                .then(function () {
                    console.log(`offer emit to=${new_user}`);
                    socketio.emit("publish", JSON.stringify({
                        type: "offer",
                        dest: new_user,
                        src: local_id,
                        sdp: remotes[new_user].peer.localDescription
                    }));
                })
                .catch(function (err) {
                    console.log(`count=${remotes[new_user].count}`);
                    console.log(`onnegotiationneeded: ${err} delete remote: ${new_user}`);
                    delete_remote(new_user);
                });
        }
    };
}

function on_signalingstatechange(new_user) {
    return function (ev) {
        LOG({
            func: "onsignalingstatechange",
            text: remotes[new_user].peer.signalingState
        });
    };
}

function on_track(new_user) {
    return function (ev) {
        if (!local_id) return;

        console.log(`ontrack ev=${JSON.stringify(ev)}`);
        if (ev.streams && ev.streams[0]) {
            remotes[new_user].obj.show(ev);
            console.log(`from ${new_user} ontrack ev=${JSON.stringify(ev.streams[0])}`);
            LOG({
                func: "ontrack",
                text: `from ${new_user} ontrack ev=${JSON.stringify(ev.streams[0])}`
            });
        }
    };
}

function on_icecandidate(new_user) {
    return function (ev) {
        console.log(`onicecandidate:ev=${JSON.stringify(ev)}`);
        if (ev.candidate) {
            socketio.emit("publish", JSON.stringify({
                type: "candidate",
                dest: new_user,
                src: local_id,
                candidate: ev.candidate
            }));
        }
    };
}

function delete_remote(remote_id) {
    console.log(`${arguments.callee.name}: delete ${remote_id}`);
    remotes[remote_id].obj.delete();
    delete remotes[remote_id].peer;
    delete remotes[remote_id];
}

init();
