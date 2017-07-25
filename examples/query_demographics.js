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
// TODO: Update proto path.
// https://github.com/matrix-io/protocol-buffers/blob/master/vision/vision.proto

// This is how we connect to the creator. IP and port.
// The IP is the IP I'm using and you need to edit it.
// By default, MALOS has its 0MQ ports open to the world.

// Every device is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

var creator_ip = process.env.CREATOR_IP || '127.0.0.1';
var creator_demographics_base_port = 22013;

var zmq = require('zmq');
var matrix_io = require('matrix-protos').matrix_io;

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

  camera = matrix_io.malos.v1.maloseye.CameraConfig.create({
    camera_id: 0,
    width: 640,
    height: 480
  });

  var eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
    camera_config: camera
  });

  var config = matrix_io.malos.v1.driver.DriverConfig.create({
    delay_between_updates: 0.05,
    malos_eye_config: eye_config
  });

  malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish())

/*
  Maciek: The way it was before:
  var config = new matrixMalosBuilder.DriverConfig
  // Generic configuration.
  // Almost 0 delay between updates. 50ms.
  config.set_delay_between_updates(0.05)
  // Driver specific configuration.
  config.malos_eye_config = new matrixMalosBuilder.MalosEyeConfig
  // Camera configuration.
  camera_config = new matrixMalosBuilder.CameraConfig
  camera_config.set_camera_id(0);
  camera_config.set_width(640);
  camera_config.set_height(480);
  config.malos_eye_config.set_camera_config(camera_config)
  malosEyeConfigSocket.send(config.encode().toBuffer())
  */
}

ConfigureVideoCapture()

/*

var eye_config = matrix_io.malos.v1.maloseye.MalosEyeConfig.create({
              object_to_detect: [matrix_io.malos.v1.maloseye.EnumMalosEyeDetectionType.FACE_DEMOGRAPHICS]
            });
var config = matrix_io.malos.v1.driver.DriverConfig.create({
               malos_eye_config : eye_config
            });
malosEyeConfigSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(config).finish())



function SetObjectsToDetect(objs) {
  console.log('updating objects to detect')
  var config = new matrixMalosBuilder.DriverConfig
  config.malos_eye_config = new matrixMalosBuilder.MalosEyeConfig
  for(var i = 0; i < objs.length; ++i) {
    config.malos_eye_config.object_to_detect.push(objs[i])
  }
  malosEyeConfigSocket.send(config.encode().toBuffer())
}

SetObjectsToDetect([matrixMalosBuilder.EnumMalosEyeDetectionType.FACE_DEMOGRAPHICS])

// ********** End configuration.

// ********** Start updates - Here is where they are received.
var updateSocket = zmq.socket('sub')
updateSocket.connect('tcp://' + creator_ip + ':' + (creator_demographics_base_port + 3))
updateSocket.subscribe('')
updateSocket.on('message', function(buffer) {
    // .toRaw() gets you decoded values! Try what happens without it.
    var data = new matrixVisionBuilder.VisionResult.decode(buffer).toRaw()
    console.log(data)
    for (var i = 0; i < data.rect_detection.length; ++i) {
        console.log(data.rect_detection[i].facial_recognition)
    }
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

*/
