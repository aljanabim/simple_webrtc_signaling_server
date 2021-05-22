const SignalingChannel = require("./signaling-channel");
const peerId = "testPeer2";
// Where the signaling server is hosted, for a local server the port must match the one set in the .env files inside the config directory
const port = process.env.PORT || 3031;
const signalingServerUrl = "http://localhost:" + port;
// Token must match the value defined in the .env filed inside the config directory
const token = "SIGNALING123";

const channel = new SignalingChannel(peerId, signalingServerUrl, token);
channel.onMessage = (message) => {
    console.log("A message has been recieved", message);
};
channel.connect();
channel.send({ data: "1234" });
channel.sendTo("testPeer1", { this: "is not a test" });
