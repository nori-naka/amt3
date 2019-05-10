//----- for air-multi-talk
let myUid;

const login = function () {
    const $login_dialog = new Create_dialog(document.body);
    $login_dialog.on_click(function (ev) {

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