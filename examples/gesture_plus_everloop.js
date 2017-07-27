"use strict";

// This demo integrates the Everloop LED array and the camera
// (with gesture detection). In order to run it you need to have
// both matrix-creator-malos and malos-eye installed.
// You can install the packages with:
// apt-get install matrix-creator-malos malos-eye
//
// When the demo runs it will wait for a face detection. Once a face
// is detected you can control the intensity of the red leds by
// moving left and right and the intensity of the blue led by going up and down.
// If malos_eye stops detecting a face then the leds will turn off.

// This is how we connect to the creator. IP and port.
// The IP is the IP I'm using and you need to edit it.
// By default, MALOS has its 0MQ ports open to the world.
// Every service is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

// Use: CREATOR_IP="192.168.2.2" node gesture_plus_everloop.js
// to override the default ip address. 
const creator_ip = process.env.CREATOR_IP || '127.0.0.1';

// The following two lines are for the ports used by matrix-creator-malos.
// The program that can control the leds.
const creator_gesture_base_port = 22013;
const creator_everloop_base_port = 20013 + 8;

// ZeroMQ protocol is used to send messages to Malos.
var zmq = require('zmq');
// The protocol buffers used by the matrix_io project.
const matrix_io = require('matrix-protos').matrix_io;

// ********** Start error management.
var errorSocket = zmq.socket('sub');
errorSocket.connect('tcp://' + creator_ip + ':' +
                    (creator_gesture_base_port + 2));
errorSocket.subscribe('')
errorSocket.on('message', function(error_message) {
  process.stdout.write('Demographics error: ' + error_message.toString('utf8'));
});
// ********** End error management.


var malosEyeConfigSocket = zmq.socket('push');
malosEyeConfigSocket.connect('tcp://' + creator_ip + ':' +
                             creator_gesture_base_port);
const camWidth = 640
const camHeight = 480

// Start configuration. Initialize the camera and the parameters for
// malos-eye.
function ConfigureVideoCapture() {
  console.log('configuring video capture');

  let camera = matrix_io.malos.v1.maloseye.CameraConfig.create({
    cameraId: 0,
    width: camWidth,
    height: camHeight,
  });

  let eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
    cameraConfig: camera,
  });

  let config = matrix_io.malos.v1.driver.DriverConfig.create({
    delayBetweenUpdates: 0.05,
    malosEyeConfig: eye_config,
  });

  malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish());
}

ConfigureVideoCapture();
// End configuration

// Configure malos-eye t do face detections.
function ConfigureObjectsToDetect() {
  let eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
              objectToDetect: [matrix_io.malos.v1.maloseye.EnumMalosEyeDetectionType.FACE]
            });
  let  config = matrix_io.malos.v1.driver.DriverConfig.create({
               malosEyeConfig : eye_config
            });
  malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish());
}
ConfigureObjectsToDetect();
// End configure face detection

console.log('Waiting for a face to show.')
console.log('Move left and right to change the color of the red LED.')
console.log('Move up and down to change the color of the blue LED.')

var everloopConfigSocket = zmq.socket('push');
everloopConfigSocket.connect('tcp://' + creator_ip + ':' + creator_everloop_base_port /* config */);
function setEverloop(led_values) {
    let image = matrix_io.malos.v1.io.EverloopImage.create()
    for (let j = 0; j < 35; ++j) {
      let led_conf = matrix_io.malos.v1.io.LedValue.create(led_values);
      image.led.push(led_conf);
    }
    let config = matrix_io.malos.v1.driver.DriverConfig.create({
      image: image,
    });
    everloopConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish());
}

// ********** Start updates - Here is where they are received and they come from malos-eye.
var updateSocket = zmq.socket('sub');
updateSocket.subscribe('');
updateSocket.connect('tcp://' + creator_ip + ':' + (creator_gesture_base_port + 3));
updateSocket.subscribe('');
updateSocket.on('message', (buffer) => {
    let data = new matrix_io.vision.v1.VisionResult.decode(buffer);
    for (let i = 0; i < data.rectDetection.length; ++i) {
      const detection = data.rectDetection[i]
      // i == 0 means that we only take into account the first person that was detected.
      if (i == 0) {
        let redIntensity = Math.round(((camWidth - detection.location.x) / camWidth) * 80);
        let blueIntensity = Math.round((detection.location.y / camHeight) * 80);
        setEverloop({
          red: redIntensity,
          green: 0,
          blue: blueIntensity,
          white: 0
        });
      }
    }
    if (data.rectDetection.length == 0) {
      setEverloop({});
    }
    //console.log(data)
});
// ********** End updates


// ********** Ping the driver. We need to do this to tell malos-eye that we are still waiting for
// updates.
var pingSocket = zmq.socket('push')
pingSocket.connect('tcp://' + creator_ip + ':' + (creator_gesture_base_port + 1))
process.stdout.write("Sending pings every 3 seconds")
pingSocket.send(''); // Ping the first time.
setInterval(function(){
  pingSocket.send('')
}, 3000);
// ********** Ping the driver ends
