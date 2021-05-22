# Simple WebRTC Signaling Server

WebRTC is an evolving technology for peer-to-peer communication on the web. To establish a succesfull WebRTC connection, the peers need to exchange ICE candidates and session description protocol (SDP). This can be done using any method of data transport. Once that connection is established, the peers no longer need to stay connected to the signalling server. Read more [here](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling). In this repository, we will use **socket.io** to implement the simplest possible signaling logic.

#### Table of Contents

-   [Installation](#Installation)
-   [Usage](#Usage)
-   [Examples](#Examples)
-   [Deployment](#Deployment)
-   [API](#API)

## Installation

Make sure to have both [Node.js](https://nodejs.org/en/download/) and [Yarn](https://classic.yarnpkg.com/en/docs/install) installed.

```bash
git clone https://github.com/aljanabim/simple_webrtc_signaling_server.git
cd simple_webrtc_signaling_server
yarn install
```

## Usage

The signaling server can be used in development and in production. You can use it locally to develop your WebRTC logic or deploy it on the web using your deployment service of choice (see [Deployment](##Deployment)) see Deployment. Be sure to checkout [Simple WebRTC Node.js Client](https://github.com/aljanabim/simple_webrtc_nodejs_client) for client implemenation that is compatable with the [API](##API) of this signaling server.

### Development

For **development** signlaing server make sure to update the environment variables, in [/config/dev.env](/config/dev.env), according to your desires. Then run:

```bash
yarn dev
```

### Production

For a **production** signaling server, run

```bash
yarn start
```

## Examples

For an actual implementation of a Node.js WebRTC client that utilizes the API of this signaling server, checkout [Simple WebRTC Node.js Client](https://github.com/aljanabim/simple_webrtc_nodejs_client). Otherwise, you can find starter code for a signaling channel which interacts with the signaling server in [/examples/signaling-channel.js](/examples/signaling-channel.js). To see an **example** of how a client might utilize the signaling server as a signaling channel, run

```bash
yarn client1
```

and in another terminal window run

```bash
yarn client2
```

you will see console logs of what the siganling server and the clients are doing, according to the API (see below). All the code for the examples is found in the [/examples](/examples) directory.

## Deployment

You can deploy this signaling server on whichever deployment service you are comfortable with, eg. Heroku, GCP, AWS, Azure, Vercel, Netlify, etc. In this section we will see an example of how to deploy the signaling server on **Heroku**. Follow these steps:

1. Do the steps in the **Prerequisites** section in [this](https://devcenter.heroku.com/articles/deploying-nodejs#prerequisites) article and come back once you are done.
2. In a terminal window run each of the following lines separately (ie. don't copy-paste all the commands at once)

    ```bash
    heroku login
    heroku create [name]
    git push heroku main
    heroku open
    ```

    The `[name]` argument allows you to give your signaling server a unique name. You can leave out the `[name]` argument to let Heroku generate a random name.

3. Save the URL you get in the new browser window, which opens once you run `heroku open`, and use it as the **SIGNALING_SERVER_URL** in [/examples/signaling-channel.js](/examples/signaling-channel.js) or [Simple WebRTC Node.js Client](https://github.com/aljanabim/simple_webrtc_nodejs_client).

## API

The signaling server listens to the following events

1. `"connection"`: Fired when a client sucessfully connects to the server.
2. `"disconnect"`: Fired when the client disconnects from the server. When fired, the message is broadcasted to all other peers in the following format:

    ```javascript
    {
        from: peerId, // the client that fired the `ready` event
        target: "all", // all other clients are informed
        payload: { action: "close", message: "Peer has left the signaling server" },
    }
    ```

3. `"message"`: Fired when a client sends a message to the server. When fired, the message is broadcasted to all other clients in the following message format

    ```javascript
    {
        from: peerId, // id of sender
        target: "all", // sent to all other peers,
        payload: message, // the content of the message
    }
    ```

4. `"messageOne"`: Fired when a client emits a _messageOne_ event. When fired, the message is broadcasted only to the client that is specified in the message target. The message has the following format

    ```javascript
    {
        from: peerId, // id of sender
        target: targetPeerId, // id of recieving peer,
        payload: message, // the content of the message
    }
    ```

5. `"ready"`: Fired when a client emits a _ready_ event. When fired, the client peerId and socketId are added to the object of connections in the server. Furthermore, a message is broadcasted to all already connected clients in the following format:

    ```javascript
    {
        from: peerId, // the client that fired the `ready` event
        target: "all", // all other clients are informed
        payload: {
            action: "open",
            connections: [newPeer],
            bePolite: true
        }
    }
    ```

    and the connecting client recieves information about the exising connections in the following format:

    ```javascript
    {
        from: "all", // all other conneted clients
        target: peerId, // the newely connected client
        payload: {
            action: "open",
            connections: Object.values(connections),
            bePolite: false
        }
    }
    ```

### Connections API

The server also exposes an API Endpoint which return a JSON object containing all the connections registered in the server. It can be accessed on `[SIGNALING_SERVER_URL]/connections`. Ie. whichever URL is used to indicate where signaling server is hosted, concatenated with "/connections". For localhost at port 3000, this becomes `http://localhost:3000/connections`.

---

Best of Luck with your WebRTC adventures. If you have any feedback, don't hestitate to reach out ☺.
