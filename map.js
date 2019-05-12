var map;
var mapView;
//var users;
const zoomVal = 14;
const mapCenterCoord = [140.034635, 35.648209]; //幕張メッセ イベントホール

var commuDialogTimerId = null;

var myCamera = false;

var nowcastLayer;
var weatherLayer;
var isoLayer;
var frontLayer;
var typhoonLayer;
var typhoonTileLayer;
var iconLayer;
var drawLayer;
var drawLayerSource;
var freeEraseLayer;
var hazerdMapLayer;

var freeDraw = null;

const buttonBlue = "#38a2c0";
const buttonRed = "#c03838";
const buttonGray = "#bebebe";

var writeMode = false;
var colorMode = false;
var colorChangeEnable = true;
var drawLineColor;
var sizeMode = false;
//var drawLineWidth = 3;
var drawLineWidth = 7;
var eraseMode = false;

refreshSecond = 600;        //ナウキャスト、天気図、台風を更新する間隔（秒）

// クライアントが送信するデータ
// let position = {
//     id: uid,
//     lat: null,
//     lng: null,
//     cam: myCamera,
//     constraints: constraints,
// };

// サーバがクライアントに返すデータ
// let users = {
//     user_id1: {
//         ttl: ttl,
//         lng: lng,
//         lat: lat,
//     },
//     user_id2: {
//         ttl: ttl,
//         lng: lng,
//         lat: lat,
//     },
// }
let users = {};


// "ID:[Type, Lon, Lat]"
// Type { 1:人、2:車 }
// Lat, Lon { null:GPSを使用、数値:入力した緯度経度固定 }
// ここにないIDの場合は [0, null, null] で動作
specials = {
    "ControlCenter": [1, 140.034635, 35.648209], //幕張メッセ イベントホール
    "SmartPhone1": [1, 140.041966, 35.648417], //海浜幕張駅
    "SmartPhone2": [1, 139.883557, 35.636065], //舞浜駅
    "SmartPhone3": [1, 139.860296, 35.642245], //葛西臨海公園
    "Tablet1": [1, 140.030909, 35.64524],  //ZOZOマリンスタジアム
}

