var socket = io.connect('http://localhost:5000'); 

var answersFrom = {}, offer;
var peerConnection = window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.msRTCPeerConnection;

var sessionDescription = window.RTCSessionDescription ||
    window.mozRTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.msRTCSessionDescription;
// only on secure contenxt
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia = navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia;

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function(resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
}

function streamHandler(stream) {
    var video = document.querySelector('video');
    video.srcObject = stream;
    pc.addStream(stream);
}

function errorHandler(error){
    console.log( error );
}

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
})
.then(streamHandler)
.catch(errorHandler);



var pc = new peerConnection({
    iceServers: [
        { url: "stun:stun.l.google.com:19302" },
        { url: "stun:stun.stunprotocol.org" }
    ]
});

pc.onaddstream = function (obj) {
    var vid = document.createElement('video');
    vid.setAttribute('class', 'video-small');
    vid.setAttribute('autoplay', 'autoplay');
    vid.setAttribute('id', 'video-small');
    document.getElementById('users-container').appendChild(vid);
    vid.srcObject = obj.stream;
}


socket.on('add-users', function (data) {
    for (var i = 0; i < data.users.length; i++) {
        var el = document.createElement('div'),
            id = data.users[i];

        el.setAttribute('id', id);
        el.innerHTML = id;
        el.addEventListener('click', function () {
            createOffer(id);
        });
        document.getElementById('users').appendChild(el);
    }
});

socket.on('remove-user', function (id) {
    var div = document.getElementById(id);
    document.getElementById('users').removeChild(div);
});


socket.on('offer-made', function (data) {
    offer = data.offer;

    pc.setRemoteDescription(new sessionDescription(data.offer), function () {
        pc.createAnswer(function (answer) {
            pc.setLocalDescription(new sessionDescription(answer), function () {
                socket.emit('make-answer', {
                    answer: answer,
                    to: data.socket
                });
            }, error);
        }, error);
    }, error);

});

socket.on('answer-made', function (data) {
    pc.setRemoteDescription(new sessionDescription(data.answer), function () {
        document.getElementById(data.socket).setAttribute('class', 'active');
        if (!answersFrom[data.socket]) {
            createOffer(data.socket);
            answersFrom[data.socket] = true;
        }
    }, error);
});

function createOffer(id) {
    pc.createOffer(function (offer) {
        pc.setLocalDescription(new sessionDescription(offer), function () {
            socket.emit('make-offer', {
                offer: offer,
                to: id
            });
        }, error);
    }, error);
}

function error(err) {
    console.warn('Error', err);
}
