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

    this.chunks = []; // 録画データを保持する
    this.blobUrl = null;

    this.$start_btn.onclick = function (click_event) {
        if (self.$start_btn.innerText == "REC") {
            self.recorder = new MediaRecorder(self.$video.srcObject, options);
            self.recorder.ondataavailable = function (ev) {
                self.chunks.push(ev.data);
            }
            self.recorder.start(1000); // 1000ms period
            self.$start_btn.innerText = "STOP";
        } else {
            self.stop();
            self.$start_btn.innerText = "REC";
        }
        // click_event.preventDefault();
    };
}

Record.prototype.start = function () {
    LOG({ func: `Record start`, text: `${this.recorder.state}` });
    console.log(`Record start : ${this.recorder.state}`);
    this.recorder.ondataavailable = function (ev) {
        self.chunks.push(ev.data);
    };
    this.recorder.start(1000); // 1000ms period
}

Record.prototype.stop = function () {
    LOG({ func: `Record stop`, text: `${this.recorder.state}` });
    console.log(`Record stop : ${this.recorder.state}`);

    this.recorder.stop();

    this.blobUrl = window.URL.createObjectURL(new Blob(this.chunks, { type: "video/webm" }));
    this.chunks = [];

    let a = document.createElement("a");
    a.href = this.blobUrl;
    a.download = `video_${Date.now()}.webm`;
    a.click();
    window.URL.revokeObjectURL(this.blobUrl);
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