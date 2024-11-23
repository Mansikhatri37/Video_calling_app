import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

//import.meta.url : tells what ur file name is
//output : file://your/system/path/file.html
// fileURLToPath will convert file://your/system/path/file.html this url into a path by removing file i.e //your/system/path/file.html
// dirname will give you the directory name of the path i.e your/system/path
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
//to create an open connection using io
//Server is class
//io is variable
//server is object
const io = new Server(server);
const allUsers = {};

//exposing public directory
app.use(express.static("public"));

//handle incoming http request
app.get("/", (req, res) => {
  console.log("get request");
  //join wil adjust the path slashes like / or \ depending on each systems internals
  res.sendFile(join(__dirname + "/app/index.html"));
});

//handle socket connections
//it is event based
//io.on is to open the connection
//this connection is made on our computer, we also need to establish this connection on the client's side
io.on("connection", (socket) => {
  console.log(
    `someone connected to socket server and socket id is ${socket.id}`
  );

  // Listens for an event named "join-user" emitted by the server or another client.
  // When the "join-user" event is triggered, the associated callback function is executed.
  socket.on("join-user", (username) => {
    console.log(`${username} joined socket connection`);
    allUsers[username] = { username, id: socket.id };
    //inform every user that someone joined
    io.emit("joined", allUsers);
  });

  socket.on("offer", ({ from, to, offer }) => {
    //we have to send this offer to the client
    console.log({ from, to, offer });
    //jisko send karna hai uski socket id pata honi chahiye
    io.to(allUsers[to].id).emit("offer", { from, to, offer }); // this offer will go the socket that is connected to this socket server
  });

  socket.on("answer", ({ from, to, answer }) => {
    //we have to send the answer to the one who initiated the call
    io.to(allUsers[from].id).emit("answer", { from, to, answer });
  });

  socket.on("icecandidate", (candidate) => {
    console.log({ candidate });
    //broadcast to other peers
    socket.broadcast.emit("icecandidate", candidate);
  });

  socket.on("end-call", ({ from, to }) => {
    io.to(allUsers[to].id).emit("end-call", { from, to });
  });

  socket.on("call-ended", (caller) => {
    const [from, to] = caller;
    io.to(allUsers[from].id).emit("call-ended", caller);
    io.to(allUsers[to].id).emit("call-ended", caller);
  });
});

server.listen(9000, () => {
  console.log("Server is running on port 9000");
});
