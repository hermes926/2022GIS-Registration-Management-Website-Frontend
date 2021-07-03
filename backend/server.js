// default .env file to connect with mogoDB
require("dotenv").config();

// define some library usage
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");

// define the schema of the database
const user = require("./model/user.js");
const admission = require("./model/admission.js")
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        method: "*"
    },
});


// connect to mongoDB
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);


mongoose.connect(process.env.MONGOURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// define database connection
const db = mongoose.connection;

// if database connection failed
db.on("error", (error) => console.error(error));

// if database connection succeeded
db.once("open", () => {
    
    // communicate with frontend server
    const sendData = (data) => {
        const [type, payload] = data;
        io.emit(type, payload);
        console.log(payload);
    };

    // define default message when database and socket is connected
    console.log("database connected", process.env.MONGOURL);

    // websocket connection
    io.on("connect", (socket) => {
        console.log("socket connected: " + socket.id);

        // Create user in database
        socket.on("CreateUser", (data) => {
            user.create(data, (err, res) => {
                if (err) throw err;
                
                console.log(res);
            })
        })

        // Login Method
        socket.on("Login", (username, passwd) => {

            // Find correct user
            user.find({ Username: username, Password: passwd }).exec((err, res) => {
                if (err) throw err;

                if (res.length == 1) {
                    sendData(["getUser", res]);  
                } else {
                    sendData(["getUserFail", "Invaild Username or Password"]);
                }
            
            });
        });

        // Find a list of user
        socket.on("findUser", (usernameList) => {

            // Find user list
            user.find({Username: {$in: usernameList}}).exec((err, res) => {
                if (err) throw err;

                if (res.length != 0) {
                    sendData(["findUserList", res]);  
                } else {
                    sendData(["findUserListFail", "Invalid username list"]);
                }
            
            });
        })

        // Find admission data of given list of user
        socket.on("findAdmission", (usernameList) => {

            // Find admission data
            admission.find({Username: {$in: usernameList}}).exec((err, res) => {
                if (err) throw err;

                if (res.length != 0) {
                    sendData(["findAdmissionList", res]);  
                } else {
                    sendData(["findAdmissionListFail", "Invalid username list"]);
                }
            
            });
        })

        // Update certain attribute of user
        socket.on("updateUser", (username, attribute) => {

            // Update Attribute of certain user
            user.update({Username: username}, attribute).exec((err, res) => {
                if (err) throw err;

                if (res) sendData(["userUpdateSuccess", res]);
            });

            // renew information of user
            user.find({ Username: username}).exec((err, res) => {
                if (err) throw err;

                if (res.length == 1) {
                    sendData(["getUser", res]);  
                } else {
                    sendData(["getUserFail", "Invaild Username or Password"]);
                }
            
            });
        })

        // Delete User
        socket.on("deleteUser", (username, passwd) => {
            user.deleteOne({Username: username, Password: passwd }).exec((err, res) => {
                if (err) throw err;

                if (res.length != 0) {
                    sendData(["deleteUserData", res]);  
                } else {
                    sendData(["deleteUserDataFail", "Deletion Failed"]);
                }
            
            });
        })
    });


    const PORT = process.env.port || 4000;

    server.listen(PORT, () => {
        console.log(`Listening on https://localhost:${PORT}`);
    });
});
