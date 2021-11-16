const mongoose = require("mongoose");
const mqtt = require('mqtt');
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Connect to DB
mongoose.connect("mongodb://127.0.0.1/mongotest2");
const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", () => console.log("DB connected..."));

// Get home page
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Connect to broker
const host = '172.20.49.35'
const port = '1883'
const clientId = `WebServerClient`

const connectUrl = `mqtt://${host}:${port}`

const mqttClient = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: 'hoang',
  password: 'hoang',
  reconnectPeriod: 1000,
});

//setup the callbacks
mqttClient.on('connect', function () {
    console.log('MQTT Broker connected...');

    mqttClient.subscribe("newMsg");
});

mqttClient.on('error', function (error) {
    console.log(error);
});

// IO connection
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    let messages = db.collection("messages");

    // Render log for the first time
    messages.find().limit(20).sort({ _id: 1 }).toArray(function (err, res) {
        if (err) {
            throw err;
        }

        // Emit the messages
        socket.emit("messages", res);
    });

    // Subscribe for new messages
    mqttClient.on("message", function (topic, message) {
        if (topic === "newMsg") {
            messages.insertOne({ message: JSON.parse(message.toString()).data.attempt , time: JSON.parse(message.toString()).data.time});
        }
        messages.find().limit(20).sort({ _id: 1 }).toArray(function (err, res) {
            if (err) {
                throw err;
            }

            // Emit the messages
            socket.emit("messages", res);
        });
    });

    // Publish new passcode
    socket.on("pass", (res) => {
        mqttClient.publish("newPass", res, { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
    })

    // Delete log
    socket.on("delete", async () => {
        await messages.deleteMany();
        messages.find().limit(20).sort({ _id: 1 }).toArray(function (err, res) {
            if (err) {
                throw err;
            }

            // Emit the messages
            socket.emit("messages", res);
        });
    })
});

// Starting server
server.listen(3000, () => {
    console.log("Server is running on port 3000!");
});