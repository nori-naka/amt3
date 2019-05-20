//-----------------------------------------------------
// 機能レイヤ側は必ず、名前空間の分離をお願いします。
// ルールとしては、
// ファイル名をオブジェクトとして、そのオブジェクトに
// 各種変数等をすべて収容する。

var BETU_layer = BETU_layer || {};
//START module
//------------------------------------------------------

BETU_layer.coordinate;
BETU_layer.vec_layer;
BETU_layer.vec_source;
BETU_layer.detail_text;

BETU_layer.start_time = new Date().getTime();
BETU_layer.log = function (text) {
    const now_time = new Date().getTime()
    console.log(`[${now_time - BETU_layer.start_time} ms] ${text}`);
}

//-------------------------------------------------------
// 機能レイヤでは以下の関数を実装する
// add()         :その機能レイヤをmapオブジェクト上で稼働させるために
//                必要となるlayer,source,featureの登録を行う。
//                そして稼働開始を行う。
// setOpacity(v) :その機能レイヤの透過度を設定する。
// remove()      :その機能レイヤ自体をmapオブジェクトから削除する
//

BETU_layer.icon_features = [];
BETU_layer.add = function () {
    if (map) {
        //BETU_layer.vec_source = new ol.source.Vector({ features: [] });
        BETU_layer.vec_layer = new ol.layer.Vector({
            source: new ol.source.Vector({ features: [] })
        });
        setInterval(set_icon, 5000);
    }
}

function set_icon() {
    BETU_layer.log("henjyo_stok.json");
    $.ajax({
        url: '/BETU_layer/henjyo_stok.back.json',
        type: 'GET'
    }).done(function (data) {
        BETU_layer.log("henjyo_stok.json GET");
        BETU_layer.get_data(data).then(() => {
            BETU_layer.vec_layer.getSource().clear();
            BETU_layer.vec_layer.getSource().addFeatures(BETU_layer.icon_features);
            BETU_layer.log("henjyo_stok.json addFeature");
            map.addLayer(BETU_layer.vec_layer);
            BETU_layer.log("henjyo_stok.json addLayer");
            map.addOverlay(BETU_layer.pop);
            BETU_layer.log("henjyo_stok.json addOverlayer");
            /*
            setTimeout(function(){
                map.addLayer(BETU_layer.vec_layer);
                map.addOverlay(BETU_layer.pop);
            }, 5000);
            */
        }).catch((err) => {
            console.log(err);
        });
    });
}


BETU_layer.setOpacity = function (v) {
    BETU_layer.vec_layer.setOpacity(v);
}

BETU_layer.remove = function () {
    map.removeLayer(BETU_layer.vec_layer);
}
//-------------------------------------------------------------
// 
//
// sidebox_showに直接HTMLの文字列を入れる場合。
// BETU_layer.show_detail = function(){
//     sidebox_show(BETU_layer.detail_text);
// }
//
// sidebox_showにHTML要素を入れる場合。
// 表示したいHTML要素を作成して、本体側のsidebox_showに渡します。
// 右上の「✕」を押して、非表示化出来ますが、
// sidebox_closeにて非表示化にします。
// 何らかのアクション後、そのまま非表示化する時にsidebox_closeを呼んで下さい。

//------------------------------------------------------------
// メニュー
//------------------------------------------------------------
// 詳細情報
BETU_layer.elm = $("<div></div>").append('<p>詳細').append('<p>詳細').append('<p>詳細');
BETU_layer.elm.append($('<button></button', {
    text: "更新して閉じる",
    on: {
        click: function (e) {
            alert("更新して閉じる例です。\n実際には何もしていません。")
            BETU_layer.close_detail();
        }
    }
}));


BETU_layer.show_menu = function () {
    $.ajax({
        url: '/BETU_layer/michi_menu.txt',
        type: 'GET',
    }).done(function (data) {
        sidebox_show(data);
    });
}

BETU_layer.go_edit_php = function () {
    $.ajax({
        //url: 'https://www.google.com',
        //url: 'http://182.171.89.234:8081/smapho_junkai/edit.php',
        //url: 'http://localhost:8080/edit.php',
        url: '/BETU_layer/edit_php.txt',
        type: 'GET',
    }).done(function (data) {
        sidebox_show(data);
    })
};

BETU_layer.show_detail = function () {
    sidebox_show(BETU_layer.elm);
}
BETU_layer.close_detail = function () {
    sidebox_close();
}

