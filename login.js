//----- for air-multi-talk
let myUid;
// let audioCtx;

// const initAudioContext = function () {
//     document.removeEventListener('touchstart', initAudioContext);

//     // wake up AudioContext
//     audioCtx = new (window.AudioContext || window.webkitAudioContext)();

//     const emptySource = audioCtx.createBufferSource();
//     emptySource.start();
//     emptySource.stop();
// }

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const request = new XMLHttpRequest();
const url = './sirent.ogg';
request.open('GET', url, true);
request.responseType = 'arraybuffer';
request.onload = () => {
    audioCtx.decodeAudioData(request.response, (audioBuffer) => {
        const audioSource = audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioCtx.destination);
        audioSource.start();
    });
}
request.send();

document.addEventListener('touchstart', initAudioContext);
function initAudioContext() {
    document.removeEventListener('touchstart', initAudioContext);
    // wake up AudioContext
    audioCtx.createBufferSource().start();
}

const login = function () {
    const $login_dialog = new Create_dialog(document.body, function (ev) {

        local_id = $login_dialog.get_value();
        $local_name.innerText = local_id;
        $local_name.style.display = "inline-block";

        //----- for air-multi-talk
        myUid = local_id;
    });
    $login_dialog.get_element().style.display = "block";
    return new Promise(function (resolve, rejects) {
        resolve();
    });
}