function showMap() {

    // メインレイヤー
    mainMapLayer = new ol.layer.Tile({
        /*
        source: new ol.source.XYZ({
            //url: 'https://mt1.google.com/vt/lyrs=m@113&hl=en&&x={x}&y={y}&z={z}&hl=ja&gl=JP'
            //url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
            //url: 'https://tile.openstreetmap.jp/{z}/{x}/{y}.png',
            //url: 'https://localhost:10443/OpenStreetMap/{z}/{x}/{y}.png'
            url: '/OpenStreetMap/{z}/{x}/{y}.png',
            attributions: [new ol.Attribution({
                //html: '&copy;OpenStreetMap contributors.',
                html: '&copy;<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.',
                left: "50px"
            })]
        }),
        */
        source: new ol.source.OSM(),
        opacity: 1,
        visible: true,
    });

    // アイコンレイヤー
    var iconMapStyleFunction = function (feature) {
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    //src: feature.get("sel") ? "pic/map/location_circle@0,5x.png" : "pic/map/location_people@0,5x.png",
                    src: getLocationIcon(feature.get("location")),
                    scale: 1.0,
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#ff0000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 13,
                    text: feature.get("id"),
                    font: "bold 15px Courier New, monospace"
                })
            })
        ];
        return style;
    };
    var iconFeatures = [];
    //setUsersIcon(users, iconFeatures);
    Object.keys(users).forEach(function (userId) {
        const iconPoint = (new ol.geom.Point([users[userId].lng, users[userId].lat])).transform('EPSG:4326', 'EPSG:3857');
        iconFeatures.push(new ol.Feature({
            geometry: iconPoint,
            name: "icon",
            id: userId,
            //sel: userId == myUid ? true : false,
            location: getLocation(userId),
        }));
    });
    var iconSource = new ol.source.Vector({
        features: iconFeatures
    });
    iconLayer = new ol.layer.Vector({
        source: iconSource,
        style: iconMapStyleFunction,
        opacity: 1,
        visible: true,
    });

    //ナウキャスト
    nowcastLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/direction_raster.php",
            params: {
                LAYERS: "area_02",
                TRANSPARENT: true,
                FORMAT: "image/png",
                KIND: "nowcast_hi",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
            },
            visibility: true,
        })
    })

    // 天気図レイヤー
    var weatherMapStyleFunction = function (feature) {
        let angle = feature.get("direction");
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("icon"),
                    //scale: 0.6,
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetX: angle < 180 ? -30 : 30,
                    offsetY: -5,
                    text: feature.get("label"),
                    font: "bold 15px Courier New, monospace"
                })
            }),
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("direction_icon"),
                    //scale: 0.6,
                    anchor: [0.5, 1.6],
                    rotation: Math.PI * angle / 180
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 90 < angle && angle < 270 ? -25 : 15,
                    text: feature.get("direction_label"),
                    font: "bold 15px Courier New, monospace"
                })
            }),
        ];
        return style;
    };
    var weatherFeatures = [];
    var weatherSource = new ol.source.Vector({
        features: weatherFeatures
    });
    weatherLayer = new ol.layer.Vector({
        source: weatherSource,
        style: weatherMapStyleFunction,
        opacity: 1.0,
        visible: true,
    });

    //等圧線
    isoLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/weather.php",
            params: {
                LAYERS: "isobar",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
                //'_' : (new Date).getTime(),
            },
            visibility: true,
        })
    })

    //前線
    frontLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/weather.php",
            params: {
                LAYERS: "front",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                tm: new Date().getMilliseconds(),
                //'_' : (new Date).getTime(),
            },
            visibility: true,
        })
    })


    // 台風ベクタ
    var typhoonMapStyleFunction = function (feature) {
        var style = [
            new ol.style.Style({
                image: new ol.style.Icon({
                    src: feature.get("icon"),
                    anchor: [0.5, 0.5]
                }),
                text: new ol.style.Text({
                    fill: new ol.style.Fill({ color: "#000000" }),
                    stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }),
                    //scale: 1.6,
                    textAlign: "center",
                    textBaseline: "top",
                    offsetY: 15,
                    text: feature.get("label"),
                    font: "bold 15px Courier New, monospace"
                })
            })
        ];
        return style;
    };
    var typhoonFeatures = [];
    var typhoonSource = new ol.source.Vector({
        features: typhoonFeatures
    });
    typhoonLayer = new ol.layer.Vector({
        source: typhoonSource,
        style: typhoonMapStyleFunction,
        opacity: 1.0,
        visible: true,
    });

    //台風タイル
    typhoonTileLayer = new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: "https://wms.jmarinecloud.com/ms4w/htdocs/typhoon.php",
            params: {
                LAYERS: "typhoon_forecast_circle,typhoon_forecast_line,typhoon_track,typhoon_gale_now,typhoon_wind_now,typhoon_forecast_area,data_forecast_point,typhoon_stm_area",
                TRANSPARENT: true,
                FORMAT: "image/png",
                VERSION: "1.1.1",
                //'_' : (new Date).getTime(),
                TIME: 24,
                COUNT: 2,
                tm: new Date().getMilliseconds(),
            },
            visibility: true,
        })
    })

    //
    hazerdMapLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_kuni_data/{z}/{x}/{y}.png'
        }),
        opacity: 1,
        visible: false
    });

    //手書きレイヤー
    initDrawLayer();

    //消去用レイヤー
    initFreeEraseLayer();

    // viewを生成する
    mapView = new ol.View({
        projection: "EPSG:3857",
        center: ol.proj.transform(mapCenterCoord, "EPSG:4326", "EPSG:3857"),
        zoom: zoomVal
    });

    // mapを生成する
    map = new ol.Map({
        target: 'map',
        layers:
            [
                mainMapLayer,
                hazerdMapLayer,
                nowcastLayer,
                isoLayer,
                frontLayer,
                typhoonTileLayer,
                iconLayer,
                weatherLayer,
                typhoonLayer,
                drawLayer,
                freeEraseLayer
            ],
        view: mapView,
        controls: ol.control.defaults({
            zoom: false,
            attribution: true,
            attributionOptions: /** @type {ol.control.ScaleLineUnits} */ ({
                collapsible: true,
                left: "30px"
            }),
            rotate: false
        }),
        //.extend([new ol.control.ScaleLine()])
        interactions:
            ol.interaction.defaults({
                altShiftDragRotate: false,
                pinchRotate: false
            })
    });

    //setWeatherFeatures();
    readWeatherIcon("pressure");
    readWeatherIcon("typhoon");

    // ol.interaction.Draw の追加
    initDraw();
    initFreeErase();

    map.on("click", function (e) {

        if (eraseMode) {
            eraseNearest(e.coordinate);
            return;
        }
        if (sizeMode) {
            sizeBtnEnd();
            return;
        }

        let iconClick = false;
        map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
            if (feature.get("name") == "icon" && feature.get("id") != myUid) {

                iconClick = true;
                let x = e.pixel[0] - 60;
                let y = e.pixel[1] - 160;
                if (y < 0) {
                    y += 190;
                    $("#commuDialogBody").removeClass("commuDialogBody1").removeClass("commuDialogBody2").addClass("commuDialogBody2");
                } else {
                    $("#commuDialogBody").removeClass("commuDialogBody1").removeClass("commuDialogBody2").addClass("commuDialogBody1");
                }
                if (y + 120 >= screen.width) {
                    y = screen.width - 120;
                }
                $("#commuName>span").text(feature.get("id"));
                $("#commuDialog").show().offset({ left: x, top: y });

                let dest = feature.get("id");
                if (!users[dest] || !users[dest].cam) {
                    $("div#commuNg").show();
                    $("button#commuStart").prop("disabled", true);
                    $("button#commuEnd").prop("disabled", true);


                } else if (remote_peers[dest] && remote_peers[dest].myActive) {
                    $("div#commuNg").hide();
                    $("button#commuStart").prop("disabled", true);
                    $("button#commuEnd").prop("disabled", false);
                } else {
                    $("div#commuNg").hide();
                    $("button#commuStart").prop("disabled", false);
                    $("button#commuEnd").prop("disabled", true);
                }

                const $commuStart = $("#commuStart");
                $commuStart.off();
                $commuStart.on("click", function () {
                    const dest = feature.get("id");
                    watchStart(dest);

                    clearTimeout(commuDialogTimerId);
                    commuDialogTimerId = null;
                    $("#commuDialog").hide();
                });

                const $commuEnd = $("#commuEnd");
                $commuEnd.off();
                $commuEnd.on("click", function () {
                    const dest = feature.get("id");
                    watchEnd(dest);

                    clearTimeout(commuDialogTimerId);
                    commuDialogTimerId = null;
                    $("#commuDialog").hide();
                });

                commuDialogTimerId = setTimeout(function () {
                    commuDialogTimerId = null;
                    $("#commuDialog").hide();
                }, 5000);
            }
            else if (feature.__$do_func__ != null) {
                feature.__$do_func__(e);
                undo_func = feature.__$undo_func__;
            }
        });
        if (iconClick != true && commuDialogTimerId != null) {
            clearTimeout(commuDialogTimerId);
            commuDialogTimerId = null;
            $("#commuDialog").hide();
        }
    });

    let drawX;
    let drawY;

    map.on("pointerdrag", function (e) {
        if (eraseMode) {
            // const coords = ol.proj.toLonLat(e.coordinate);
            // const lon = coords[0];
            // const lat = coords[1];
            // const x = e.pixel[0];
            // const y = e.pixel[1];
            //console.log("pointerdrag lon=" + lon + ", lat=" + lat + ", x=" + x + ", y=", y);
            eraseNearest(e.coordinate);
            //return false;
        } else if (writeMode) {
            // if (multiTouch) {
            //     return false;
            // }
            const x = e.pixel[0];
            const y = e.pixel[1];
            if (drawStartFlag) {
                drawX = e.pixel[0];
                drawY = e.pixel[1];
                drawStartFlag = false;
            } else {
                const xDiff = e.pixel[0] - drawX;
                const yDiff = e.pixel[1] - drawY;
                if (multiTouch && Math.sqrt(xDiff * xDiff + yDiff * yDiff) > 50) {
                    return false;
                } else {
                    drawX = e.pixel[0];
                    drawY = e.pixel[1];
                }
            }
        }
    });

    setInterval(function () {
        if (nowcastLayer.getVisible()) {
            refreshNowcast();
        }
        if (weatherLayer.getVisible()) {
            refreshWeather();
        }
        if (typhoonLayer.getVisible()) {
            refreshTyhoon();
        }
    }, refreshSecond * 1000);
}

function getLocation(userId) {
    if (userId == myUid)
        return 0;
    else if (userId in specials)
        return specials[userId][0];
    else
        return 1;
}

function getLocationIcon(location) {
    if (location == 0)
        return "pic/map/location_circle@0,5x.png";
    else if (location == 1)
        return "pic/map/location_people@0,5x.png";
    else if (location == 2)
        return "pic/map/location_car@0,5x.png";
    else
        return "pic/map/location_people@0,5x.png";
}

function refreshTileLayer(layer) {
    const source = layer.getSource();
    let params = source.getParams();
    params.tm = new Date().getMilliseconds();
    source.updateParams(params);
}

