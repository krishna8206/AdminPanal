import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const useRideWebSocket = (onRideStatusUpdate, onChatMessage) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:8989", {
      transports: ["websocket"],       // force websocket
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket.id);
      console.log("Transport:", socket.io.engine.transport.name); // shows 'websocket' or 'polling'
    });
    
    socket.on("rideStatusUpdate", (data) => {
      console.log("Ride status update received:", data);
      onRideStatusUpdate(data);
    });

    socket.on("chatMessage", (data) => {
      console.log("Chat message received:", data);
      onChatMessage(data);
    });

    socket.on("connect_error", (err) => {
      console.error("Connect error:", err.message);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [onRideStatusUpdate, onChatMessage]);

  return socketRef;
};

export default useRideWebSocket;
