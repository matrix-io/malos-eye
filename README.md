# MALOS-eye examples

### Pre-Requisites
```
# Base repository and assoc. packages
echo "deb http://packages.matrix.one/matrix-creator/ ./" | sudo tee --append /etc/apt/sources.list
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install libzmq3-dev xc3sprog malos-eye matrix-creator-malos matrix-creator-openocd wiringpi matrix-creator-init cmake g++ git

# Install Node.js.
curl -sL https://deb.nodesource.com/setup_6.x | sudo bash -
sudo apt-get install nodejs


```
### Getting Started with the Examples
```
# Clone repository.
git clone https://github.com/matrix-io/malos-eye.git

# Fetch protocol-buffers repository.
git submodule init
git submodule update

# Setup examples.
cd examples
npm install
```

### Face Detection with Demographics
Demographics example. Detect faces and get age, gender, emotion and pose by querying a remote server.
```
node query_demographics.js
```

### Gesture Detection
Everloop + Gesture demo. Control the Everloop LEDs with your face.
```
node gesture_plus_everloop.js
```