function refreshVectorLayer(layer) {
    if (layer == weatherLayer) {
        readWeatherIcon("pressure");
    } else if (layer == typhoonLayer) {
        readWeatherIcon("typhoon");
    }
}

function refreshNowcast() {
    refreshNowcastLayer(weatherTime);
}

function refreshWeather() {
    refreshTileLayer(isoLayer);
    refreshTileLayer(frontLayer);
    refreshVectorLayer(weatherLayer);
}

function refreshTyhoon() {
    refreshTileLayer(typhoonTileLayer);
    refreshVectorLayer(typhoonLayer);
}

var geo_options = {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 10000
};

var position = {};

function curPos(uid) {

    // position = {
    //     id: uid,
    //     //テスト用
    //     lat: mapCenterCoord[1] + Math.random() * 0.02,
    //     lng: mapCenterCoord[0] + Math.random() * 0.02,
    //     cam: myCamera
    // };
    // socketio.emit("renew", JSON.stringify(position));
    // //sendPos("pos", uid, [pos.coords.latitude, pos.coords.longitude]);
    // // 自分自身に追従する場合、以下のコメントを外す。
    // map.getView().setCenter(ol.proj.transform([position.lng, position.lat], "EPSG:4326", "EPSG:3857"));
    // return;

    if (!uid) return;

    //GPS前に送信
    position = {
        id: uid,
        lat: null,
        lng: null,
        cam: myCamera,
    };
    socketio.emit("renew", JSON.stringify(position));

    //GPS後の送信
    if (navigator.geolocation) {
        //navigator.geolocation.watchPosition(
        navigator.geolocation.getCurrentPosition(
            //Success
            function (_pos) {
                if (uid in specials) {
                    /*
                                        position = {
                                            id: uid,
                                            lat: specials[uid][1],
                                            lng: specials[uid][0],
                                        }
                    */
                    if ((specials[uid][2] == null) || (specials[uid][1] == null)) {
                        position = {
                            id: uid,
                            lat: _pos.coords.latitude,
                            lng: _pos.coords.longitude,
                            cam: myCamera
                        };
                    } else {
                        position = {
                            id: uid,
                            lat: specials[uid][2],
                            lng: specials[uid][1],
                            cam: myCamera,
                        };
                    }
                } else {
                    position = {
                        id: uid,
                        lat: _pos.coords.latitude,
                        lng: _pos.coords.longitude,
                        //テスト用                    
                        //lat: _pos.coords.latitude + Math.random() * 0.02,
                        //lng: _pos.coords.longitude + Math.random() * 0.02,
                        //テスト用
                        //lat: mapCenterCoord[1] + Math.random() * 0.02,
                        //lng: mapCenterCoord[0] + Math.random() * 0.02,
                        cam: myCamera
                    };
                }
                socketio.emit("renew", JSON.stringify(position));
                //console.log("RENEW SEND: " + JSON.stringify(position));
                //sendPos("pos", uid, [pos.coords.latitude, pos.coords.longitude]);
                // 自分自身に追従
                if (position.lng != null) {
                    map.getView().setCenter(ol.proj.transform([position.lng, position.lat], "EPSG:4326", "EPSG:3857"));
                }
            },
            //Error
            function (err) {
                var errorMessage = {
                    0: "原因不明のエラーが発生しました。",
                    1: "位置情報の取得が許可されませんでした。",
                    2: "電波状況などで位置情報が取得できませんでした。",
                    3: "位置情報の取得に時間がかかり過ぎてタイムアウトしました。",
                };
                console.log("GEO_ERROR:" + errorMessage[err.code]);

                if (uid in specials) {
                    position = {
                        id: uid,
                        lat: specials[uid][2],
                        lng: specials[uid][1],
                        cam: myCamera,
                    };
                } else {
                    position = {
                        id: uid,
                        lat: null,
                        lng: null,
                        cam: myCamera,
                    };
                }
                //テスト用
                //position = {
                //    id: uid,
                //    lat: mapCenterCoord[1] + Math.random() * 0.02,
                //    lng: mapCenterCoord[0] + Math.random() * 0.02,
                //};
                socketio.emit("renew", JSON.stringify(position));
                // console.log("RENEW SEND: " + JSON.stringify(position));
                //sendPos("pos", uid, [pos.coords.latitude, pos.coords.longitude]);
                // 自分自身に追従
                if (position.lng != null) {
                    map.getView().setCenter(ol.proj.transform([position.lng, position.lat], "EPSG:4326", "EPSG:3857"));
                }

            },
            //Options
            geo_options
        );
    } else {
        console.log("NO GEOLOCATION API");
    }
}

function sendPositionRepeatedly() {
    // 1.5秒間隔で定期的にpostionを送信する
    setInterval(function () {
        // //テスト用
        // if (Math.random() < 0.05) {
        //     position.lng += (Math.random() - 0.5) * 0.003;
        //     position.lat += (Math.random() - 0.5) * 0.003;
        // }
        position.cam = myCamera;
        socketio.emit("renew", JSON.stringify(position));
        //console.log("RENEW SEND: " + JSON.stringify(position));
        //console.log(position);
    }, 1500);

    // 10秒間隔でGPS測定
    setInterval(function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                //Success
                function (_pos) {
                    ////テスト用
                    //let latPos;
                    //let lngPos;
                    // if (position.lat != null && position.lng != null) {
                    //     if (Math.random() < 0.1) {
                    //         latPos = position.lat + (Math.random() - 0.5) * 0.003;
                    //         lngPos = position.lng + (Math.random() - 0.5) * 0.003;
                    //     } else {
                    //         latPos = position.lat;
                    //         lngPos = position.lng;
                    //     }
                    // } else {
                    //     latPos = _pos.coords.latitude + Math.random() * 0.02;
                    //     lngPos = _pos.coords.longitude + Math.random() * 0.02;
                    // }
                    /*
                                        if (myUid in specials) {
                                        } else {
                    */
                    if (myUid in specials) {
                        if ((specials[myUid][2] == null) || (specials[myUid][1] == null)) {
                            position = {
                                id: myUid,
                                lat: _pos.coords.latitude,
                                lng: _pos.coords.longitude,
                                cam: myCamera
                            };
                        } else {
                            position = {
                                id: myUid,
                                lat: specials[myUid][2],
                                lng: specials[myUid][1],
                                cam: myCamera,
                            };
                        }
                    } else {
                        position = {
                            id: myUid,
                            lat: _pos.coords.latitude,
                            lng: _pos.coords.longitude,
                            ////テスト用
                            //lat: latPos,
                            //lng: lngPos,
                            cam: myCamera
                        };
                    }
                    socketio.emit("renew", JSON.stringify(position));
                },
                //Error
                function (err) {
                    var errorMessage = {
                        0: "原因不明のエラーが発生しました。",
                        1: "位置情報の取得が許可されませんでした。",
                        2: "電波状況などで位置情報が取得できませんでした。",
                        3: "位置情報の取得に時間がかかり過ぎてタイムアウトしました。",
                    };
                    console.log("GEO_ERROR:" + errorMessage[err.code]);

                    if (myUid in specials) {
                        // //テスト用
                        // let latPos;
                        // let lngPos;
                        // if (position.lat != null && position.lng != null) {
                        //     if (Math.random() < 0.1) {
                        //         latPos = position.lat + (Math.random() - 0.5) * 0.003;
                        //         lngPos = position.lng + (Math.random() - 0.5) * 0.003;
                        //     } else {
                        //         latPos = position.lat;
                        //         lngPos = position.lng;
                        //     }
                        // } else {
                        //     latPos = specials[myUid][2] + (Math.random() - 0.5) * 0.003;
                        //     lngPos = specials[myUid][1] + (Math.random() - 0.5) * 0.003;
                        // }
                        // position = {
                        //     id: myUid,
                        //     // lat: _pos.coords.latitude,
                        //     // lng: _pos.coords.longitude,
                        //     //テスト用
                        //     lat: latPos,
                        //     lng: lngPos,
                        //     cam: myCamera
                        // };
                    } else {
                        position = {
                            id: myUid,
                            lat: null,
                            lng: null,
                            cam: myCamera
                        };
                    }
                    //socketio.emit("renew", JSON.stringify(position));
                },
                //Options
                geo_options
            );
        }
    }, 10000);
}