//-------------------------------------------------------------
// 本体側に追加するメニュー
// 
BETU_layer.menu = {
    click: BETU_layer.show_menu,
    icon: '/1x/menu_car@1x.png'
}
main_menu.app.menu.BETU_layer_menu = BETU_layer.menu;

//-------------------------------------------------------------
// Overlay
// 下記の例はpopupの登録を行います。
// 基本的に、Overlay,interation,control等のOpenlayers由来の機能を
// 使用する場合には、それぞれの機能レイヤにて登録してください。
//
BETU_layer.pop_elm = document.createElement('div');
BETU_layer.pop_elm.style.marginTop = "0";
BETU_layer.pop_elm.style.marginBottom = "1em";
BETU_layer.pop_elm.className = "balloon1";

BETU_layer.pop = new ol.Overlay({
    element: BETU_layer.pop_elm,
    positioning: 'bottom-center',
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    },
});
//BETU_layer.pop.setVisible(false);

//--------------------------------------------------------------
// popup_show  : 本体側でpopupのOverlayを表示する。
// popup_hidden: 本体側でpopupのOverlayを非表示にする。
// このpopup_showとpopup_hiddenは対象となるfeatureオブジェクトに
// feature.__$do_func__, feature.__$undo_func__として埋め込み、
// 本体側のmapのイベント処理として
// 対象featureにclickが発火した際に__$do_func__が呼ばれ、
// clickが発火したが対象featureが無い場合に__$undo_func__が呼ばれます。
//
BETU_layer.popup_show = function (e, HTMLElementStr) {
    BETU_layer.pop_elm.innerHTML = HTMLElementStr;
    BETU_layer.pop.setPosition(e.coordinate);
    //BETU_layer.pop.setVisible(true);
    console.log(JSON.stringify(e.coordinate));
}
BETU_layer.popup_hidden = function () {
    //BETU_layer.pop.setVisible(false);
    BETU_layer.pop.setPosition(undefined);
}

//-------------------------------------------------------------
// layerの作成
// 下記の例では非同期通信（req_data)のレスポンスを受けて、
// get_dataがコールバックされて、レスポンスの内容でfeatureを作成し、
// その後、source、layerの順で作成されています。
// このfeatureの作成時に本体側イベントで呼び出される関数を埋めています。

BETU_layer.get_data = function (s) {
    return new Promise(function (resolve, reject) {
        //var arr = s.split(/}\s*,\s*{/);
        var arr = JSON.parse(s);
        arr.forEach(function (data) {
            //var data = JSON.parse(v);
            coordinate = ol.proj.transform([parseFloat(data.経度情報), parseFloat(data.緯度情報)], "EPSG:4326", "EPSG:3857")
            var icon_feature = new ol.Feature({
                geometry: new ol.geom.Point(coordinate),
                name: JSON.stringify(data)
            });
            icon_feature.setStyle(new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 1],
                    opacity: 1.0,
                    scale: 1.0,
                    src: '/BETU_layer/marker-icon64.png'
                })
            }));
            BETU_layer.detail_text = data.detail_text;
            //----------------------------------------------------
            // 作成したfeatureに__$do_func__と__$undo_func__を
            // 埋め込みます。
            //
            icon_feature.__$do_func__ = function (e) {
                var res = "";

                // var items = icon_feature.getProperties().name.slice(2, -2).split(",");
                console.log(`name=${icon_feature.getProperties().name}`)
                console.dir(JSON.parse(icon_feature.getProperties().name))

                let data = JSON.parse(icon_feature.getProperties().name);
                Object.keys(data).forEach(function (key) {
                    if (key == 'video') {
                        res = res + `<div class="user">
                        <video src="${data[key]}" controls class="video"></video>
                        </div>`
                    } else {
                        res = res + `${key} : ${data[key]}<br>`;
                    }
                })
                console.log(`res=${res}`);

                // items.forEach((s) => {
                //     res = res + s.replace(/"/g, '') + "<br>"
                // });
                BETU_layer.popup_show(e, res);
            };
            icon_feature.__$undo_func__ = function () {
                BETU_layer.popup_hidden();
            }
            BETU_layer.icon_features.push(icon_feature);
        });
        resolve();
    });
};

//------------------------------------------------------
BETU_layer.__$map_on_click__ = function (e) {
    BETU_layer.popup_show(e, e.coordinate);
}

//------------------------------------------------------

//END module