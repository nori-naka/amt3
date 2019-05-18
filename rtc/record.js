const options = {
    videoBitsPerSecond: 512000, // 512kbps
    mimeType: 'video/webm; codecs=vp9'
};


const Record = function ($video, $start_btn, $playback_video, $playback_btn) {
    const self = this;

    this.$video = $video;
    this.$start_btn = $start_btn;
    this.$playback_video = $playback_video;
    this.$playback_btn = $playback_btn;

    this.blobUrl = null;

    this.recorder = new MediaRecorder(this.$video.srcObject);
    this.recorder.ondataavailable = function (ev) {
        this.blobUrl = URL.createObjectURL(new Blob([ev.data], { type: "video/webm" }))

        let a = document.createElement("a");
        a.href = this.blobUrl;
        a.download = `${local_id}_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(this.blobUrl);
    }

    this.$start_btn.onclick = function (ev) {
        if (self.$start_btn.innerText == "REC") {
            self.recorder.start();
            self.$start_btn.innerText = "STOP";
        } else {
            self.recorder.stop();
            self.$start_btn.innerText = "REC";
        }
    }
}

Record.prototype.play = function () {

    // 既に使用済みであれば、一旦開放
    if (this.$playback_video.src) {
        window.URL.revokeObjectURL(this.$playback_video.src);
        this.$playback_video.src = null;
    }

    this.$playback_video.src = this.blobUrl;
    this.$playback_video.play();
}