function getIconMapLayer() {
    //return (map.getLayers().getArray())[1];
    return iconLayer;
}

function changeMapIconPosition(userId, lng, lat) {
    const feature = getIconMapLayer().getSource().getFeatures().find(f => f.get("id") == userId);
    if (feature) {
        const iconPoint = (new ol.geom.Point([lng, lat])).transform('EPSG:4326', 'EPSG:3857');
        feature.set("geometry", iconPoint);
        //--------------------------------------------------------------
        // by Nori 2018.11.20
        if (feature.__$clear_id__) {
            clearInterval(feature.__$clear_id__);
        }
        if (userId == myUid) {
            feature.__$clear_id__ = setInterval(function () {
                flash(feature, 'red');
            }, 2500);
        } else {
            feature.__$clear_id__ = setInterval(function () {
                flash(feature, 'blue');
            }, 2500);
        }
        //--------------------------------------------------------------

    }
}

function deleteMapIcon(userId) {
    const source = getIconMapLayer().getSource();
    const feature = source.getFeatures().find(f => f.get("id") == userId);
    if (feature) {
        source.removeFeature(feature);
        //--------------------------------------------------------------
        // by Nori 2018.11.20
        if (feature.__$clear_id__) {
            clearInterval(feature.__$clear_id__);
        }
        //--------------------------------------------------------------
    }
}

function addMapIcon(userId, lng, lat) {
    if (lng == null) {
        return;
    }
    const source = getIconMapLayer().getSource();
    const iconPoint = (new ol.geom.Point([lng, lat])).transform('EPSG:4326', 'EPSG:3857');
    const newFeature = new ol.Feature({
        geometry: iconPoint,
        name: "icon",
        id: userId,
        //sel: userId == myUid ? true : false,
        location: getLocation(userId),
    });
    //--------------------------------------------------------------
    // by Nori 2018.11.20
    if (userId == myUid) {
        newFeature.__$clear_id__ = setInterval(function () {
            flash(newFeature, 'red');
        }, 2500);
    } else {
        newFeature.__$clear_id__ = setInterval(function () {
            flash(newFeature, 'blue');
        }, 2500);
    }
    //--------------------------------------------------------------

    source.addFeature(newFeature);
}

// function onReceiveRenew(msg) {
//     //console.log(msg);
//     const serverData = JSON.parse(msg);
//     if (Object.keys(serverData).length == 0) {
//         return;
//     }
//     Object.keys(users).forEach(function (userId) {
//         if (serverData[userId]) {
//             const serverLng = serverData[userId].lng;
//             const serverLat = serverData[userId].lat;
//             if (users[userId].lng == null) {
//                 if (serverLng == null) {
//                     //null->nullなら何もしない
//                 } else {
//                     //null->位置ありなのでアイコン作成
//                     addMapIcon(userId, serverData[userId].lng, serverData[userId].lat);
//                 }
//             } else {
//                 if (serverLng == null) {
//                     //nullになったので削除
//                     deleteMapIcon(userId);
//                 } else {
//                     //必要なら位置変更
//                     if (serverLng != users[userId].lng || serverLat != users[userId].lat) {
//                         changeMapIconPosition(userId, serverLng, serverLat);
//                     }
//                 }
//             }
//             delete serverData[userId];  //処理済
//         } else {
//             // delete for air-multi-talk
//             //deleteUser(userId);
//         }
//     });
//     Object.keys(serverData).forEach(function (userId) {
//         if (userId != myUid) {
//             addMenu(userId);
//         }
//         addMapIcon(userId, serverData[userId].lng, serverData[userId].lat);
//     });
//     // サーバーのデータを現在ユーザデータとする。
//     users = JSON.parse(msg);
// }

// renew 受信時
//socketio.on("renew", onReceiveRenew);

// renew 受信時
socketio.on("renew", function (msg) {
    // console.log(`RENEW MSG=${msg}`);
    const data = JSON.parse(msg);

    // 現在、保有しているリストによるユーザ
    const cur_users = Object.keys(users)

    // サーバからの通知された新しいリストと比較する。
    Object.keys(data).forEach(function (new_user) {
        // 現在のリストに居ない「通知されたユーザ」は追加する。
        if (!cur_users.includes(new_user)) {
            users[new_user] = {
                lat: data[new_user].lat,
                lng: data[new_user].lng
            };
            addMapIcon(new_user, data[new_user].lng, data[new_user].lat);
        }
    });

    // 現在、保有しているリストと通知されたユーザを比較する。
    cur_users.forEach(function (cur_user) {
        if (!Object.keys(data).includes(cur_user)) {
            // 現在、保有していても、通知されたユーザに無ければ、削除する。
            console.log(`${arguments.callee.name}: delete ${cur_user}`);
            delete users[cur_user];
            deleteMapIcon(cur_user);

        } else {
            // 現在、保有しており、通知もされたユーザ
            // console.log(`USER=${cur_user}  LNG=${data[cur_user].lng} LAT=${data[cur_user].lat}`);

            if (data[cur_user].lng == users[cur_user].lng && data[cur_user].lat == users[cur_user].lat) {
                // 位置も移動していない場合、何もしない
            } else {
                // アイコンの位置を変更する
                changeMapIconPosition(cur_user, data[cur_user].lng, data[cur_user].lat);
            }
        }
    })

    // 現在保有しているリストを通知されたリストに更新する。
    users = data;
});


