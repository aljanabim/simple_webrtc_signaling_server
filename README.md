WebRTC is an evolving technology for peer-to-peer communication on the web. To establish a succesfull WebRTC connection, the peers need to exchange ICE candidates and session description protocol (SDP). This can be done using any method of data transport. Once that connection is established, the peers no longer need to stay connected to the signalling server. Read more [here](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling). In this repository, we will use **socket.io** to implement the simplest possible signaling logic.

## Installation

```bash
git clone https://github.com/aljanabim/simple_webrtc_signaling_server.git # or git@github.com:aljanabim/simple_webrtc_signaling_server.git for SSH
yarn install
```

For **development** run

```bash
yarn dev
```

and for a **production** signaling server, run

```bash
yarn start
```

To see an **example** of how a client might utilize the signaling server as a signaling channel, run

```bash
yarn client1
```

and in another terminal window run

```bash
yarn client2
```

you will see console logs of what the siganling server and the clients are doing, according to the API (see below).

## Usage

You can use this simple signaling server both in development and in production. Whether you want to deploy the server or use it for local development, please make sure to update the `.env` files inside the `config` directory.

For an **example** of how two peers can utilize the signaling server through a signaling channel, have a look at the code inside the `examples` folder.

## API

The signaling server listens to the following events

1. `"connection"`: Fired when a client sucessfully connects to the server.
2. `"disconnect"`: Fired when the client disconnects from the server. When fired, the message is broadcasted to all other peers in the following format:

    ```javascript
    {
        from: peerId, // the client that fired the `ready` event
        target: "all", // all other clients are informed
        message: "Peer has left the signaling server",
        action: "close"
    }
    ```

3. `"message"`: Fired when a client sends a message to the server. When fired, the message is broadcasted to all other clients in the following message format

    ```javascript
    {
        from: peerId, // id of sender
        target: "all", // sent to all other peers,
        message, // the content of the message
    }
    ```

4. `"messageOne"`: Fired when a client emits a _messageOne_ event. When fired, the message is broadcasted only to the client that is specified in the message target. The message has the following format

    ```javascript
    {
        from: peerId, // id of sender
        target: targetPeerId, // id of recieving peer,
        message, // the content of the message
    }
    ```

5. `"ready"`: Fired when a client emits a _ready_ event. When fired, the client peerId and socketId are added to the object of connections in the server. Furthermore, a message is broadcasted to all already connected clients in the following format:

    ```javascript
    {
        from: peerId, // the client that fired the `ready` event
        target: "all", // all other clients are informed
        message: "Peer has joined the signaling server",
        action: "open"
    }
    ```

    and the connecting client recieves information about the exising connections in the following format:

    ```javascript
    {
        from: "all", // all other conneted clients
        target: peerId, // the newely connected client
        connections: {
            // an object of all the existing connections in the following format
            peerId: {
                socketId,
                peerId
            }
        }
    }
    ```

## Connections API

The server also exposes an API Endpoint which return a JSON object containing all the connections registered in the server. It can be accessed on `[hostURL]/connections`. Ie. whichever URL is used to indicate where signaling server is hosted, concatenated with "/connections". For localhost at port 3000, this becomes `http://localhost:3000/connections`.

---

**IMPORTANT** The versions for the SOCKET.IO server SOCKET.IO-CLIENT have to match in `package.json` in order for everything to match. For example, at the time of writing, they are set to:

```json
{
    "socket.io": "^4.0.1",
    "socket.io-client": "^4.0.1"
}
```

---

Best of Luck with you WebRTC adventures. If you have any feedback, don't hestitate to reach out ☺.
