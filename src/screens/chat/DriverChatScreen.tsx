import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Vibration,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { chatService, ChatMessage } from '../../services/api/chatService';
import { socketService } from '../../services/socket/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/loggerHelper';
import { authManager } from '../../types/AuthManager';
import { apiService } from '../../services/api/apiService';
import { useRNWebRTC } from '../../hooks/useWebRTC';
import { useCallMiniBar, forceHideMiniBar } from '../../contexts/CallMiniBarContext';
// ─── Global Theme ─────────────────────────────────────────────────────────────
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme';
const DriverChatScreen = () => {
  const navigation = useNavigation();
  const currentUser = authManager.getCurrentUser();
  const driverId = currentUser?.id || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<any>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected" | "declined">("idle");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioOutput, setAudioOutput] = useState<'earpiece' | 'speaker' | 'bluetooth'>('earpiece');
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const peerSocketRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    startCall,
    handleIncomingCall,
    handleAnswer,
    handleICE,
    endCall,
    localStreamRef,
    updateICETarget,
  } = useRNWebRTC();

  const { showMiniBar, updateMiniBar, hideMiniBar } = useCallMiniBar();

  // Show/hide global mini bar when outgoing call is minimized
  useEffect(() => {
    if (callState === 'connected' && isMinimized) {
      showMiniBar({
        seconds: callSeconds,
        isMuted,
        callerLabel: 'Dispatcher',
        onEnd: () => handleEndCall(),
        onToggleMute: toggleMute,
        onExpand: () => setIsMinimized(false),
      });
    } else {
      hideMiniBar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, isMinimized]);

  useEffect(() => {
    if (callState === 'connected' && isMinimized) {
      updateMiniBar({ seconds: callSeconds, isMuted });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSeconds, isMuted]);

  // Normalize message format from API or socket
  const normalizeMessage = (message: any): ChatMessage => {
    return {
      _id: message._id || message.id || '',
      driverId: message.driverId || driverId,
      senderId: {
        _id: message.senderId?._id || message.senderId || message.sender?._id || '',
        name: message.senderId?.name || message.sender?.name || message.senderName || '',
        email: message.senderId?.email || message.sender?.email || '',
      },
      senderType: message.senderType || 'driver',
      senderName: message.senderName || message.senderId?.name || message.sender?.name || '',
      message: message.message || '',
      fileUrl: message.fileUrl || null,
      fileName: message.fileName || null,
      fileType: message.fileType || null,
      fileSize: message.fileSize || null,
      readBy: message.readBy || [],
      createdAt: message.createdAt || new Date().toISOString(),
      updatedAt: message.updatedAt || new Date().toISOString(),
    };
  };

  // Load messages
  const loadMessages = async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.info('Loading driver chat messages', { driverId });
      const response = await chatService.getDriverChatMessages(driverId, 1, 100);

      logger.info('Driver chat messages API response', {
        success: response.success,
        hasData: !!response.data,
        messagesCount: response.data?.messages?.length || (response.data as any)?.data?.messages?.length || 0
      });

      // Handle nested response structure
      let messagesArray: any[] = [];
      if (response.success && response.data) {
        const rd = response.data as any;
        if (rd.data && rd.data.messages) {
          messagesArray = rd.data.messages;
        } else if (response.data.messages) {
          messagesArray = response.data.messages;
        } else if (Array.isArray(response.data)) {
          messagesArray = response.data;
        }
      }

      if (messagesArray.length > 0) {
        const normalizedMessages = messagesArray.map((msg: any) => normalizeMessage(msg));
        setMessages(normalizedMessages);
        scrollToBottom();
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      logger.error('Error loading driver chat messages', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const user = authManager.getCurrentUser();
      if (user?.id) {
        currentUserIdRef.current = user.id;
      } else {
        const storedId = await AsyncStorage.getItem('userId');
        currentUserIdRef.current = storedId;
      }
    };
    getUser();
  }, []);

  // Initialize socket and load messages
  useEffect(() => {
    if (!driverId) return;

    // Define handlers outside async function so they can be cleaned up
    const handleNewMessage = (message: any) => {
      // Skip system messages with trip status - these are only for dispatchers
      if (message.isSystemMessage || message.senderType === 'system' || message.forDispatchersOnly) {
        logger.info('Skipping system message (trip status) - only for dispatchers');
        return;
      }

      // Normalize driverId from message (handle both object and string formats)
      let messageDriverId: string = '';
      if (message.driverId) {
        if (typeof message.driverId === 'object') {
          messageDriverId = message.driverId._id?.toString() || message.driverId.toString() || '';
        } else {
          messageDriverId = String(message.driverId);
        }
      }

      // Normalize current driverId for comparison
      const currentDriverIdStr = String(driverId);

      logger.info('New message received in mobile chat', {
        messageDriverId,
        currentDriverId: currentDriverIdStr,
        match: messageDriverId === currentDriverIdStr,
        senderId: message.senderId?._id || message.senderId,
        messagePreview: message.message?.substring(0, 50)
      });

      // Only process messages with driverId matching current driver
      if (messageDriverId === currentDriverIdStr) {
        const normalized = normalizeMessage(message);

        // Check if message already exists to avoid duplicates
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === normalized._id);
          if (exists) {
            logger.info('Message already exists, skipping duplicate');
            return prev;
          }

          // Check if this is a real message that should replace an optimistic message
          const senderId = normalized.senderId._id || '';
          const currentUserId = currentUserIdRef.current || '';

          if (senderId === currentUserId) {
            // Remove optimistic messages from current user
            const filtered = prev.filter(msg => {
              if (msg._id.startsWith('temp-') && msg.senderId._id === currentUserId) {
                logger.info('Removing optimistic message:', msg._id);
                return false;
              }
              return true;
            });
            return [...filtered, normalized];
          } else {
            return [...prev, normalized];
          }
        });

        scrollToBottom();

        // Mark as read if it's not from current user
        const senderId = message.senderId?._id || message.senderId || '';
        if (senderId !== currentUserIdRef.current) {
          chatService.markDriverMessagesAsRead(driverId);
        }
      } else {
        logger.warn('Message driverId does not match current driver', {
          messageDriverId,
          currentDriverId: currentDriverIdStr
        });
      }
    };

    const handleTyping = (data: {
      userId: string;
      userName: string;
      driverId?: string;
      tripId?: string;
      orderId?: string;
      isTyping: boolean;
    }) => {
      // Only handle driver chat typing indicators (has driverId and matches current driver)
      if (data.driverId && data.driverId === driverId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userName);
          } else {
            newSet.delete(data.userName);
          }
          return newSet;
        });
      }
    };

    const initializeChat = async () => {
      try {
        // Get token using apiService (which uses 'auth_token' key)
        const token = await apiService.getStoredToken();
        if (!token) {
          logger.warn('No token found for socket authentication');
          // Still try to load messages even without socket
          loadMessages();
          return;
        }

        // Initialize socket if not connected
        if (!socketService.isSocketConnected()) {
          logger.info('Initializing socket connection');
          await socketService.initialize();
        }

        // Always authenticate socket for chat (even if already connected)
        // This ensures socketUser is set on the backend
        logger.info('Authenticating socket for chat');
        try {
          await socketService.authenticateChat(token);
          logger.info('Socket authenticated successfully');
        } catch (authError: any) {
          logger.error('Socket authentication failed', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }

        // Set up chat listeners
        socketService.onNewChatMessage(handleNewMessage);
        socketService.onUserTyping(handleTyping);

        // Set up WebRTC listeners for OUTGOING calls initiated from this screen.
        // incoming-call is handled globally by AppNavigator — do NOT register it here.
        const socket = socketService.getSocket();
        if (socket) {
          // Remove stale listeners from a previous mount before adding fresh ones
          socket.off('call-answered', onCallAnswered);
          socket.off('call-ice', onCallIce);
          socket.off('call-ended', onCallEnded);
          socket.off('call-rejected', onCallRejected);

          socket.on('call-answered', onCallAnswered);
          socket.on('call-ice', onCallIce);
          socket.on('call-ended', onCallEnded);
          socket.on('call-rejected', onCallRejected);
        }

        // Wait a bit to ensure authentication is fully processed on backend
        // This gives the backend time to set socketUser
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Join driver chat room
        logger.info('Joining driver chat room', { driverId });
        try {
          await socketService.joinDriverChat(driverId);
          logger.info('Successfully joined driver chat room');
        } catch (joinError: any) {
          logger.error('Failed to join driver chat room', joinError);
          // If join fails due to authentication, try re-authenticating
          if (joinError.message?.includes('authenticate') || joinError.message?.includes('Please authenticate')) {
            logger.info('Re-authenticating socket and retrying join');
            await socketService.authenticateChat(token);
            await new Promise(resolve => setTimeout(resolve, 500));
            await socketService.joinDriverChat(driverId);
            logger.info('Successfully joined driver chat room after re-authentication');
          } else {
            throw joinError;
          }
        }

        // Load messages
        await loadMessages();

        // Mark messages as read
        await chatService.markDriverMessagesAsRead(driverId);
      } catch (error: any) {
        logger.error('Error initializing driver chat', error);
        // Still try to load messages even if socket fails
        loadMessages();
      }
    };

    initializeChat();

    // Cleanup — only remove the specific callbacks this screen owns.
    // NEVER call socket.off('incoming-call') here: that listener belongs to
    // AppNavigator and removing it would silently kill incoming call alerts.
    return () => {
      socketService.offNewChatMessage(handleNewMessage);
      socketService.offUserTyping(handleTyping);
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('call-answered', onCallAnswered);
        socket.off('call-ice', onCallIce);
        socket.off('call-ended', onCallEnded);
        socket.off('call-rejected', onCallRejected);
      }
      // Do NOT call leaveDriverChat here — AppNavigator keeps the socket
      // in the driver chat room for global dispatcher message notifications.
    };
  }, [driverId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!driverId) return;

    const messageText = newMessage.trim();
    const fileToSend = selectedFile;

    try {
      setSending(true);

      // If file is selected, use HTTP API
      if (fileToSend) {
        const response = await chatService.sendDriverChatMessage(
          driverId,
          messageText,
          fileToSend.uri,
          fileToSend.name,
          fileToSend.mimeType
        );
        if (response.success && response.data) {
          setMessages((prev) => [...prev, normalizeMessage(response.data!)]);
          setNewMessage('');
          setSelectedFile(null);
          scrollToBottom();
        }
      } else {
        // Create optimistic message for immediate display
        const currentUser = authManager.getCurrentUser();
        const optimisticMessage: ChatMessage = {
          _id: `temp-${Date.now()}-${Math.random()}`,
          driverId: driverId,
          senderId: {
            _id: currentUser?.id || currentUserIdRef.current || '',
            name: currentUser?.name || 'You',
            email: currentUser?.email || '',
          },
          senderType: 'driver',
          senderName: currentUser?.name || 'You',
          message: messageText,
          fileUrl: undefined,
          fileName: undefined,
          fileType: undefined,
          fileSize: undefined,
          readBy: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add optimistic message immediately for instant feedback
        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');
        scrollToBottom();

        // Send via socket for real-time
        // The backend will emit the message back via socket, which will be caught by handleNewMessage
        // The real message will replace the optimistic one
        socketService.sendDriverChatMessage({
          driverId,
          message: messageText,
        });
      }
    } catch (error: any) {
      logger.error('Error sending driver chat message', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Remove optimistic message on error
      if (!fileToSend) {
        setMessages((prev) => prev.filter(msg => !msg._id.startsWith('temp-')));
      }
    } finally {
      setSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Check file size (max 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 10MB');
          return;
        }
        setSelectedFile(file);
      }
    } catch (error: any) {
      logger.error('Error selecting file', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!driverId) return;
    socketService.setDriverTyping(driverId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.setDriverTyping(driverId, false);
    }, 2000);
  };

  // Format time for message
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Format date label for date separators
  const formatDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Check if date separator should be shown between two messages
  const shouldShowDateSeparator = (current: ChatMessage, previous?: ChatMessage): boolean => {
    if (!previous) return true;
    const a = new Date(current.createdAt);
    const b = new Date(previous.createdAt);
    return (
      a.getDate() !== b.getDate() ||
      a.getMonth() !== b.getMonth() ||
      a.getFullYear() !== b.getFullYear()
    );
  };

  // Get tick status for sent messages
  const getTickIcon = (message: ChatMessage): { name: any; color: string } | null => {
    if (message.senderType !== 'driver') return null;
    const isOptimistic = message._id.startsWith('temp-');
    if (isOptimistic) return { name: 'time-outline', color: 'rgba(255,255,255,0.6)' };
    const isRead = message.readBy && message.readBy.length > 0;
    return {
      name: isRead ? 'checkmark-done' : 'checkmark-done',
      color: isRead ? '#A5F3FC' : 'rgba(255,255,255,0.6)',
    };
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  // Open file
  const handleOpenFile = async (fileUrl: string, messageId: string) => {
    try {
      const response = await chatService.getChatMessageFileSignedUrl(messageId, 'inline');
      if (response.success && response.url) {
        await Linking.openURL(response.url);
      } else {
        await Linking.openURL(fileUrl);
      }
    } catch (error: any) {
      logger.error('Error opening file', error);
      await Linking.openURL(fileUrl);
    }
  };

  const currentUserId = currentUserIdRef.current;

  // Stable named callbacks so cleanup can remove the exact same handler reference.
  // Defined as refs so they're always current without needing deps arrays.
  const onCallAnswered = useRef(({ answer, from }: any) => {
    if (from) {
      peerSocketRef.current = from;
      updateICETarget(from); // redirect buffered + future ICE to dispatcher's real socket ID
    }
    handleAnswer(answer);
    setCallState('connected');
  }).current;

  const onCallIce = useRef(({ candidate }: any) => {
    handleICE(candidate);
  }).current;

  const onCallEnded = useRef(() => {
    forceHideMiniBar(); // imperative — bypasses stale closure around handleEndCall
    handleEndCall(false);
  }).current;

  const onCallRejected = useRef(() => {
    forceHideMiniBar();
    postCallRecord('declined');
    callStartTimeRef.current = null;
    endCall();
    peerSocketRef.current = null;
    setIncomingCall(null);
    setIsMuted(false);
    setIsMinimized(false);
    setCallState('declined');
    setTimeout(() => setCallState('idle'), 2500);
  }).current;

  const callStartTimeRef = useRef<number | null>(null);
  const callStateRef     = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const postCallRecord = (type: 'ended' | 'cancelled' | 'declined', durationSecs = 0, initiatedBy: 'driver' | 'dispatcher' = 'driver') => {
    if (!driverId) return;
    const msg = JSON.stringify({ __callRecord: true, type, duration: durationSecs, initiatedBy });
    chatService.sendDriverChatMessage(driverId, msg).catch(() => {});
  };

  const formatCallTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Timer — counts while connected; also captures start time for call records
  useEffect(() => {
    if (callState === 'connected') {
      callStartTimeRef.current = Date.now();
      setCallSeconds(0);
      timerRef.current = setInterval(() => setCallSeconds(p => p + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCallSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Vibration + audio ring for incoming / ringback for outgoing
  useEffect(() => {
    const tryICM = (fn: (m: any) => void) => {
      try { fn(require('react-native-incall-manager').default); } catch {}
    };
    if (callState === 'incoming') {
      Vibration.vibrate([0, 600, 400, 600], true);
      tryICM(m => { m.start({ media: 'audio', auto: false }); m.startRingtone('_DEFAULT_'); });
    } else if (callState === 'calling') {
      tryICM(m => { m.start({ media: 'audio', auto: false }); m.startRingback('_DTMF_'); });
    } else if (callState === 'connected') {
      Vibration.cancel();
      // Start AEC session and default to earpiece (Android can default to speaker without this)
      tryICM(m => {
        m.stopRingtone(); m.stopRingback();
        m.start({ media: 'audio', auto: false });
        m.setSpeakerphoneOn(false);
        if (Platform.OS === 'android') { try { m.chooseAudioRoute?.('EARPIECE'); } catch {} }
      });
    } else {
      Vibration.cancel();
      tryICM(m => { m.stopRingtone(); m.stopRingback(); });
      if (callState === 'idle') tryICM(m => m.stop());
    }
    return () => {
      Vibration.cancel();
      tryICM(m => { m.stopRingtone(); m.stopRingback(); });
    };
  }, [callState]);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (track) { track.enabled = !track.enabled; }
    setIsMuted(p => !p);
  };

  const selectAudioOutput = (output: 'earpiece' | 'speaker' | 'bluetooth') => {
    try {
      const ICM = require('react-native-incall-manager').default;
      if (output === 'speaker') {
        ICM.setSpeakerphoneOn(true);
      } else if (output === 'earpiece') {
        ICM.setSpeakerphoneOn(false);
        // Android needs an explicit route; iOS honours setSpeakerphoneOn(false) alone
        if (Platform.OS === 'android') {
          try { ICM.chooseAudioRoute?.('EARPIECE'); } catch {}
        }
      } else if (output === 'bluetooth') {
        ICM.setSpeakerphoneOn(false);
        try { ICM.chooseAudioRoute?.('BLUETOOTH_HEADSET'); } catch {}
      }
    } catch {}
    setAudioOutput(output);
    setShowAudioPicker(false);
  };

  const handleStartCall = async () => {
    if (callState !== "idle") return;
    setCallState("calling");
    await startCall(driverId);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    Vibration.cancel();
    peerSocketRef.current = incomingCall.from;
    await handleIncomingCall(incomingCall.offer, incomingCall.from);
    setCallState("connected");
  };

  const rejectCall = () => {
    Vibration.cancel();
    if (incomingCall?.from) {
      socketService.getSocket()?.emit('call-rejected', { to: incomingCall.from });
    }
    setIncomingCall(null);
    peerSocketRef.current = null;
    setIsMuted(false);
    setIsMinimized(false);
    setCallState("idle");
  };

  const handleEndCall = (notifyPeer = true) => {
    Vibration.cancel();
    hideMiniBar();
    // Post call record (driver is always the caller in this screen)
    const cs  = callStateRef.current;
    const dur = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
    if (cs === 'connected') postCallRecord('ended', dur);
    else if (cs === 'calling' && notifyPeer) postCallRecord('cancelled');
    callStartTimeRef.current = null;
    if (notifyPeer) {
      if (peerSocketRef.current) {
        socketService.getSocket()?.emit('call-end', { to: peerSocketRef.current });
      } else if (cs === 'calling') {
        // Call was never answered — dispatcher's socket ID is unknown.
        // Server will route to the company dispatcher room via cancelRinging flag.
        socketService.getSocket()?.emit('call-end', { cancelRinging: true });
      }
    }
    endCall();
    peerSocketRef.current = null;
    setIsMuted(false);
    setIsMinimized(false);
    setCallState("idle");
    setIncomingCall(null);
  };

  // Precompute per-message display metadata so renderItem doesn't need array index lookups
  const messagesWithMeta = useMemo(() =>
    messages.map((message, index) => ({
      message,
      prevSenderId: index > 0 ? messages[index - 1].senderId._id : null,
      nextSenderId: index < messages.length - 1 ? messages[index + 1].senderId._id : null,
      prevCreatedAt: index > 0 ? messages[index - 1].createdAt : null,
      isLast: index === messages.length - 1,
    })), [messages]);

  const renderMessageItem = useCallback(({ item }: { item: (typeof messagesWithMeta)[0] }) => {
    const { message, prevSenderId, nextSenderId, prevCreatedAt, isLast } = item;

    // Call record pill
    if (message.message?.startsWith('{"__callRecord"')) {
      let rec: any = null;
      try { rec = JSON.parse(message.message); } catch {}
      if (rec?.__callRecord) {
        const dur = rec.duration || 0;
        const durStr = dur > 0
          ? `${String(Math.floor(dur / 60)).padStart(2, '0')}:${String(dur % 60).padStart(2, '0')}`
          : '';
        const byDriver     = rec.initiatedBy === 'driver';
        const byDispatcher = rec.initiatedBy === 'dispatcher';
        let label = '';
        let iconName: any = 'call-outline';
        let color = '#6b7280';
        let bgColor = 'rgba(107,114,128,0.12)';
        if (rec.type === 'ended') {
          label = byDriver ? `Outgoing call${durStr ? ' · ' + durStr : ''}` : byDispatcher ? `Incoming call${durStr ? ' · ' + durStr : ''}` : `Call ended${durStr ? ' · ' + durStr : ''}`;
          iconName = byDriver ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline';
          color = '#16a34a'; bgColor = 'rgba(22,163,74,0.12)';
        } else if (rec.type === 'cancelled') {
          label = byDriver ? 'You cancelled' : byDispatcher ? 'Dispatcher cancelled' : 'Call cancelled';
          iconName = 'close-circle-outline';
          color = '#6b7280'; bgColor = 'rgba(107,114,128,0.12)';
        } else if (rec.type === 'declined') {
          label = byDriver ? 'Dispatcher declined' : byDispatcher ? 'You declined' : 'Call declined';
          iconName = 'call-outline';
          color = '#ef4444'; bgColor = 'rgba(239,68,68,0.12)';
        } else {
          label = 'Missed call';
          iconName = 'call-outline';
          color = '#ef4444'; bgColor = 'rgba(239,68,68,0.12)';
        }
        const timeStr = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: bgColor, borderWidth: 1, borderColor: color + '33' }}>
              <Ionicons name={iconName} size={13} color={color} />
              <Text style={{ fontSize: 12, color, fontWeight: '600', letterSpacing: 0.1 }}>{label}</Text>
            </View>
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>{timeStr}</Text>
          </View>
        );
      }
    }

    const isRightSide = message.senderType === 'driver';
    const showAvatar = !prevSenderId || prevSenderId !== message.senderId._id;
    const isLastInGroup = isLast || nextSenderId !== message.senderId._id;
    const showDateSep = shouldShowDateSeparator(message, prevCreatedAt ? { createdAt: prevCreatedAt } as any : undefined);
    const tick = getTickIcon(message);

    return (
      <React.Fragment>
        {showDateSep && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{formatDateLabel(message.createdAt)}</Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        <View
          style={[
            styles.messageWrapper,
            isRightSide ? styles.messageWrapperRight : styles.messageWrapperLeft,
            !isLastInGroup && { marginBottom: 2 },
          ]}
        >
          {!isRightSide && showAvatar && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(message.senderName || 'D').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {!isRightSide && !showAvatar && <View style={styles.avatarPlaceholder} />}

          <View
            style={[
              styles.messageBubble,
              isRightSide ? styles.messageBubbleRight : styles.messageBubbleLeft,
              isRightSide && isLastInGroup && styles.bubbleTailRight,
              !isRightSide && isLastInGroup && styles.bubbleTailLeft,
            ]}
          >
            {!isRightSide && showAvatar && (
              <Text style={styles.senderName}>{message.senderName}</Text>
            )}
            {message.message ? (
              <Text
                style={[
                  styles.messageText,
                  isRightSide ? styles.messageTextRight : styles.messageTextLeft,
                ]}
              >
                {message.message}
              </Text>
            ) : null}
            {message.fileUrl && (
              <TouchableOpacity
                onPress={() => handleOpenFile(message.fileUrl!, message._id)}
                style={[
                  styles.fileButton,
                  isRightSide ? styles.fileButtonRight : styles.fileButtonLeft,
                ]}
              >
                <Ionicons
                  name={message.fileType === 'image' ? 'image' : 'document'}
                  size={20}
                  color={isRightSide ? '#fff' : '#8B5CF6'}
                />
                <Text
                  style={[
                    styles.fileName,
                    isRightSide ? styles.fileNameRight : styles.fileNameLeft,
                  ]}
                >
                  {message.fileName || 'File'}
                </Text>
                {message.fileSize && (
                  <Text
                    style={[
                      styles.fileSize,
                      isRightSide ? styles.fileSizeRight : styles.fileSizeLeft,
                    ]}
                  >
                    {formatFileSize(message.fileSize)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <View style={[styles.messageFooter, isRightSide && styles.messageFooterRight]}>
              <Text
                style={[
                  styles.messageTime,
                  isRightSide ? styles.messageTimeRight : styles.messageTimeLeft,
                ]}
              >
                {formatTime(message.createdAt)}
              </Text>
              {tick && (
                <Ionicons
                  name={tick.name}
                  size={14}
                  color={tick.color}
                  style={styles.tickIcon}
                />
              )}
            </View>
          </View>
        </View>
      </React.Fragment>
    );
  }, []);

  const listEmptyComponent = loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.accentNavyBlue} />
      <Text style={styles.loadingText}>Loading messages...</Text>
    </View>
  ) : (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.accentNavyBlue} />
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Start the conversation with your dispatcher!</Text>
    </View>
  );

  const listFooterComponent = typingUsers.size > 0 ? (
    <View style={[styles.messageWrapper, styles.messageWrapperLeft]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>D</Text>
      </View>
      <View style={[styles.messageBubble, styles.messageBubbleLeft]}>
        <View style={styles.typingIndicator}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
        <Text style={styles.typingText}>
          {Array.from(typingUsers).join(', ')} typing...
        </Text>
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>D</Text>
              <View style={styles.headerOnlineDot} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Dispatcher</Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.headerOnlineDotInline} />
                <Text style={styles.headerSubtitle}>Online</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleStartCall} style={styles.callButton} disabled={callState !== "idle"}>
            <Ionicons name={callState === "calling" ? "call" : "call-outline"} size={22} color={callState === "calling" ? "#4ADE80" : "#fff"} />
          </TouchableOpacity>

        </View>

        {/* Messages Container */}
        <FlatList
          ref={flatListRef}
          data={messagesWithMeta}
          keyExtractor={(item) => item.message._id}
          renderItem={renderMessageItem}
          style={styles.messagesContainer}
          contentContainerStyle={messagesWithMeta.length === 0 ? styles.messagesContentEmpty : styles.messagesContent}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
          extraData={messages}
          removeClippedSubviews={true}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* File Preview */}
        {selectedFile && (
          <View style={styles.filePreview}>
            <View style={styles.filePreviewContent}>
              <Ionicons name="document" size={24} color="#8B5CF6" />
              <View style={styles.filePreviewInfo}>
                <Text style={styles.filePreviewName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                {selectedFile.size && (
                  <Text style={styles.filePreviewSize}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedFile(null)}
              style={styles.filePreviewClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handleFileSelect}
            style={styles.attachButton}
          >
            <Ionicons name="attach" size={24} color="#8B5CF6" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              handleTyping();
            }}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={sending || (!newMessage.trim() && !selectedFile)}
            style={[
              styles.sendButton,
              (sending || (!newMessage.trim() && !selectedFile)) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* ── Full call overlay — Modal so it persists above all screens ─────── */}
      <Modal
        visible={callState === 'calling' || callState === 'incoming' || (callState === 'connected' && !isMinimized) || callState === 'declined'}
        transparent={false}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={csStyles.overlay}>
          {callState === 'declined' ? (
            <View style={csStyles.center}>
              <View style={[csStyles.avatar, { backgroundColor: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }]}>
                <Ionicons name="call" size={40} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </View>
              <Text style={csStyles.name}>Call Declined</Text>
              <Text style={csStyles.status}>The call was not accepted</Text>
            </View>
          ) : (
            <>
              {/* Top bar */}
              <View style={csStyles.topBar}>
                <View style={{ width: 36 }} />
                <Text style={csStyles.topLabel}>
                  {callState === 'incoming' ? 'Incoming Call' : callState === 'connected' ? 'On Call' : 'Calling...'}
                </Text>
                {callState === 'connected' ? (
                  <TouchableOpacity onPress={() => setIsMinimized(true)} style={csStyles.iconBtn}>
                    <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                ) : <View style={{ width: 36 }} />}
              </View>

              {/* Center */}
              <View style={csStyles.center}>
                <View style={[csStyles.avatar, callState === 'incoming' && { borderColor: '#22c55e', borderWidth: 3 }]}>
                  <Text style={csStyles.avatarText}>D</Text>
                </View>
                <Text style={csStyles.name}>Dispatcher</Text>
                <Text style={[csStyles.status, callState === 'connected' && { color: '#22c55e' }]}>
                  {callState === 'connected' ? formatCallTime(callSeconds) : callState === 'incoming' ? 'Incoming…' : 'Calling…'}
                </Text>
              </View>

              {/* Bottom controls */}
              <View style={csStyles.bottom}>
                {callState === 'connected' && (
                  <View style={csStyles.controlRow}>
                    <View style={csStyles.controlWrap}>
                      <TouchableOpacity style={[csStyles.controlBtn, isMuted && csStyles.controlBtnOn]} onPress={toggleMute}>
                        <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
                      </TouchableOpacity>
                      <Text style={csStyles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                    </View>
                    <View style={csStyles.controlWrap}>
                      <TouchableOpacity style={[csStyles.controlBtn, audioOutput !== 'earpiece' && csStyles.controlBtnOn]} onPress={() => setShowAudioPicker(true)}>
                        <Ionicons name={audioOutput === 'speaker' ? 'volume-high' : audioOutput === 'bluetooth' ? 'bluetooth' : 'volume-medium'} size={24} color="#fff" />
                      </TouchableOpacity>
                      <Text style={csStyles.controlLabel}>{audioOutput === 'speaker' ? 'Speaker' : audioOutput === 'bluetooth' ? 'Bluetooth' : 'Earpiece'}</Text>
                    </View>
                  </View>
                )}
                <View style={csStyles.actionRow}>
                  {callState === 'incoming' && (
                    <View style={csStyles.controlWrap}>
                      <TouchableOpacity style={csStyles.acceptBtn} onPress={acceptCall}>
                        <Ionicons name="call" size={30} color="#fff" />
                      </TouchableOpacity>
                      <Text style={csStyles.actionLabel}>Accept</Text>
                    </View>
                  )}
                  <View style={csStyles.controlWrap}>
                    <TouchableOpacity
                      style={csStyles.rejectBtn}
                      onPress={callState === 'incoming' ? rejectCall : () => handleEndCall()}
                    >
                      <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>
                    <Text style={csStyles.actionLabel}>{callState === 'incoming' ? 'Decline' : 'End Call'}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ── Audio Output Picker ────────────────────────────────────────────── */}
      <Modal visible={showAudioPicker} transparent animationType="fade" onRequestClose={() => setShowAudioPicker(false)}>
        <TouchableOpacity style={csStyles.pickerBackdrop} activeOpacity={1} onPress={() => setShowAudioPicker(false)}>
          <View style={csStyles.pickerSheet}>
            <View style={csStyles.pickerHandle} />
            <Text style={csStyles.pickerTitle}>Audio Output</Text>
            {([
              { id: 'earpiece',  label: 'Earpiece',  sub: 'Phone speaker',  icon: 'phone-portrait-outline' },
              { id: 'speaker',   label: 'Speaker',   sub: 'Loud speaker',   icon: 'volume-high-outline'    },
              { id: 'bluetooth', label: 'Bluetooth', sub: 'Wireless audio', icon: 'bluetooth-outline'      },
            ] as const).map(opt => {
              const active = audioOutput === opt.id;
              return (
                <TouchableOpacity key={opt.id} style={[csStyles.pickerOption, active && csStyles.pickerOptionActive]} onPress={() => selectAudioOutput(opt.id)}>
                  <View style={[csStyles.pickerIcon, active && csStyles.pickerIconActive]}>
                    <Ionicons name={opt.icon} size={20} color={active ? '#fff' : '#8b9cb6'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[csStyles.pickerLabel, active && { color: '#fff' }]}>{opt.label}</Text>
                    <Text style={csStyles.pickerSub}>{opt.sub}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#1976D2" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accentNavyBlue,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  header: {
    backgroundColor: COLORS.accentNavyBlue,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: COLORS.accentNavyBlue,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerOnlineDotInline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 8,
  },
  messagesContentEmpty: {
    flex: 1,
    padding: 12,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.accentBlue,
    opacity: 0.5,
  },
  dateSeparatorText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: COLORS.accentBlue,
    fontWeight: '600',
    backgroundColor: COLORS.bgCardLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageWrapperLeft: {
    justifyContent: 'flex-start',
  },
  messageWrapperRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentNavyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 34,
    marginRight: 6,
  },
  avatarText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  messageBubbleLeft: {
    backgroundColor: COLORS.bgCardLight,
    borderBottomLeftRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  messageBubbleRight: {
    backgroundColor: COLORS.accentNavyBlue,
    borderBottomRightRadius: 18,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleTailLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleTailRight: {
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentNavyBlue,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextLeft: {
    color: COLORS.textPrimary,
  },
  messageTextRight: {
    color: COLORS.textPrimary,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    padding: 8,
    borderRadius: 10,
  },
  fileButtonLeft: {
    backgroundColor: COLORS.accentNavyBlue,
  },
  fileButtonRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  fileName: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  fileNameLeft: {
    color: COLORS.textPrimary,
  },
  fileNameRight: {
    color: '#fff',
  },
  fileSize: {
    fontSize: 11,
    marginLeft: 6,
  },
  fileSizeLeft: {
    color: '#6B7280',
  },
  fileSizeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageFooterRight: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeLeft: {
    color: '#9CA3AF',
  },
  messageTimeRight: {
    color: 'rgba(255,255,255,0.65)',
  },
  tickIcon: {
    marginLeft: 3,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginRight: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCardLight,
    borderTopWidth: 1,
    borderTopColor: '#DDD6FE',
  },
  filePreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filePreviewInfo: {
    marginLeft: 10,
    flex: 1,
  },
  filePreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  filePreviewSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  filePreviewClose: {
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCardLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.accentNavyBlue,
  },
  attachButton: {
    marginRight: 6,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 22,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.accentNavyBlue,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentNavyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.45,
    elevation: 0,
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  callOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  callAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callAvatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  callName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  callStatusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginBottom: 60,
  },
  callButtons: {
    flexDirection: 'row',
    gap: 40,
  },
  callText: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 20,
  },
  callBtnLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  acceptBtn: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
  },
  rejectBtn: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
  },
});

const csStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0f0f1a', zIndex: 999, flex: 1,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
  },
  topLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#1976D2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#1976D2', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  avatarText: { color: '#fff', fontSize: 44, fontWeight: '700' },
  name: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  status: { color: 'rgba(255,255,255,0.55)', fontSize: 18, fontWeight: '500', letterSpacing: 1 },
  bottom: { paddingBottom: 48, paddingHorizontal: 24, alignItems: 'center' },
  controlRow: { flexDirection: 'row', gap: 28, marginBottom: 32 },
  controlWrap: { alignItems: 'center', gap: 8 },
  controlBtn: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnOn: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.3)' },
  controlLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 48 },
  acceptBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#22c55e',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  rejectBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  actionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  miniBar: {
    position: 'absolute', bottom: 70, left: 12, right: 12,
    backgroundColor: '#1a1a2e', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', zIndex: 999,
  },
  miniAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#1976D2',
    justifyContent: 'center', alignItems: 'center',
  },
  miniName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  miniTimer: { color: '#22c55e', fontSize: 11, fontWeight: '500' },
  miniBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  // Audio output picker
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#141428', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  pickerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerOptionActive: { backgroundColor: 'rgba(25,118,210,0.15)', borderColor: '#1976D2' },
  pickerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  pickerIconActive: { backgroundColor: '#1976D2' },
  pickerLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  pickerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
});

export default DriverChatScreen;