function deleteUserIcon(id) {
    let source = getIconMapLayer().getSource();
    source.getFeatures().forEach(function (feature, i) {
        if (feature.get("id") == id) {
            source.removeFeature(feature);
            //--------------------------------------------------------------
            // by Nori 2018.11.21
            if (feature.__$clear_id__) {
                clearInterval(feature.__$clear_id__);
            }
            //--------------------------------------------------------------			
        }
    });
}


//////////////////////////////////////////////////////////////////////////////////////

/*
window.onresize = function () {
  setRemoteBox();
};
*/

var disp_init = function () {
    //------------------------------------------------------
    //
    fliper(localVideoElm);
}

/*
var login = function () {
    if (init_user_id == "initial_user_id") {
        return getUniqueStr();
    } else {
        return init_user_id;
    }
 
    // let autoId;
    // if (localStorage.id) {
    //     autoId = localStorage.id;
    // } else {
    //     autoId = getUniqueStr();
    // }
    // const dialog_result = prompt("名前", autoId);
    // if (!dialog_result) {
    //     localStorage.clear();
    //     alert("クリアしました");
    //     dialog_result = login();
    // } else if (localStorage.id != dialog_result) {
    //     localStorage.id = dialog_result;
    // }
    // //console.log(dialog_result + "でログインしました");
    // return dialog_result;
}
*/

var getUniqueStr = function (myStrong) {
    var strong = 10;
    if (myStrong) strong = myStrong;
    return new Date().getTime().toString(16) + Math.floor(strong * Math.random()).toString(16)
}

// 天気図・台風アイコン取得

function readWeatherIcon(wtype) {

    var base_url = 'https://wms.jmarinecloud.com/ms4w/htdocs/point.php';
    var ajax_option = {
        url: base_url + "?type=" + wtype,
        //context: this,  //Window(Global)
        dataType: 'jsonp',
        //success: function(data){GPV_weather_readPressure.call(this, data)},
        success: function (data) { readWeatherIconExec(data, wtype) },
    };
    $.ajax(ajax_option);
}

function readWeatherIconExec(data, wtype) {

    if (wtype == "pressure") {
        const source = weatherLayer.getSource();
        source.clear();
        Object.keys(data).forEach(function (k) {
            const p = data[k];
            if (p.type == "Feature") {
                const pPoint = (new ol.geom.Point([p.geometry.coordinates[0], p.geometry.coordinates[1]])).transform('EPSG:4326', 'EPSG:3857');
                const newFeature = new ol.Feature({
                    geometry: pPoint,
                    direction: p.properties.direction,
                    direction_icon: p.properties.direction_icon,
                    direction_label: p.properties.direction_label,
                    icon: iconConvert(p.properties.icon),
                    label: p.properties.label,
                    //time: p.time,
                    //wtype: wtype
                });
                source.addFeature(newFeature);
            }
        });
    }
    else if (wtype == "typhoon") {
        const source = typhoonLayer.getSource();
        source.clear();
        Object.keys(data).forEach(function (k) {
            const p = data[k];
            if (p.type == "Feature") {
                const pPoint = (new ol.geom.Point([p.geometry.coordinates[0], p.geometry.coordinates[1]])).transform('EPSG:4326', 'EPSG:3857');
                const newFeature = new ol.Feature({
                    geometry: pPoint,
                    icon: iconConvert(p.properties.icon),
                    label: p.properties.label,
                    //time: p.time,
                    //typhoon_label: p.properties.typhoon_label, //台風X号
                    //wtype: wtype
                });
                source.addFeature(newFeature);
            }
        });
    }
}

function iconConvert(fromIcon) {
    if (fromIcon == "https://wms.jmarinecloud.com/ms4w/htdocs/symbol/ICys_koukiatsu.gif")
        return "pic/map/icon_H.png";
    else if (fromIcon == "https://wms.jmarinecloud.com/ms4w/htdocs/symbol/ICys_teikiatsu.gif")
        return "pic/map/icon_L.png";
    else if (fromIcon == "https://wms.jmarinecloud.com/ms4w/htdocs/symbol/ICys_nettaisei.gif")
        return "pic/map/icon_TD.png";
    else if (fromIcon == "https://wms.jmarinecloud.com/ms4w/htdocs/symbol/ICys_taifu.gif")
        return "pic/map/icon_T.png";
    return fromIcon;
}

$("#mainMenuBtn").on("click", function () {
    $("#mainMenu").hide();
    $("#subMenu").show();
});

$("#backBtn").on("click", function () {
    if (writeMode) {
        writeBtnEnd();
    }
    $("#subMenu").hide();
    $("#mainMenu").show();
});

$("#writeBtn,#backBtnWrite").on("click", function () {
    if (!writeMode) {
        writeBtnStart();
    } else {
        writeBtnEnd();
    }
});


function writeBtnStart() {
    writeMode = true;
    map.addInteraction(freeDraw);
    $("#subMenu").hide();
    $("#writeMenu").show();
}

function writeBtnEnd() {

    if (sizeMode) {
        sizeBtnEnd();
    }
    if (colorMode) {
        spectrumClose();
    }
    if (eraseMode) {
        $("#eraseBtn").css({ "background-color": buttonBlue });
        eraseMode = false;
        map.removeInteraction(freeErase);
    } else {
        map.removeInteraction(freeDraw);
    }
    writeMode = false;
    $("#writeMenu").hide();
    $("#subMenu").show();
}

$("#colorBtn").on("click", function () {
    if (sizeMode) {
        sizeBtnEnd();
    }
    if (eraseMode) {
        eraseBtnEnd();
    }
    if (!colorMode) {
        colorChangeEnable = false;
        setTimeout(function () {
            colorChangeEnable = true;
        }, 300)
        $("#colorPicker").show();
        $(this).css({ "background-color": buttonRed });
        colorMode = true;
    } else {
        drawLineColor = $("#picker").get().toHexString();
        spectrumClose();
    }
});

function spectrumClose() {
    $("#colorDisp").css({ "background-color": drawLineColor });
    $("#colorBtn").css({ "background-color": buttonBlue });
    colorMode = false;
    $("#colorPicker").hide();
}

function colorBtnInit() {
    let initColor = "#2196f3";
    var userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("android") == -1) {
        initColor = "#ff0000";
    }

    drawLineColor = initColor;
    $("#colorDisp").css({ "background-color": drawLineColor });

    $("#picker").spectrum({
        color: initColor,
        flat: true,
        showPalette: true,
        //hideAfterPaletteSelect: false,
        palette: [
            ["#ffffff", "#cccccc", "#999999", "#666666", "#333333", "#000000", "#f44336", "#ff9800",
                "#ffeb3b", "#8bc34a", "#4caf50", "#03a9f4", initColor]
        ],
        change: function (color) {
            if (colorChangeEnable) {
                drawLineColor = color.toHexString();
                spectrumClose();
            }
        },
        move: function (color) {
            $("#colorDisp").css({ "background-color": color.toHexString() });
        }
    });
}

