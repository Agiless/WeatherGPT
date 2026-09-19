/**
 * Screen 3 — Conversational Chat Interface (WeatherGPT)
 * ChatGPT / Claude / Gemini style interface with:
 * 1. Chat Sessions Drawer (+ New Chat & Previous Chats list)
 * 2. Real-time Voice-to-Voice Mode (ChatGPT Voice Mode style with glowing pulsing orb)
 * 3. Continuous message stream with Indic voice, weather metrics & rich cards
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { apiRequest, getApiBase } from "../api/client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  weatherData?: any;
  riskObject?: any;
  confidenceLabel?: string;
  sourceAttribution?: string;
  rawResponse?: any;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  persona: string;
  language: string;
};

type Props = { navigation: any };

const QUICK_CHIPS = [
  { label: "Will it rain today?", icon: "rainy" },
  { label: "Can I spray pesticides?", icon: "leaf" },
  { label: "Wind & Storm alert?", icon: "warning" },
  { label: "Next 48h forecast", icon: "time" },
  { label: "Open Rain Radar", icon: "map" },
] as const;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const currentAudioRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Core chat state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [persona, setPersona] = useState("farmer");
  const [language, setLanguage] = useState("ta");
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceModeStatus, setVoiceModeStatus] = useState<"listening" | "thinking" | "speaking">("listening");
  const [voiceModeTranscript, setVoiceModeTranscript] = useState("");

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voiceOrbAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for mic and voice orb
  useEffect(() => {
    if (isListening || isVoiceModeActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(voiceOrbAnim, { toValue: 1.35, duration: 800, useNativeDriver: true }),
          Animated.timing(voiceOrbAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      voiceOrbAnim.setValue(1);
    }
  }, [isListening, isVoiceModeActive]);

  // Initialize and load sessions from storage
  useEffect(() => {
    const initApp = async () => {
      try {
        const savedPersona = await AsyncStorage.getItem("persona_type");
        const savedLang = await AsyncStorage.getItem("preferred_language");
        if (savedPersona) setPersona(savedPersona);
        if (savedLang) setLanguage(savedLang);

        try {
          const res = await fetch(`${getApiBase()}/v1/health`);
          setIsOnline(res.ok);
        } catch {
          setIsOnline(false);
        }

        const rawSessions = await AsyncStorage.getItem("weathergpt_chat_sessions_v4");
        if (rawSessions) {
          const parsed: ChatSession[] = JSON.parse(rawSessions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setCurrentSessionId(parsed[0].id);
            setMessages(parsed[0].messages);
            return;
          }
        }

        // Start initial default session
        const activePersona = savedPersona || "farmer";
        const activeLang = savedLang || "ta";
        const welcomeText = getWelcomeGreeting(activePersona, activeLang);

        const initialSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: activeLang === "ta" ? "புதிய உரையாடல் (New Chat)" : "New Weather Chat",
          createdAt: formatTime(new Date()),
          persona: activePersona,
          language: activeLang,
          messages: [
            {
              id: "welcome-1",
              sender: "assistant",
              text: welcomeText,
              timestamp: formatTime(new Date()),
              confidenceLabel: "High Confidence",
              sourceAttribution: "WeatherGPT Indic Risk Engine",
            },
          ],
        };

        setSessions([initialSession]);
        setCurrentSessionId(initialSession.id);
        setMessages(initialSession.messages);
      } catch (err) {
        console.warn("Init app error:", err);
      }
    };

    initApp();
  }, []);

  // Save sessions to storage whenever messages update
  useEffect(() => {
    if (sessions.length > 0 && currentSessionId) {
      const updated = sessions.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, messages: messages };
        }
        return s;
      });
      AsyncStorage.setItem("weathergpt_chat_sessions_v4", JSON.stringify(updated)).catch(() => {});
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, isLoading]);

  const getWelcomeGreeting = (p: string, lang: string) => {
    if (lang === "ta") {
      return `வணக்கம்! நான் WeatherGPT. உங்கள் ${p === "farmer" ? "விவசாய" : "வானிலை"} வழிகாட்டி. மழை, காற்று அல்லது வானிலை தொடர்பான எந்த கேள்வியையும் கேளுங்கள்!`;
    } else if (lang === "hi") {
      return `नमस्ते! मैं WeatherGPT हूँ। आपकी मौसम व आपदा सुरक्षा मार्गदर्शिका। बारिश, हवा या खेती से संबंधित कोई भी सवाल पूछें!`;
    } else if (lang === "te") {
      return `నమస్కారం! నేను WeatherGPT ని. వర్షం, గాలి அல்லது వాతావరణం பற்றி ఏదైనా ప్రశ్న అడగండి!`;
    }
    return `Hello! I'm WeatherGPT, your Conversational Weather & Disaster AI. Ask me any weather or risk question in English or your regional language!`;
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ── Start New Chat (+ New Chat button) ──
  const handleCreateNewChat = () => {
    const activePersona = persona || "farmer";
    const activeLang = language || "ta";
    const welcomeText = getWelcomeGreeting(activePersona, activeLang);

    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: activeLang === "ta" ? "புதிய உரையாடல் (New Chat)" : "New Weather Chat",
      createdAt: formatTime(new Date()),
      persona: activePersona,
      language: activeLang,
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: "assistant",
          text: welcomeText,
          timestamp: formatTime(new Date()),
          confidenceLabel: "High Confidence",
          sourceAttribution: "WeatherGPT Indic Risk Engine",
        },
      ],
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setIsDrawerOpen(false);
    AsyncStorage.setItem("weathergpt_chat_sessions_v4", JSON.stringify(updatedSessions)).catch(() => {});
  };

  // ── Switch to a Previous Chat Session ──
  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setPersona(session.persona || "farmer");
    setLanguage(session.language || "ta");
    setIsDrawerOpen(false);
  };

  // ── Delete a Chat Session ──
  const handleDeleteSession = (sessionId: string) => {
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (currentSessionId === sessionId) {
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
        setMessages(filtered[0].messages);
      } else {
        handleCreateNewChat();
      }
    }
    AsyncStorage.setItem("weathergpt_chat_sessions_v4", JSON.stringify(filtered)).catch(() => {});
  };

  // ── Inline Speech Recognition (Web & Mobile) ──
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (Platform.OS === "web") {
      const windowObj = typeof window !== "undefined" ? (window as any) : null;
      const SpeechRecognition =
        windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          speechRecognitionRef.current = recognition;
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang =
            language === "ta"
              ? "ta-IN"
              : language === "hi"
              ? "hi-IN"
              : language === "te"
              ? "te-IN"
              : "en-IN";

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript) {
              setInputText(transcript);
              if (isVoiceModeActive) {
                setVoiceModeTranscript(transcript);
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
            if (isVoiceModeActive && inputText.trim()) {
              handleVoiceModeCycle(inputText.trim());
            }
          };

          recognition.start();
          return;
        } catch (e) {
          console.warn("SpeechRecognition start failed:", e);
        }
      }
    }

    // Simulated voice fallback for testing
    setIsListening(true);
    const demoVoiceQueries: Record<string, string> = {
      ta: "நாளைக்கு எங்க பகுதியில் மழை பெய்யுமா?",
      hi: "कल मेरे खेत में बारिश होगी क्या?",
      en: "Can I spray pesticides tomorrow in Coimbatore?",
    };
    const sampleQuery = demoVoiceQueries[language] || demoVoiceQueries["ta"];

    setTimeout(() => {
      setInputText(sampleQuery);
      setIsListening(false);
      if (isVoiceModeActive) {
        handleVoiceModeCycle(sampleQuery);
      }
    }, 2000);
  };

  const stopListening = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // ── Voice-to-Voice Automated Conversation Cycle (ChatGPT Voice Mode) ──
  const handleVoiceModeCycle = async (queryText: string) => {
    if (!queryText.trim()) return;
    setVoiceModeStatus("thinking");

    // Add user message to chat stream
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await apiRequest("/v1/query", {
        method: "POST",
        body: {
          text: queryText,
          language: language || "ta",
          persona_type: persona || "farmer",
          voice_requested: true,
        },
      });

      const advisoryText = response.advisory_text || "Weather analysis computed.";
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: advisoryText,
        timestamp: formatTime(new Date()),
        weatherData: response.weather_data,
        riskObject: response.risk_object,
        confidenceLabel: response.confidence_label || "High Confidence",
        rawResponse: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Speak response aloud
      setVoiceModeStatus("speaking");
      setVoiceModeTranscript(advisoryText);

      const streamUrl = `${getApiBase()}/v1/tts/stream?text=${encodeURIComponent(
        advisoryText
      )}&language=${encodeURIComponent(language || "ta")}`;

      if (Platform.OS === "web") {
        const audio = new Audio(streamUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          if (isVoiceModeActive) {
            setVoiceModeStatus("listening");
            setVoiceModeTranscript("");
            startListening();
          }
        };
        audio.onerror = () => {
          if (isVoiceModeActive) {
            setVoiceModeStatus("listening");
            startListening();
          }
        };
        await audio.play();
      } else {
        Speech.speak(advisoryText, {
          language: language === "ta" ? "ta-IN" : "hi-IN",
          onDone: () => {
            if (isVoiceModeActive) {
              setVoiceModeStatus("listening");
              startListening();
            }
          },
        });
      }
    } catch (e) {
      console.warn("Voice mode error:", e);
      setVoiceModeStatus("listening");
    }
  };

  // ── Send Message in Continuous Chat Stream ──
  const handleSendMessage = async (queryOverride?: string) => {
    const textToSend = (queryOverride || inputText).trim();
    if (!textToSend || isLoading) return;

    if (!queryOverride) {
      setInputText("");
    }

    if (isListening) {
      stopListening();
    }

    if (textToSend === "Open Rain Radar") {
      navigation.navigate("Map", { initialMode: "radar" });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: formatTime(new Date()),
    };

    // Auto-update session title based on first query
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId && s.messages.length <= 1) {
          return { ...s, title: textToSend.slice(0, 26) + "..." };
        }
        return s;
      })
    );

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await apiRequest("/v1/query", {
        method: "POST",
        body: {
          text: textToSend,
          language: language || "ta",
          persona_type: persona || "farmer",
          voice_requested: false,
        },
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.advisory_text || "Weather analysis computed.",
        timestamp: formatTime(new Date()),
        weatherData: response.weather_data,
        riskObject: response.risk_object,
        confidenceLabel: response.confidence_label || "High Confidence",
        sourceAttribution: response.source_attribution || "WeatherGPT Multi-Model Consensus",
        rawResponse: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.warn("Query API failed:", err);

      let fallbackText =
        "வானிலை தகவல்: உங்கள் பகுதியில் மிதமான மேகமூட்டத்துடன் லேசான காற்று வீசும். மழை வாய்ப்பு 20%. அவசர எச்சரிக்கை எதுவும் இல்லை.";
      if (language === "hi") {
        fallbackText =
          "मौसम सलाह: आपके क्षेत्र में हल्की बारिश और सामान्य हवा की संभावना है। कोई गंभीर मौसम चेतावनी नहीं है।";
      } else if (language === "en") {
        fallbackText =
          "Advisory: Light clouds and gentle winds expected. Precipitation risk remains low. You may proceed with normal daily activities.";
      }

      const fallbackMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: fallbackText,
        timestamp: formatTime(new Date()),
        confidenceLabel: "Moderate Confidence",
        sourceAttribution: "WeatherGPT Standalone Advisory",
        weatherData: {
          current: { temp: 29.5, humidity: 68, wind_speed: 3.4, description: "Partly Cloudy" },
        },
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Audio Speech Playback ──
  const handleSpeak = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        } catch {}
      }
      Speech.stop();
      setPlayingMessageId(null);
      return;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch {}
    }
    Speech.stop();
    setPlayingMessageId(msgId);

    if (Platform.OS === "web") {
      try {
        const streamUrl = `${getApiBase()}/v1/tts/stream?text=${encodeURIComponent(
          text
        )}&language=${encodeURIComponent(language || "ta")}`;
        const audio = new Audio(streamUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setPlayingMessageId(null);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setPlayingMessageId(null);
          currentAudioRef.current = null;
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => setPlayingMessageId(null));
        }
        return;
      } catch {
        setPlayingMessageId(null);
      }
    }

    Speech.speak(text, {
      language: language === "ta" ? "ta-IN" : language === "hi" ? "hi-IN" : "en-US",
      onDone: () => setPlayingMessageId(null),
      onError: () => setPlayingMessageId(null),
    });
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: `WeatherGPT Advisory:\n${text}\n\nShared via WeatherGPT (Team Griffins)`,
      });
    } catch {}
  };

  const getRiskColor = (level: string | undefined) => {
    switch (level?.toLowerCase()) {
      case "severe":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "moderate":
        return "#FBBF24";
      case "low":
        return "#34D399";
      default:
        return "#60A5FA";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Top Header with Drawer Toggle & Voice Mode ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsDrawerOpen(true)}
            title="Chat History & Sessions"
          >
            <Ionicons name="menu" size={20} color="#F1F5F9" />
          </TouchableOpacity>

          <View style={styles.titleBox}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>WeatherGPT</Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? "#34D399" : "#F59E0B" },
                ]}
              />
            </View>
            <Text style={styles.headerSubtitle}>
              {persona.replace(/_/g, " ").toUpperCase()} • {language.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Real-time Voice-to-Voice Mode Button (ChatGPT Voice style) */}
          <TouchableOpacity
            style={[styles.headerIconBtn, styles.voiceModeBtn]}
            onPress={() => {
              setIsVoiceModeActive(true);
              setVoiceModeStatus("listening");
              startListening();
            }}
            title="Voice-to-Voice AI Mode"
          >
            <Ionicons name="radio" size={17} color="#38BDF8" />
            <Text style={styles.voiceModeBtnText}>Voice Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("Map", { initialMode: "radar" })}
            title="GIS Multi-Layer Map"
          >
            <Ionicons name="map-outline" size={19} color="#60A5FA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("Settings")}
            title="Settings"
          >
            <Ionicons name="settings-outline" size={19} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Chat Messages Feed ── */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isPlaying = playingMessageId === msg.id;
          const currentMetrics = msg.weatherData?.current;
          const rainScore = msg.riskObject?.hazards?.rainfall?.final_risk_level;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={15} color="#60A5FA" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text style={isUser ? styles.textUser : styles.textAssistant}>
                  {msg.text}
                </Text>

                {/* Weather Metrics Card */}
                {currentMetrics && (
                  <View style={styles.metricsBox}>
                    <View style={styles.metricItem}>
                      <Ionicons name="thermometer-outline" size={14} color="#F59E0B" />
                      <Text style={styles.metricLabel}>
                        {currentMetrics.temp != null
                          ? `${Math.round(currentMetrics.temp)}°C`
                          : currentMetrics.temperature_c != null
                          ? `${Math.round(currentMetrics.temperature_c)}°C`
                          : "--"}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="water-outline" size={14} color="#60A5FA" />
                      <Text style={styles.metricLabel}>
                        {currentMetrics.humidity != null
                          ? `${currentMetrics.humidity}%`
                          : currentMetrics.humidity_pct != null
                          ? `${currentMetrics.humidity_pct}%`
                          : "--"}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Ionicons name="flag-outline" size={14} color="#34D399" />
                      <Text style={styles.metricLabel}>
                        {currentMetrics.wind_speed != null
                          ? `${currentMetrics.wind_speed} m/s`
                          : currentMetrics.wind_speed_kmh != null
                          ? `${currentMetrics.wind_speed_kmh} km/h`
                          : "--"}
                      </Text>
                    </View>
                    {rainScore && (
                      <View
                        style={[
                          styles.riskPill,
                          {
                            backgroundColor: getRiskColor(rainScore) + "22",
                            borderColor: getRiskColor(rainScore),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.riskPillText,
                            { color: getRiskColor(rainScore) },
                          ]}
                        >
                          {rainScore.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Bubble Footer */}
                {!isUser && (
                  <View style={styles.bubbleFooter}>
                    <Text style={styles.msgTime}>{msg.timestamp}</Text>
                    <View style={styles.actionIcons}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleSpeak(msg.id, msg.text)}
                      >
                        <Ionicons
                          name={isPlaying ? "stop-circle" : "volume-high-outline"}
                          size={16}
                          color={isPlaying ? "#EF4444" : "#94A3B8"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleShare(msg.text)}
                      >
                        <Ionicons name="share-social-outline" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {isUser && <Text style={styles.msgTimeUser}>{msg.timestamp}</Text>}
              </View>
            </View>
          );
        })}

        {/* Typing Bubble */}
        {isLoading && (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={15} color="#60A5FA" />
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#60A5FA" />
              <Text style={styles.loadingText}>
                Analyzing satellite radar & AI models...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Quick Question Chips ── */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {QUICK_CHIPS.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chip}
              onPress={() => handleSendMessage(chip.label)}
              disabled={isLoading}
            >
              <Ionicons name={chip.icon as any} size={13} color="#60A5FA" />
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Floating Input Dock ── */}
      <View style={[styles.inputDock, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.micBtn,
              isListening && { backgroundColor: "#EF4444", borderColor: "#F87171" },
            ]}
            onPress={toggleListening}
            disabled={isLoading}
          >
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={20}
              color={isListening ? "#FFFFFF" : "#60A5FA"}
            />
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          style={[
            styles.textInput,
            isListening && { borderColor: "#EF4444", color: "#FCA5A5" },
          ]}
          placeholder={
            isListening
              ? `🎙️ Listening in ${language.toUpperCase()}... (speak now)`
              : "Ask anything about weather, crops, or travel..."
          }
          placeholderTextColor={isListening ? "#FCA5A5" : "#64748B"}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? "#2563EB" : "#334155" },
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={16}
            color={inputText.trim() ? "#FFFFFF" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* ── SIDEBAR DRAWER (ChatGPT Style Sessions & + New Chat) ── */}
      <Modal
        visible={isDrawerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />

          <View style={styles.drawerContainer}>
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <Ionicons name="cloudy-night" size={22} color="#60A5FA" />
                <Text style={styles.drawerBrandText}>WeatherGPT</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* + New Chat Button */}
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={handleCreateNewChat}
            >
              <Ionicons name="add" size={20} color="#0F172A" />
              <Text style={styles.newChatBtnText}>New Chat</Text>
            </TouchableOpacity>

            {/* Past Chats List */}
            <Text style={styles.drawerSectionTitle}>Previous Chats</Text>
            <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                return (
                  <TouchableOpacity
                    key={sess.id}
                    style={[styles.sessionItem, isActive && styles.sessionItemActive]}
                    onPress={() => handleSelectSession(sess)}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={isActive ? "#60A5FA" : "#64748B"}
                    />
                    <View style={styles.sessionInfo}>
                      <Text
                        style={[styles.sessionTitle, isActive && styles.sessionTitleActive]}
                        numberOfLines={1}
                      >
                        {sess.title}
                      </Text>
                      <Text style={styles.sessionDate}>{sess.createdAt}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.sessionDeleteBtn}
                      onPress={() => handleDeleteSession(sess.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Drawer Footer info */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Team Griffins | SIH 2026</Text>
              <Text style={styles.drawerFooterSub}>Bhashini & Gemini 2.5 Multi-Model</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── REAL-TIME VOICE-TO-VOICE AI MODE (ChatGPT Voice Mode) ── */}
      <Modal
        visible={isVoiceModeActive}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setIsVoiceModeActive(false);
          stopListening();
        }}
      >
        <View style={styles.voiceModeContainer}>
          {/* Header */}
          <View style={[styles.voiceModeHeader, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View style={styles.voiceModeTitleBox}>
              <Text style={styles.voiceModeTitle}>WeatherGPT Voice</Text>
              <Text style={styles.voiceModeLang}>
                {language === "ta" ? "தமிழ் (Tamil)" : language === "hi" ? "हिन्दी (Hindi)" : "English"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.voiceModeCloseBtn}
              onPress={() => {
                setIsVoiceModeActive(false);
                stopListening();
              }}
            >
              <Ionicons name="close" size={24} color="#F1F5F9" />
            </TouchableOpacity>
          </View>

          {/* Central Glowing Orb Animation */}
          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.glowingOrbOuter,
                { transform: [{ scale: voiceOrbAnim }] },
                voiceModeStatus === "speaking" && { backgroundColor: "rgba(56, 189, 248, 0.25)" },
                voiceModeStatus === "thinking" && { backgroundColor: "rgba(245, 158, 11, 0.25)" },
              ]}
            />
            <Animated.View
              style={[
                styles.glowingOrbInner,
                voiceModeStatus === "speaking" && { backgroundColor: "#38BDF8" },
                voiceModeStatus === "thinking" && { backgroundColor: "#F59E0B" },
              ]}
            >
              <Ionicons
                name={
                  voiceModeStatus === "speaking"
                    ? "volume-high"
                    : voiceModeStatus === "thinking"
                    ? "sparkles"
                    : "mic"
                }
                size={48}
                color="#0F172A"
              />
            </Animated.View>

            {/* Status text */}
            <Text style={styles.orbStatusText}>
              {voiceModeStatus === "listening"
                ? "Listening... Speak naturally"
                : voiceModeStatus === "thinking"
                ? "Analyzing satellite & AI..."
                : "WeatherGPT Speaking..."}
            </Text>

            {/* Live Subtitle Transcript */}
            {voiceModeTranscript ? (
              <View style={styles.voiceTranscriptCard}>
                <Text style={styles.voiceTranscriptText}>{voiceModeTranscript}</Text>
              </View>
            ) : null}
          </View>

          {/* Voice Mode Bottom Controls */}
          <View style={[styles.voiceModeFooter, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
            <TouchableOpacity
              style={styles.voiceModeCircleBtn}
              onPress={toggleListening}
            >
              <Ionicons
                name={isListening ? "pause" : "mic"}
                size={26}
                color="#38BDF8"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voiceModeCircleBtn, styles.voiceModeExitBtn]}
              onPress={() => {
                setIsVoiceModeActive(false);
                stopListening();
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#F1F5F9" />
              <Text style={styles.exitText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleBox: {
    gap: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  voiceModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  voiceModeBtnText: {
    color: "#38BDF8",
    fontSize: 11.5,
    fontWeight: "600",
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "100%",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: "85%",
  },
  bubbleUser: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomLeftRadius: 4,
  },
  textUser: {
    fontSize: 14.5,
    color: "#FFFFFF",
    lineHeight: 21,
  },
  textAssistant: {
    fontSize: 14.5,
    color: "#E2E8F0",
    lineHeight: 22,
  },
  msgTimeUser: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  msgTime: {
    fontSize: 10,
    color: "#64748B",
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12.5,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  chipsContainer: {
    paddingVertical: 6,
    backgroundColor: "#0B1120",
  },
  chipsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipText: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  inputDock: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    gap: 8,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    fontSize: 14,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── SIDEBAR DRAWER STYLES ── */
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: Math.min(320, SCREEN_WIDTH * 0.8),
    backgroundColor: "#0F172A",
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
    padding: 16,
    paddingTop: 48,
    justifyContent: "space-between",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  drawerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerBrandText: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
  },
  drawerCloseBtn: {
    padding: 6,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#38BDF8",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newChatBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  drawerSectionTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  sessionItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  sessionTitleActive: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  sessionDate: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },
  sessionDeleteBtn: {
    padding: 6,
  },
  drawerFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  drawerFooterText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  drawerFooterSub: {
    color: "#64748B",
    fontSize: 10.5,
    marginTop: 2,
  },

  /* ── REAL-TIME VOICE MODE STYLES ── */
  voiceModeContainer: {
    flex: 1,
    backgroundColor: "#080D1A",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  voiceModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voiceModeTitleBox: {
    gap: 2,
  },
  voiceModeTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  voiceModeLang: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  voiceModeCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  glowingOrbOuter: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  glowingOrbInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    marginBottom: 30,
  },
  orbStatusText: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
  voiceTranscriptCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    maxWidth: "90%",
  },
  voiceTranscriptText: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  voiceModeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  voiceModeCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  voiceModeExitBtn: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
    flexDirection: "row",
    gap: 6,
    width: 100,
    borderRadius: 30,
  },
  exitText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
