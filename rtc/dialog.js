/*
const $login_dialog = document.getElementById('myModal');
const $btn_close = document.getElementById("btn_close");
const $local_id = document.getElementById("local_id");

$btn_close.onclick = function () {
    $login_dialog.style.display = "none";
}
*/

const Create_dialog = function (parent, a_func) {

    const self = this;

    this.elm = document.createElement('div');
    this.elm.innerHTML = `<div class="modal-content">
            <span class="close" id="btn_close">&times;</span>
            <p>LOGIN</p>
            <div id="msg"></div>
            <input id="input" type="text" class="text" style="width:80%"></input>
            <div style="width:100%;">
                <div id="btn_OK" style="right:0px" class="raised">OK</div>
            </div>
        </div>`;

    this.elm.classList.add('modal');
    parent.appendChild(this.elm);

    this.btn_OK = document.getElementById("btn_OK");
    this.btn_OK.addEventListener("click", function (ev) {
        a_func(ev);
        self.elm.style.display = "none";
    });

    this.input_text = document.getElementById("input");

}

Create_dialog.prototype.get_element = function () {
    return this.elm;
}

Create_dialog.prototype.get_value = function () {
    return this.input_text.value;
}

Create_dialog.prototype.show = function () {
    this.elm.style.display = "block";
}
