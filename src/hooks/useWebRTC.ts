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
  // Mutable ICE target — updated to real peer socket ID once the answer arrives
  const iceTargetRef   = useRef<string>('');
  const iceTargetKnownRef = useRef<boolean>(false);
  const iceBufferRef   = useRef<any[]>([]);

  // Call when the peer's real socket ID becomes known (answer received).
  // Flushes any ICE candidates that were buffered before the answer.
  const updateICETarget = (socketId: string) => {
    iceTargetRef.current = socketId;
    iceTargetKnownRef.current = true;
    const buffered = iceBufferRef.current.splice(0);
    for (const candidate of buffered) {
      socketService.sendIceCandidate({ to: socketId, candidate });
    }
  };

  const createPeer = (to: string) => {
    // Reset ICE state for new call
    iceTargetRef.current = to;
    iceTargetKnownRef.current = false;
    iceBufferRef.current = [];

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

    // 🧊 ICE — buffer candidates until the real peer socket ID is known
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        if (iceTargetKnownRef.current) {
          socketService.sendIceCandidate({ to: iceTargetRef.current, candidate: event.candidate });
        } else {
          iceBufferRef.current.push(event.candidate);
        }
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

      // Start InCallManager BEFORE getUserMedia so Android sets MODE_IN_COMMUNICATION
      // early enough for WebRTC to use STREAM_VOICE_CALL (earpiece-capable) audio track.
      try { require('react-native-incall-manager').default.start({ media: 'audio', auto: false }); } catch {}

      const pc = createPeer(from);

      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
        video: false
      });

      // Default to earpiece right after stream is ready
      try { require('react-native-incall-manager').default.setSpeakerphoneOn(false); } catch {}
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

      // Start InCallManager BEFORE getUserMedia — same timing fix as handleIncomingCall
      try { require('react-native-incall-manager').default.start({ media: 'audio', auto: false }); } catch {}

      const pc = createPeer(to);

      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
        video: false
      });

      // Default to earpiece right after stream is ready
      try { require('react-native-incall-manager').default.setSpeakerphoneOn(false); } catch {}
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
    endCall,
    localStreamRef,
    updateICETarget,
  };
};