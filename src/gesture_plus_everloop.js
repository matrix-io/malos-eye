// This demo integrates the Everloop LED array and the camera
// (with gesture detection). In order to run it you need to have
// both matrix-creator-malos and malos-eye installed.
// You can install the packages with:
// apt-get install matrix-creator-malos malos-eye
//
// When the demo runs it will wait for a face detection. Once a face
// is detected it will no longer expect faces and expect fists and palms
// instead. With a hand palm you can change the colors of the everloop LED array.
// With a fist you can make the leds blink.

// This is how we connect to the creator. IP and port.
// The IP is the IP I'm using and you need to edit it.
// By default, MALOS has its 0MQ ports open to the world.

// Every device is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

var creator_ip = '127.0.0.1'
var creator_gesture_base_port = 22013

var protoBuf = require("protobufjs")

// Parse proto file
var protoBuilder = protoBuf.loadProtoFile('../protocol-buffers/malos/driver.proto')
// Parse matrix_malos package (namespace).
var matrixMalosBuilder = protoBuilder.build("matrix_malos")

var protoBuilderVision = protoBuf.loadProtoFile('../protocol-buffers/vision/vision.proto')
var matrixVisionBuilder = protoBuilderVision.build('admobilize_vision')

var zmq = require('zmq')

// ********** Start error management.
var errorSocket = zmq.socket('sub')
errorSocket.connect('tcp://' + creator_ip + ':' + (creator_gesture_base_port + 2))
errorSocket.subscribe('')
errorSocket.on('message', function(error_message) {
  process.stdout.write('Message received: gesture error: ' + error_message.toString('utf8') + "\n")
});
// ********** End error management.


var MalosEyeConfigSocket = zmq.socket('push')

function ConfigureVideoCapture() {
  console.log('configuring video capture')
  MalosEyeConfigSocket.connect('tcp://' + creator_ip + ':' + creator_gesture_base_port /* config */)

  var config = new matrixMalosBuilder.DriverConfig
  // Generic configuration.
  // Almost 0 delay between updates. 50ms.
  config.set_delay_between_updates(0.005)
  // Driver specific configuration.
  config.malos_eye_config = new matrixMalosBuilder.MalosEyeConfig
  // Camera configuration.
  camera_config = new matrixMalosBuilder.CameraConfig
  camera_config.set_camera_id(0);
  camera_config.set_width(640);
  camera_config.set_height(480);
  config.malos_eye_config.set_camera_config(camera_config)
  MalosEyeConfigSocket.send(config.encode().toBuffer())
}

ConfigureVideoCapture()

function SetObjectsToDetect(objs) {
  console.log('updating objects to detect')
  var config = new matrixMalosBuilder.DriverConfig
  config.malos_eye_config = new matrixMalosBuilder.MalosEyeConfig
  for(var i = 0; i < objs.length; ++i) {
    config.malos_eye_config.object_to_detect.push(objs[i])
  }
  MalosEyeConfigSocket.send(config.encode().toBuffer())
}

SetObjectsToDetect([matrixMalosBuilder.EnumMalosEyeDetectionType.FACE])
console.log('waiting for a face')


var creator_everloop_base_port = 20013 + 8 // port for Everloop driver
var everloopConfigSocket = zmq.socket('push')
everloopConfigSocket.connect('tcp://' + creator_ip + ':' + creator_everloop_base_port /* config */)

function setEverloop(r, g, b, w) {
    var config = new matrixMalosBuilder.DriverConfig
    config.image = new matrixMalosBuilder.EverloopImage
    for (var j = 0; j < 35; ++j) {
      var ledValue = new matrixMalosBuilder.LedValue;
      ledValue.setRed(r);
      ledValue.setGreen(g);
      ledValue.setBlue(b);
      ledValue.setWhite(w);
      config.image.led.push(ledValue)
    }
    everloopConfigSocket.send(config.encode().toBuffer());
}

setEverloop(0, 0, 0, 2);

WAIT_FACE = 0
WAIT_FIST_OR_HAND = 1

var demo_state = WAIT_FACE
var fist_sate = 0 // 0 or 1 meaning 'on' and 'off'.

// ********** Start updates - Here is where they are received.
var updateSocket = zmq.socket('sub')
updateSocket.connect('tcp://' + creator_ip + ':' + (creator_gesture_base_port + 3))
updateSocket.subscribe('')
updateSocket.on('message', function(buffer) {
    // .toRaw() gets you decoded values! Try what happens without it.
    var data = new matrixVisionBuilder.VisionResult.decode(buffer).toRaw()

    if (demo_state == WAIT_FACE) {
        console.log('Face detected')
        setEverloop(0, 10, 0, 0)
        SetObjectsToDetect([matrixMalosBuilder.EnumMalosEyeDetectionType.HAND_FIST,
                            matrixMalosBuilder.EnumMalosEyeDetectionType.HAND_PALM])
        console.log('Waiting for palm or fist')
        demo_state = WAIT_FIST_OR_HAND
    } else if (demo_state == WAIT_FIST_OR_HAND) {
      if (data['rect_detection'][0]['tag'] == 'HAND_PALM') {
        console.log('Palm detected')
        where = data['rect_detection'][0]['location']
        console.log(where['x'], where['y'])
        setEverloop(Math.round(where['x'] / 5), 0, Math.round(where['y'] / 5), 0)
      } else if (data['rect_detection'][0]['tag'] == 'HAND_FIST') {
        console.log('Fist detected')
        setEverloop(0, 10 * fist_sate, 0, 0)
        fist_sate = 1 - fist_sate
      }
    }
});
// ********** End updates

// ********** Ping the driver
var pingSocket = zmq.socket('push')
pingSocket.connect('tcp://' + creator_ip + ':' + (creator_gesture_base_port + 1))
process.stdout.write("Sending pings every 3 seconds")
pingSocket.send(''); // Ping the first time.
setInterval(function(){
  pingSocket.send('')
}, 3000);
// ********** Ping the driver ends