$("#sizeBtn").on("click", function () {
    if (colorMode) {
        spectrumClose();
    }
    if (eraseMode) {
        eraseBtnEnd();
    }
    if (!sizeMode) {
        sizeBtnStart();
    } else {
        sizeBtnEnd();
    }
});

function sizeBtnStart() {
    $("#sizeContainer").show();
    $("#sizeBtn").css({ "background-color": buttonRed });
    $("#sizeText").html("幅：" + drawLineWidth);
    $("#sizeDisp").css({ "border-bottom-width": drawLineWidth + "px" });
    sizeMode = true;
}

function sizeBtnEnd() {
    $("#sizeContainer").hide();
    $("#sizeBtn").css({ "background-color": buttonBlue });
    sizeMode = false;
}

$("#sizeSlider").on("input", function () {
    drawLineWidth = $(this).val();
    $("#sizeText").html("幅：" + drawLineWidth);
    $("#sizeDisp").css({ "border-bottom-width": drawLineWidth + "px" });

});

function initDrawLayer() {
    drawLayerSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        //url: 'file://' + __dirname + '/data/drawdata.json',
    });
    drawLayer = new ol.layer.Vector({
        source: drawLayerSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#000000', width: 3 })
        })
    });
}

var drawStartFlag = false;
var multiTouch = false;

function initDraw() {
    var timerId;
    var timerCnt;
    var lineId;

    freeDraw = new ol.interaction.Draw({
        source: drawLayer.getSource(),
        type: 'LineString',
        freehand: true,
        //condition: ol.events.condition.singleClick,
        //freehandCondition: ol.events.condition.noModifierKeys
    });

    freeDraw.on("drawstart", function (e) {
        multiTouch = false;
        drawStartFlag = true;
        var style_modify = new ol.style.Style({
            stroke: new ol.style.Stroke({
                width: drawLineWidth,
                color: drawLineColor
            })
        });
        var currentFeature = e.feature;
        currentFeature.setStyle(style_modify);
        lineId = getUniqueStr();
        currentFeature.set("id", lineId);
        //console.log("draw start");
        if (timerId != null) {
            clearInterval(timerId);
            timerId = null;
        }
        timerCnt = 100;
        timerId = setInterval(function () {
            sendDraw(currentFeature, lineId);
            if (--timerCnt <= 0) {
                clearInterval(timerId);
                timerId = null;
            }
        }, 200);
    });

    freeDraw.on("drawend", function (e) {
        clearInterval(timerId);
        const currentFeature = e.feature;//this is the feature fired the event
        //const id = getUniqueStr();
        //sendDraw(e.feature, id);
        //e.feature.set("id", id);
        sendDraw(e.feature, lineId);
        //console.log("draw end");
    });

}

$(window).on("touchstart", function (e) {
    if (writeMode) {
        if (e.touches.length > 1) {
            multiTouch = true;
        } else {
            //multiTouch = false;
        }
    }
});

function initFreeEraseLayer() {
    const freeEraseLayerSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        //url: 'file://' + __dirname + '/data/drawdata.json',
    });
    freeEraseLayer = new ol.layer.Vector({
        source: freeEraseLayerSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: "rgba(0,0,0,0)", width: 0 })
        })
    });
}

var freeErase;
function initFreeErase() {
    freeErase = new ol.interaction.Draw({
        source: freeEraseLayer.getSource(),
        type: 'LineString',
        freehand: true,
        //condition: ol.events.condition.singleClick,
        //freehandCondition: ol.events.condition.noModifierKeys
    });

    freeErase.on("drawstart", function (e) {
        var style_modify = new ol.style.Style({
            stroke: new ol.style.Stroke({
                width: 1,
                color: "rgba(255,0,0,0)"
            })
        });
        var currentFeature = e.feature;
        currentFeature.setStyle(style_modify);
    });

    freeDraw.on("drawend", function () {
        const source = freeEraseLayer.getSource();
        source.getFeatures().forEach(function (feature) {
            source.removeFeature(feature);
        });
    });
}

function sendDraw(feature, id) {
    var data = {};
    data.width = drawLineWidth;
    data.color = drawLineColor;
    data.id = id;
    data.coords = [];
    feature.getGeometry().getCoordinates().forEach(function (pair) {
        data.coords.push(ol.proj.transform(pair, 'EPSG:3857', 'EPSG:4326'));
    })
    var jsonData = JSON.stringify(data);
    //alert(jsonData);
    socketio.emit("draw", jsonData);
}

function receiveDraw(data) {
    if (!data || !data.coords || data.coords.length == 0) {
        return;
    }
    drawLayerSource.getFeatures().forEach(function (feature) {
        if (feature.get("id") == data.id) {
            drawLayerSource.removeFeature(feature);
        }
    });

    //const jsonData = '{"width":3,"color":"#000000","coords":[[139.57386016845703,35.69580613093983],[139.5742034912109,35.69601524672811],[139.5743751525879,35.69601524672811],[139.57446098327637,35.69601524672811],[139.57497596740723,35.69601524672811],[139.57514762878418,35.69601524672811],[139.57523345947266,35.69594554152627],[139.57523345947266,35.69587583626351],[139.57531929016113,35.69580613093983],[139.5754051208496,35.69545760340752],[139.5754051208496,35.69517878028499],[139.5754909515381,35.69503936835815],[139.5754909515381,35.694969662303336],[139.5754909515381,35.69489995618761],[139.57531929016113,35.69483025001094],[139.5750617980957,35.69448171821374],[139.5747184753418,35.69420289167928],[139.5750617980957,35.69420289167928],[139.57523345947266,35.69420289167928],[139.5754909515381,35.69420289167928],[139.57574844360352,35.69420289167928],[139.575834274292,35.69420289167928]]}';
    //const data = JSON.parse(jsonData);
    const polyline = new ol.geom.LineString(data.coords).transform('EPSG:4326', 'EPSG:3857');
    const feature = new ol.Feature({
        geometry: polyline,
        id: data.id
    })
    const style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            width: data.width,
            color: data.color
        })
    });
    feature.setStyle(style);
    drawLayerSource.addFeature(feature);
}


socketio.on("draw", function (jsonData) {
    receiveDraw(JSON.parse(jsonData));
});

socketio.on("alldraw", function (jsonData) {
    const dataSet = JSON.parse(jsonData);
    dataSet.forEach(function (data) {
        receiveDraw(data);
    });
});

