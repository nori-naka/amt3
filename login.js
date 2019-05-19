//----- for air-multi-talk
let myUid;
let first_flag = false;
let AudioContext = window.AudioContext || window.webkitAudioContext;

const login = function () {
    const $login_dialog = new Create_dialog(document.body, function (ev) {

        local_id = $login_dialog.get_value();
        $local_name.innerText = local_id;
        $local_name.style.display = "inline-block";

        //----- for air-multi-talk
        myUid = local_id;
        first_flag = true;
        audioCtx = new AudioContext();

    });
    $login_dialog.get_element().style.display = "block";
    return new Promise(function (resolve, rejects) {
        resolve();
    });
}