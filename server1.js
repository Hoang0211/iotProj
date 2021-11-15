const mongo = require('mongodb').MongoClient;
const mqtt = require('mqtt')
const client = require('socket.io').listen(4000).sockets;

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongopasscode', function(err, db){
    if(err){
        throw err;
    }

    console.log('MongoDB connected...');

    // Connect to Socket.io
    client.on('connection', function(socket){

        //Connect to MQTT Broker
        connectToBroker();

        let chat = db.collection('chats');

        // Create function to send status
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // Get chats from mongo collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res){
            if(err){
                throw err;
            }

            // Emit the messages
            socket.emit('output', res);
        });

        // Handle input events
        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;

            // Check for name and message
            if(name == '' || message == ''){
                // Send error status
                sendStatus('Please enter a name and message');
            } else {
                // Insert message
                chat.insert({name: name, message: message}, function(){
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', function(data){
            // Remove all chats from collection
            chat.remove({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });
    });
});

// Connect to MQTT Broker handler
function connectToBroker(){
    var options = {
        host: '02782ce026b7481fb23154eb79c7feff.s2.eu.hivemq.cloud',
        port: 8883,
        protocol: 'mqtts',
        username: 'bhong001',
        password: 'St1412kidst'
    }
    
    //initialize the MQTT client
    var mqttClient = mqtt.connect(options);
    
    //setup the callbacks
    mqttClient.on('connect', function () {
        console.log('MQTT Broker connected...');
    });
    
    mqttClient.on('error', function (error) {
        console.log(error);
    });
    
    mqttClient.on('message', function (topic, message) {
        //Called each time a message is received
        console.log('Received message:', topic, message.toString());
    });
    
    mqttClient.subscribe("test")
};