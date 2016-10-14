# MALOS-eye examples

### Pre-Requisites
```
echo "deb http://packages.matrix.one/matrix-creator/ ./" | sudo tee --append /etc/apt/sources.list;
sudo apt-get update;
sudo apt-get upgrade;
sudo apt-get install libzmq3-dev xc3sprog matrix-creator-openocd wiringpi cmake g++ git;
```
### Getting Started with the Examples
```
cd examples;
npm install;
```

### Face Detection with Demographics
Demographics example. Detect faces and get age, gender, emotion and pose by querying a remote server.
```
query_demographics.js
```

### Gesture Detection
Everloop + Gesture demo. Control the Everloop LEDs with your hand.
```
node gesture_plus_everloop.js
```


Before running the demos you need to run:

    # Fetch protocol-buffers repository.
    git submodule init
    git submodule update
