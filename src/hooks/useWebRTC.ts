import { useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import socketService from "../services/socket/socketService";

const requestMicPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Microphone Permission",
      message: "This app needs microphone access for voice calls.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const useRNWebRTC = () => {
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);

  const createPeer = (to: string) => {
    const pc: any = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]
    });

    console.log("🧠 Peer created");

    // Remote audio — store the stream so it plays through speaker
    pc.onaddstream = (event: any) => {
      console.log("🎧 Remote stream received, tracks:", event.stream?.getTracks()?.length);
      remoteStreamRef.current = event.stream;
    };

    pc.ontrack = (event: any) => {
      console.log("🎧 ontrack fired");
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      }
    };

    // 🧊 ICE
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE");

        socketService.sendIceCandidate({
          to,
          candidate: event.candidate
        });
      }
    };

    pcRef.current = pc;
    return pc;
  };

  // 📲 ACCEPT CALL
  const handleIncomingCall = async (offer: any, from: string) => {
    try {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        console.error("❌ Microphone permission denied");
        return;
      }

      const pc = createPeer(from);

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      localStreamRef.current = stream;

      if ((pc as any).addStream) {
        (pc as any).addStream(stream);
      } else {
        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
      }

      console.log("📡 Setting remote offer");

      await pc.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("📡 Sending answer");

      socketService.answerCall({
        to: from,
        answer
      });
    } catch (err) {
      console.error("❌ Incoming call error:", err);
    }
  };

  // 🤝 HANDLE ANSWER
  const handleAnswer = async (answer: any) => {
    try {
      if (!pcRef.current) return;

      console.log("📡 Received answer");

      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (err) {
      console.error("❌ Answer error:", err);
    }
  };

  // 🧊 HANDLE ICE
  const handleICE = async (candidate: any) => {
    try {
      if (!pcRef.current) return;

      console.log("🧊 Received ICE");

      await pcRef.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch (err) {
      console.error("❌ ICE error:", err);
    }
  };

  // 📞 START CALL (driver initiates)
  const startCall = async (to: string) => {
    try {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        console.error("❌ Microphone permission denied");
        return;
      }

      const pc = createPeer(to);

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      localStreamRef.current = stream;

      if ((pc as any).addStream) {
        (pc as any).addStream(stream);
      } else {
        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
      }

      console.log("📡 Creating offer");

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await pc.setLocalDescription(offer);

      console.log("📡 Sending offer");

      socketService.callUser({ to, offer });
    } catch (err) {
      console.error("❌ Start call error:", err);
    }
  };

  // 🔚 END CALL
  const endCall = () => {
    console.log("📴 Ending call");
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    remoteStreamRef.current = null;
  };

  return {
    startCall,
    handleIncomingCall,
    handleAnswer,
    handleICE,
    endCall
  };
};