//手書き消去
$("#eraseBtn").on("click", function () {
    if (sizeMode) {
        sizeBtnEnd();
    }
    if (colorMode) {
        spectrumClose();
    }
    if (!eraseMode) {
        eraseBtnStart();
    } else {
        eraseBtnEnd();
    }
})

function eraseBtnStart() {
    $("#eraseBtn").css({ "background-color": buttonRed });
    map.removeInteraction(freeDraw);
    map.addInteraction(freeErase);
    eraseMode = true;
}

function eraseBtnEnd() {
    $("#eraseBtn").css({ "background-color": buttonBlue });
    eraseMode = false;
    map.removeInteraction(freeErase);
    map.addInteraction(freeDraw);
}

function eraseNearest(myCoord) {
    const max = 250 / (2 ** (map.getView().getZoom() - 14));
    let minFeature;
    let minDist = -1;

    drawLayerSource.getFeatures().forEach(function (feature) {
        const geometry = feature.get("geometry");
        const coords = geometry.getCoordinates();
        //console.log(coords);
        coords.forEach(function (coord) {
            const xDist = Math.abs(coord[0] - myCoord[0]);
            const yDist = Math.abs(coord[1] - myCoord[1]);
            if (xDist + yDist <= max) {
                const dist = Math.sqrt(xDist * xDist + yDist * yDist);
                if (minDist < 0 || dist < minDist) {
                    minDist = dist;
                    minFeature = feature;
                }
            }
        })
    });
    if (minDist >= 0) {
        //alert(minFeature.get("id"));
        drawLayerSource.removeFeature(minFeature);
        minFeature.changed();
        socketio.emit("erase", minFeature.get("id"));
        //console.log("erased");
    }
}

socketio.on("erase", function (id) {
    drawLayerSource.getFeatures().forEach(function (feature) {
        if (feature.get("id") == id) {
            drawLayerSource.removeFeature(feature);
        }
    });
});

$("#telBtn").on("click", function () {
    AndroidApplicationJavascriptInterface["changeScreen"](3);
});

$("#locationBtn").on("click", function () {
    if (position && position.lng && position.lat) {
        mapView.setCenter(ol.proj.transform([position.lng, position.lat], "EPSG:4326", "EPSG:3857"));

        //--------------------------------------------------------------------------------
        // add by nori 2019.01.27
        // when btn clicked, location of all devices syncronaized.
        //
        const coord = ol.proj.transform(mapView.getCenter(), 'EPSG:3857', 'EPSG:4326');
        const location_view = JSON.stringify({
            lat: coord[1],
            lng: coord[0],
            zoom: mapView.getZoom()
        });
        // console.log(location_view);
        socketio.emit("location_view", location_view);
        //--------------------------------------------------------------------------------
    }
});
//--------------------------------------------------------------------------------
// add by nori 2019.01.27
// {location_view: {lat:lat, lng:lng, zoom:zoom}}
socketio.on("location_view", (msg) => {
    // console.log("Recived location CMD");
    // console.log(`location_view=${msg}`);
    const data = JSON.parse(msg);

    if (data && data.lng && data.lat) {
        mapView.setCenter(ol.proj.transform([data.lng, data.lat], "EPSG:4326", "EPSG:3857"));
        mapView.setZoom(data.zoom);
    }
});
//--------------------------------------------------------------------------------

//--------------------------------------------------------------------------------
// add by nori 2019.02.22
$("#cam360Btn").on("click", function () {
    $("#theta-viewer").toggle();
});



//$("#videoBtn").css({"background-color": buttonRed});
var videoMode = true;
var videoHides = [];

$("#videoBtn").on("click", function () {
    if (videoMode) {
        $("#local").hide();
        $("#remote").hide();
        /*
        videoHides = [];
        $(".user_title").each(function (i, elm) {
            const id = elm.innerHTML;
            if (remoteVideoElms[id]) {
                videoHides.push(id);
                watchEnd(id);
            }
        })
        */
        //$("#videoBtn").css({"background-color": buttonBlue});
    } else {
        $("#local").show();
        $("#remote").show();
        /*
        $(".user_title").each(function (i, elm) {
            const id = elm.innerHTML;
            if (videoHides.indexOf(id) >= 0) {
                enableButton();
                watchStart(id);
            }
        })
        */
        //$("#videoBtn").css({"background-color": buttonRed});
    }
    videoMode = !videoMode;
});

$("#layerBtn").on("click", function () {
    if (writeMode) {
        writeBtnEnd();
    }

    const $layerDialog = $("#layerDialog");
    const hi = window.innerHeight < screen.height ? window.innerHeight : screen.height;
    let y = hi - $layerDialog.height();
    if (y < 0) {
        y = 0;
    }
    $layerDialog.css({ top: y + "px" }).show();

    $(".layerDialogContent>img").each(function (i, elm) {
        const layers = gatWeatherLayers(elm.id.substring(5));
        const currentVisible = layers[0] == null ? false : layers[0].getVisible();
        elm.src = currentVisible ? "/pic/dialog/select_yes.png" : "/pic/dialog/select_no.png";
    });
});

$("#backBtn2").on("click", function () {
    $("#layerDialog").hide();
    //$("#subMenu").hide();
    //$("#mainMenu").show();
});

$(".layerDialogContent>img").on("click", function () {
    const layers = gatWeatherLayers(this.id.substring(5));
    if (layers == null || layers.length == 0 || layers[0] == null) {
        return;
    }
    const currentVisible = layers[0].getVisible();
    layers.forEach(function (layer) {
        layer.setVisible(!currentVisible);
    })
    this.src = currentVisible ? "/pic/dialog/select_no.png" : "/pic/dialog/select_yes.png";
    if (!currentVisible) {
        if (layers[0] == nowcastLayer) {
            refreshNowcast();
        }
        else if (layers[0] == weatherLayer) {
            refreshWeather();
        }
        else if (layers[0] == typhoonLayer) {
            refreshTyhoon();
        }
    }
});

$(".layerDialogContent>input").on("input", function () {
    const layers = gatWeatherLayers(this.id.substring(6));
    if (layers == null || layers.length == 0 || layers[0] == null) {
        return;
    }
    const val = $(this).val();
    layers.forEach(function (layer) {
        //console.log(val);
        layer.setOpacity(val / 100);
    })
});

function gatWeatherLayers(kind) {
    switch (kind) {
        case "Nowcast":
            return [nowcastLayer]
        case "Weather":
            return [weatherLayer, isoLayer, frontLayer];
        case "Tyhoon":
            return [typhoonLayer, typhoonTileLayer];
        case "FreeHand":
            return [drawLayer];
        case "HazerdMap":
            return [hazerdMapLayer];
        default:
            return [JISYOU_LAYER.layer];
    }
}


