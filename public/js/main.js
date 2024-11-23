const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const allusersHtml = document.getElementById("allusers");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("end-call-btn");

const socket = io();

//global variable
let localStream;
let caller = [];

//This will be made by a singleton method which means that , we will create an instance of the method and throighout we will use the same instance and will not recreate the instance
//using IIF- Immediately invoked function
//which means it will run as soon as the app starts
const PeerConnection = (function () {
  let peerConnection;

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config);

    //add local audio/video streams to peerConnection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    //listem to remote streams and add to peerConnection
    peerConnection.ontrack = function (event) {
      remoteVideo.srcObject = event.streams[0];
    };
    //listen for ICE candidate
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
      }
    };

    return peerConnection;
  };
  return {
    //this function will return the instance of the peer connection
    getInstance: () => {
      if (!peerConnection) {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
  };
})();
//handle browser event

// 1.createUserBtn.addEventListener("click", (e) => { ... }):

// Adds a click event listener to the createUserBtn element.
// When the button is clicked, the callback function (e) => { ... } is executed.

//2. (e) in the callback:

// Represents the event object, which contains details about the click event, such as the target element and the event type.
// In this case, it's not explicitly used inside the function but is still passed as a parameter.

// 3.if (username !== ""):

// Checks if the username variable is not an empty string.
// This ensures that the logic inside the if block only executes if username has a value.

// 4.socket.emit("join-user", username.value):

// Sends a message ("join-user") to the server through a socket connection (probably using Socket.IO).
// username.value is sent along with the "join-user" event.
// username is likely a reference to an input field, and .value retrieves the text entered by the user.

createUserBtn.addEventListener("click", (e) => {
  if (username !== "") {
    const usernameContainer = document.querySelector(".username-input");
    // querySelector() allows the use of complex CSS selectors, enabling greater flexibility:
    // Targeting by class: .username-input
    // Targeting by attribute: [type="text"]
    // Nested selectors: .container .username-input
    // socket.emit("join-user", username.value);
    socket.emit("join-user", username.value);
    usernameContainer.style.display = "none"; //this is done to remove the input box, once the user has entered his name
  }
});

endCallBtn.addEventListener("click", (e) => {
  socket.emit("call-ended", caller);
});

// handle socket events
socket.on("joined", (allUsers) => {
  console.log({ allUsers });
  const createUsersHtml = () => {
    allusersHtml.innerHTML = "";

    for (const user in allUsers) {
      const li = document.createElement("li");
      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;

      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", (e) => {
          startCall(user);
        });
        const img = document.createElement("img");
        img.setAttribute("src", "/images/phone.png");
        img.setAttribute("width", 20);

        button.appendChild(img);

        li.appendChild(button);
      }

      allusersHtml.appendChild(li);
    }
  };

  createUsersHtml();
});

socket.on("offer", async ({ from, to, offer }) => {
  const pc = PeerConnection.getInstance();
  // set remote description
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { from, to, answer: pc.localDescription });
  caller = [from, to];
});
socket.on("answer", async ({ from, to, answer }) => {
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(answer);
  //show call end button
  endCallBtn.style.display = "block";
  socket.emit("end-call", { from, to });
  caller = [from, to];
});

socket.on("icecandidate", async (candidate) => {
  console.log({ candidate });
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("end-call", ({ from, to }) => {
  endCallBtn.style.display = "block";
});

socket.on("call-ended", (caller) => {
  endCall();
});

// start call method
const startCall = async (user) => {
  console.log(`Starting call with ${user}`); // Debug log
  //as soon as we call , we have to create the offer and send it to the signalling server and that will send the offer to the client
  const pc = PeerConnection.getInstance(); //to get the instance of peer connection
  const offer = await pc.createOffer(); //to create the offer
  console.log({ offer });
  await pc.setLocalDescription(offer); //to update our offer into peer connection
  socket.emit("offer", {
    from: username.value,
    to: user,
    offer: pc.localDescription,
  }); //to send this offer to the signalling server
};

const endCall = () => {
  const pc = PeerConnection.getInstance();
  if (pc) {
    pc.close();
    endCallBtn.style.display = "none";
  }
};

//initialize app
const startMyVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log({ stream });
    localStream = stream;
    localVideo.srcObject = stream;
  } catch (error) {}
};

startMyVideo();
