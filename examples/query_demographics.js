"use strict";

// This demo will configure MALOS-eye to detect faces.
// The program malos_eye needs to be running. You can install it with
// apt-get install malos-eye .
//
// When the person is looking at the camera and the angle
// is good for getting demographics, a remote server will be
// queried and the returned information will be attached to the
// displayed result.
// For each demographics (age for instance) more information will
// be printed but only the information for a given tag will make sense.
// You can check the FacialRecognition message for details:
// TODO: Update proto path once the merge is done.
// https://github.com/matrix-io/protocol-buffers/blob/master/vision/vision.proto

// This is how we connect to the creator.
// You can set the IP of the creator with the env var CREATOR_IP.
// It defaults to 127.0.0.1.
// By default, MALOS-eye (in the Creator) has its 0MQ ports open to the world.

// Every device is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

const creator_ip = process.env.CREATOR_IP || '127.0.0.1';
const creator_demographics_base_port = 22013;

const zmq = require('zmq');
const matrix_io = require('matrix-protos').matrix_io;

// ********** Start error management.
var errorSocket = zmq.socket('sub')
errorSocket.connect('tcp://' + creator_ip + ':' +
                    (creator_demographics_base_port + 2))
errorSocket.subscribe('')
errorSocket.on('message', function(error_message) {
  process.stdout.write('Demographics error: ' + error_message.toString('utf8'))
});
// ********** End error management.


// ********** Start configuration.

var malosEyeConfigSocket = zmq.socket('push')
malosEyeConfigSocket.connect('tcp://' + creator_ip + ':' +
                             creator_demographics_base_port /* config */)

function ConfigureVideoCapture() {
  console.log('configuring video capture')

  let camera = matrix_io.malos.v1.maloseye.CameraConfig.create({
    cameraId: 0,
    width: 640,
    height: 480
  });

  let eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
    cameraConfig: camera
  });

  let config = matrix_io.malos.v1.driver.DriverConfig.create({
    delayBetweenUpdates: 0.05,
    malosEyeConfig: eye_config
  });

  malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish())
}

ConfigureVideoCapture()


function ConfigureObjectsToDetect() {
  let eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
              objectToDetect: [matrix_io.malos.v1.maloseye.EnumMalosEyeDetectionType.FACE_DEMOGRAPHICS]
            });
  let  config = matrix_io.malos.v1.driver.DriverConfig.create({
               malosEyeConfig : eye_config
            });
  malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish())
}

ConfigureObjectsToDetect()

// ********** End configuration.

function roundpose(val) {
  return Math.round(val * 1000) / 1000;
}

// ********** Start updates - Here is where they are received.
var updateSocket = zmq.socket('sub')
updateSocket.connect('tcp://' + creator_ip + ':' + (creator_demographics_base_port + 3))
updateSocket.subscribe('')
updateSocket.on('message', function(buffer) {
    let data = new matrix_io.vision.v1.VisionResult.decode(buffer)
    for (let i = 0; i < data.rectDetection.length; ++i) {
        console.log(' *** Detection ' + i + ' ***');
        let detection = data.rectDetection[i];
        console.log('Location: ', detection.location);
        for (let j = 0; i < detection.facialRecognition.length; ++i) {
          let rec = detection.facialRecognition[i];
          if (rec.tag == 0) {
            console.log('Age: ', rec.age);
          } else if (rec.tag == 1) {
            // TODO: Is there a way to do this conversion with protobufjs 6.X?
            let emotion = 'unknown';
            switch(rec.emotion) {
              case 0: emotion = 'Angry'; break;
              case 1: emotion = 'Disgust'; break;
              case 2: emotion = 'Confused'; break;
              case 3: emotion = 'Happy'; break;
              case 4: emotion = 'Sad'; break;
              case 5: emotion = 'Surprised'; break;
              case 6: emotion = 'Calm'; break;
            }
            console.log('Emotion:', emotion)
          } else if (rec.tag == 4) {
            console.log('Pose (radians). Yaw: ', roundpose(rec.poseYaw), 'Pitch:', roundpose(rec.posePitch),
                               'Roll:', roundpose(rec.poseRoll));
          } else if (rec.tag == 2) {
            console.log('Gender:', rec.gender == 0 ? 'Male' : 'Female');
          } else {
            console.log(rec)
          }
        }
    }
    console.log()
});
// ********** End updates


// ********** Ping the driver
var pingSocket = zmq.socket('push')
pingSocket.connect('tcp://' + creator_ip + ':' + (creator_demographics_base_port + 1))
process.stdout.write("Sending pings every 3 seconds");
pingSocket.send(''); // Ping the first time.
setInterval(function(){
  pingSocket.send('');
}, 3000);
// ********** Ping the driver ends