weathTimeMode = false;
weatherTime = 0;

$("#weathBtn").on("click", function () {
    $("#subMenu").hide();
    showWeathTime();
    $("#weathMenu").show();
});

$("#weathTimeBtn").on("click", function () {
    if (!weathTimeMode) {
        weathTimeBtnStart();
    } else {
        weathTimeBtnEnd();
    }
});

function weathTimeBtnStart() {
    $("#timeContainer").show();
    $("#weathTimeBtn").css({ "background-color": buttonRed });
    weathTimeMode = true;
}

function weathTimeBtnEnd() {
    $("#timeContainer").hide();
    $("#weathTimeBtn").css({ "background-color": buttonBlue });
    weathTimeMode = false;
}

$("#timeSlider").on("input", function () {
    weatherTime = $(this).val();
    showWeathTime();
    refreshNowcast();
});

function showWeathTime() {
    const txt = weatherTime == 0 ? "現在" : (weatherTime < 0 ? `${-weatherTime}H前` : `${weatherTime}H後`);
    $("#timeText").html(txt);
}

$("#backBtnWeath").on("click", function () {
    weathTimeBtnEnd();
    $("#weathMenu").hide();
    $("#subMenu").show();
});

function refreshNowcastLayer(diffHour) {

    const dt = new Date((new Date()).getTime() + diffHour * 60 * 60 * 1000);
    const yr = dt.getFullYear();
    const mt = ("00" + (dt.getMonth() + 1)).slice(-2);
    const dy = ("00" + dt.getDate()).slice(-2);
    const hr = ("00" + dt.getHours()).slice(-2);
    //const mn = ("00" + dt.getMinutes()).slice(-2);
    //const timeStr = yr + mt + dy + hr + mn + "00_000_m"
    const timeStr = yr + mt + dy + hr + "0000_000_m"

    const source = nowcastLayer.getSource();
    let params = source.getParams();
    params.tm = new Date().getMilliseconds();
    if (diffHour == 0) {
        delete params.TIME;
    } else {
        params.TIME = timeStr;
    }
    source.updateParams(params);
}

$("#patBtn").on("click", function () {
    sidebox_show(JISYOU_LAYER.menu_html);
})

var sidebox_elm = document.getElementById('sidebox');
var sidebox_in_elm = document.getElementById('sidebox_in');
var sidebox_x_elm = document.getElementById('sidebox_x');
var sideboxs = document.getElementsByClassName('box27');

sidebox_x_elm.addEventListener('click', function (e) {
    sidebox_close();
});

var sidebox_onclose_callback = null;
function sidebox_show(value, callback) {
    // 2018/11/20 Aikawa
    //sidebox_closeが呼ばれずにsidebox_showが呼ばれた場合sidebox_onclose_callbackを実行
    if (sidebox_onclose_callback != null) {
        sidebox_onclose_callback();
        sidebox_onclose_callback = null;
    }
    if (callback) sidebox_onclose_callback = callback;

    const $sidebox = $("#sidebox");
    const hi = window.innerHeight < screen.height ? window.innerHeight : screen.height;
    let y = hi - $sidebox.height();
    if (y < 0) {
        y = 0;
    }
    $sidebox.css({ top: y + "px" }).show();
    $("#subMenu").hide();

    if (typeof value == "string") {
        sidebox_in_elm.innerHTML = value;
    } else if (typeof value == "object") {
        sidebox_in_elm.textContent = null;
        sidebox_in_elm.appendChild(value[0]);
    }
    sidebox_elm.style.display = 'block';
}

function sidebox_close() {
    sidebox_elm.style.display = 'none';
    // 2018/11/20 Aikawa
    //sidebox_onclose_callback();
    if (sidebox_onclose_callback != null) {
        sidebox_onclose_callback();
        sidebox_onclose_callback = null;
    }
    $("#subMenu").show();
}

//-----------------------------------------------------------------------
// by Nori 2018/11/20
var centorbox_elm = document.getElementById('centorbox');
var centorbox_in_elm = document.getElementById('centorbox_in');
var centorbox_x_elm = document.getElementById('centorbox_x');
//var centorboxs = document.getElementsByClassName('box27');

centorbox_x_elm.addEventListener('click', function (e) {
    centorbox_close();
});

var centorbox_onclose_callback = null;
function centorbox_show(value, callback) {
    // 2018/11/20 Aikawa
    if (centorbox_onclose_callback != null) {
        centorbox_onclose_callback();
        centorbox_onclose_callback = null;
    }
    if (callback) centorbox_onclose_callback = callback;

    const $centorbox = $("#centorbox");
    /*
    const hi = window.innerHeight < screen.height ? window.innerHeight : screen.height;
    let y = hi - $centorbox.height();
    if (y < 0) {
        y = 0;
    }
    $centorbox.css({top: y + "px"}).show();
    */
    $("#subMenu").hide();

    if (typeof value == "string") {
        centorbox_in_elm.innerHTML = value;
    } else if (typeof value == "object") {
        centorbox_in_elm.textContent = null;
        centorbox_in_elm.appendChild(value[0]);
    }
    $("#centorbox img").css("max-width", "100%");
    centorbox_elm.style.display = 'block';
}

function centorbox_close() {
    centorbox_elm.style.display = 'none';
    // 2018/11/20 Aikawa
    //centorbox_onclose_callback();
    if (centorbox_onclose_callback != null) {
        centorbox_onclose_callback();
        centorbox_onclose_callback = null;
    }
    $("#subMenu").show();
}
//-----------------------------------------------------------------------



var main_menu = {
    //--------------------------------------------------------------------
    // システムメニューとしては、設定等を行いますが、
    // 現在の展示会向けレベルとしては不要のため、コメントアウトしてます。
    /*
    system : {
        icon : '1x/menu_setting@1x.png',
        menu : {
            layer_menu : {
                click: open_layer_dialog,
                icon : './1x/menu_layer@1x.png'
            }        
        }
    },
    */
    app: {
        icon: './1x/menu_menu@1x.png',
        menu: {
            layer_menu: {
                click: function () { },
                icon: './1x/menu_layer@1x.png'
            },
            app1_menu: {
                click: function () { alert("サンプル/アプリ１") },
                icon: '1x/menu_message@1x.png'
            },
            app2_menu: {
                click: function () { alert("サンプル/アプリ２") },
                icon: '1x/menu_message@1x.png'
            }
        }
    },
    talk: {
        click: function () { alert("サンプル/通話機能\n頑張って通話する") },
        icon: '1x/menu_tel@1x.png'
    },
    video: {
        click: function () { alert("サンプル/リアル映像機能\n頑張って映します") },
        icon: '1x/menu_video@1x.png'
    }
};

