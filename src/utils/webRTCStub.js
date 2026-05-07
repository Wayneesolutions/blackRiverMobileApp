// Web stub for react-native-webrtc — prevents requireNativeComponent crash on web

const noop = () => {};
const noopAsync = async () => {};

class RTCPeerConnection {
  constructor() {}
  createOffer() { return Promise.resolve({}); }
  createAnswer() { return Promise.resolve({}); }
  setLocalDescription() { return Promise.resolve(); }
  setRemoteDescription() { return Promise.resolve(); }
  addIceCandidate() { return Promise.resolve(); }
  addTrack() {}
  addStream() {}
  close() {}
  onicecandidate = null;
  onaddstream = null;
  ontrack = null;
}

class RTCSessionDescription {
  constructor(init) { Object.assign(this, init); }
}

class RTCIceCandidate {
  constructor(init) { Object.assign(this, init); }
}

class MediaStream {
  constructor() { this._tracks = []; }
  getTracks() { return this._tracks; }
  addTrack() {}
  removeTrack() {}
}

const mediaDevices = {
  getUserMedia: () => Promise.resolve(new MediaStream()),
  getDisplayMedia: () => Promise.resolve(new MediaStream()),
  enumerateDevices: () => Promise.resolve([]),
};

const RTCView = () => null;

module.exports = {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
  RTCView,
};
module.exports.default = module.exports;
