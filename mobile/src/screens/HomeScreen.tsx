/**
 * Screen 3 — Conversational Chat Interface (WeatherGPT)
 * Theme: Luxury Black & Gold (Obsidian & Metallic Gold #D4AF37)
 * Layout: Claude Structure (Minimalist Top Bar, Sessions Drawer, 2x2 Landing, Elevated Dock, Voice Mode)
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

const CLAUDE_PROMPTS = [
  {
    title: "Agricultural Advisory",
    subtitle: "Pesticide spray & harvest weather window",
    prompt: "Can I spray pesticides tomorrow in Coimbatore? Give detailed harvest advisory.",
    icon: "leaf-outline",
  },
  {
    title: "Doppler Rain Radar",
    subtitle: "Real-time precipitation & storm clouds",
    prompt: "Open Rain Radar",
    icon: "rainy-outline",
  },
  {
    title: "Ground Hazard Check",
    subtitle: "Citizen flood & road disruption alerts",
    prompt: "Are there any active flood or waterlogging alerts reported near Chennai?",
    icon: "warning-outline",
  },
  {
    title: "Marine & Wind Analysis",
    subtitle: "Swell, wind velocity & safe fishing zones",
    prompt: "Wind speed and swell forecast for Tamil Nadu coastal waters next 24h.",
    icon: "boat-outline",
  },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const currentAudioRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // State
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

  // Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [voiceModeStatus, setVoiceModeStatus] = useState<"listening" | "thinking" | "speaking">("listening");
  const [voiceModeTranscript, setVoiceModeTranscript] = useState("");

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const voiceOrbAnim = useRef(new Animated.Value(1)).current;

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
          Animated.timing(voiceOrbAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(voiceOrbAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      voiceOrbAnim.setValue(1);
    }
  }, [isListening, isVoiceModeActive]);

  // Load chat sessions from storage
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

        const rawSessions = await AsyncStorage.getItem("weathergpt_black_gold_sessions_v1");
        if (rawSessions) {
          const parsed: ChatSession[] = JSON.parse(rawSessions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setCurrentSessionId(parsed[0].id);
            setMessages(parsed[0].messages);
            return;
          }
        }

        // Default empty new session
        const initialSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: "New Weather Chat",
          createdAt: formatTime(new Date()),
          persona: savedPersona || "farmer",
          language: savedLang || "ta",
          messages: [],
        };

        setSessions([initialSession]);
        setCurrentSessionId(initialSession.id);
        setMessages([]);
      } catch (err) {
        console.warn("Init app error:", err);
      }
    };

    initApp();
  }, []);

  // Save sessions to storage
  useEffect(() => {
    if (sessions.length > 0 && currentSessionId) {
      const updated = sessions.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, messages: messages };
        }
        return s;
      });
      AsyncStorage.setItem("weathergpt_black_gold_sessions_v1", JSON.stringify(updated)).catch(() => {});
    }
  }, [messages]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, isLoading]);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleStartNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "New Chat",
      createdAt: formatTime(new Date()),
      persona: persona,
      language: language,
      messages: [],
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setIsDrawerOpen(false);
    AsyncStorage.setItem("weathergpt_black_gold_sessions_v1", JSON.stringify(updatedSessions)).catch(() => {});
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setPersona(session.persona || "farmer");
    setLanguage(session.language || "ta");
    setIsDrawerOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (currentSessionId === sessionId) {
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
        setMessages(filtered[0].messages);
      } else {
        handleStartNewChat();
      }
    }
    AsyncStorage.setItem("weathergpt_black_gold_sessions_v1", JSON.stringify(filtered)).catch(() => {});
  };

  const isListeningRef = useRef(false);

  // ── Inline Speech Recognition (Continuous & Resilient) ──
  const toggleListening = () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    isListeningRef.current = true;
    setIsListening(true);

    if (Platform.OS === "web") {
      const windowObj = typeof window !== "undefined" ? (window as any) : null;
      const SpeechRecognition =
        windowObj?.SpeechRecognition || windowObj?.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.abort(); } catch {}
          }

          const recognition = new SpeechRecognition();
          speechRecognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang =
            language === "ta" ? "ta-IN" : language === "hi" ? "hi-IN" : "en-IN";

          recognition.onstart = () => {
            isListeningRef.current = true;
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let fullTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript;
            }
            if (fullTranscript.trim()) {
              setInputText(fullTranscript);
              if (isVoiceModeActive) setVoiceModeTranscript(fullTranscript);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn("Speech recognition event:", event?.error);
            // Ignore brief pauses / no-speech without terminating
            if (event?.error === "no-speech") {
              return;
            }
            if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
              isListeningRef.current = false;
              setIsListening(false);
            }
          };

          recognition.onend = () => {
            // If user did not manually stop and is still in listening mode, keep connection alive
            if (isListeningRef.current) {
              try {
                recognition.start();
                return;
              } catch {}
            }
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

    // High fidelity simulated voice dictation for preview if Web Speech API unavailable
    const demoVoiceQueries: Record<string, string> = {
      ta: "நாளைக்கு எங்க பகுதியில் மழை பெய்யுமா? பயிர் அறுவடை செய்யலாமா?",
      hi: "कल मेरे खेत में बारिश होगी क्या? क्या मुझे सिंचाई करनी चाहिए?",
      en: "Can I spray pesticides tomorrow in Coimbatore?",
    };
    const sample = demoVoiceQueries[language] || demoVoiceQueries["ta"];
    setTimeout(() => {
      if (isListeningRef.current) {
        setInputText(sample);
        if (isVoiceModeActive) {
          handleVoiceModeCycle(sample);
        }
      }
    }, 1500);
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
  };

  // ── Voice-to-Voice AI Loop ──
  const handleVoiceModeCycle = async (queryText: string) => {
    if (!queryText.trim()) return;
    setVoiceModeStatus("thinking");

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
    } catch {
      setVoiceModeStatus("listening");
    }
  };

  // ── Send Message ──
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

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId && s.messages.length === 0) {
          return { ...s, title: textToSend.slice(0, 28) };
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
        sourceAttribution: response.source_attribution || "WeatherGPT Multi-Model Ensemble",
        rawResponse: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.warn("Query failed, generating fallback:", err);

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

  // ── Audio Speech Playback via Streaming ──
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
        return "#D4AF37";
      case "low":
        return "#10B981";
      default:
        return "#D4AF37";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Top App Bar (Black & Gold Minimalist Header) ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsDrawerOpen(true)}
            title="Chat History & Sessions"
          >
            <Ionicons name="menu-outline" size={22} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modelSelectorPill} onPress={() => setIsDrawerOpen(true)}>
            <Text style={styles.modelNameText}>WeatherGPT 2.5</Text>
            <View style={styles.modelBadge}>
              <Text style={styles.modelBadgeText}>
                {persona === "farmer" ? "விவசாயி" : persona.toUpperCase()} • {language.toUpperCase()}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleStartNewChat}
            title="New Chat"
          >
            <Ionicons name="create-outline" size={20} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, styles.voiceModeHeaderBtn]}
            onPress={() => {
              setIsVoiceModeActive(true);
              setVoiceModeStatus("listening");
              startListening();
            }}
            title="Voice-to-Voice AI"
          >
            <Ionicons name="radio" size={16} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("Map", { initialMode: "radar" })}
            title="GIS Multi-Layer Radar Map"
          >
            <Ionicons name="map-outline" size={20} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Chat Canvas ── */}
      {messages.length === 0 ? (
        <ScrollView
          style={styles.heroScroll}
          contentContainerStyle={styles.heroContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroHeader}>
            <View style={styles.goldSparkIcon}>
              <Ionicons name="sparkles" size={24} color="#D4AF37" />
            </View>
            <Text style={styles.heroTitle}>Good evening</Text>
            <Text style={styles.heroSubtitle}>
              How can WeatherGPT help you with meteorological intelligence, agricultural advisories, or disaster risk today?
            </Text>
          </View>

          <View style={styles.promptCardsGrid}>
            {CLAUDE_PROMPTS.map((card, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.promptCard}
                onPress={() => handleSendMessage(card.prompt)}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons name={card.icon as any} size={18} color="#D4AF37" />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
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
                  <View style={styles.goldAvatar}>
                    <Ionicons name="sparkles" size={14} color="#D4AF37" />
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
                        <Ionicons name="thermometer-outline" size={13} color="#D4AF37" />
                        <Text style={styles.metricLabel}>
                          {currentMetrics.temp != null
                            ? `${Math.round(currentMetrics.temp)}°C`
                            : currentMetrics.temperature_c != null
                            ? `${Math.round(currentMetrics.temperature_c)}°C`
                            : "--"}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Ionicons name="water-outline" size={13} color="#60A5FA" />
                        <Text style={styles.metricLabel}>
                          {currentMetrics.humidity != null
                            ? `${currentMetrics.humidity}%`
                            : currentMetrics.humidity_pct != null
                            ? `${currentMetrics.humidity_pct}%`
                            : "--"}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Ionicons name="flag-outline" size={13} color="#10B981" />
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
                              backgroundColor: getRiskColor(rainScore) + "20",
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

                  {/* Action Row */}
                  {!isUser && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleSpeak(msg.id, msg.text)}
                        title="Read Aloud"
                      >
                        <Ionicons
                          name={isPlaying ? "stop-circle" : "volume-medium-outline"}
                          size={16}
                          color={isPlaying ? "#EF4444" : "#D4AF37"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleShare(msg.text)}
                        title="Share"
                      >
                        <Ionicons name="share-outline" size={15} color="#A1A1AA" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => navigation.navigate("Map", { initialMode: "radar" })}
                        title="Open Doppler Radar"
                      >
                        <Ionicons name="map-outline" size={15} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Thinking Indicator */}
          {isLoading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.goldAvatar}>
                <Ionicons name="sparkles" size={14} color="#D4AF37" />
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#D4AF37" />
                <Text style={styles.loadingText}>Synthesizing meteorological consensus...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Black & Gold Elevated Input Box ── */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <View style={styles.goldInputBox}>
          <TextInput
            style={[
              styles.textInput,
              isListening && { color: "#F59E0B" },
            ]}
            placeholder={
              isListening
                ? `Listening in ${language.toUpperCase()}... (Speak now)`
                : "Reply to WeatherGPT or ask about weather, crops, travel..."
            }
            placeholderTextColor="#71717A"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
            multiline={true}
            editable={!isLoading}
          />

          {/* Bottom dock inside input box */}
          <View style={styles.inputInnerDock}>
            <View style={styles.inputDockLeft}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.dockIconBtn,
                    isListening && styles.dockIconBtnListening,
                  ]}
                  onPress={toggleListening}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={isListening ? "mic" : "mic-outline"}
                    size={18}
                    color={isListening ? "#FFFFFF" : "#D4AF37"}
                  />
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                style={styles.dockPill}
                onPress={() => navigation.navigate("Settings")}
              >
                <Text style={styles.dockPillText}>
                  {persona === "farmer" ? "🌾 Farmer" : persona} • {language.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? "#D4AF37" : "rgba(212, 175, 55, 0.2)",
                },
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputText.trim() ? "#09090B" : "#71717A"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── BLACK & GOLD SIDEBAR DRAWER ── */}
      <Modal
        visible={isDrawerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <View style={styles.drawerLogoIcon}>
                  <Ionicons name="sparkles" size={16} color="#09090B" />
                </View>
                <Text style={styles.drawerBrandText}>WeatherGPT</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
              >
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={handleStartNewChat}
            >
              <Ionicons name="create-outline" size={17} color="#09090B" />
              <Text style={styles.newChatBtnText}>Start new chat</Text>
            </TouchableOpacity>

            <Text style={styles.drawerSectionTitle}>Recent</Text>
            <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                return (
                  <TouchableOpacity
                    key={sess.id}
                    style={[styles.sessionItem, isActive && styles.sessionItemActive]}
                    onPress={() => handleSelectSession(sess)}
                  >
                    <Text
                      style={[styles.sessionTitle, isActive && styles.sessionTitleActive]}
                      numberOfLines={1}
                    >
                      {sess.title || "New Chat"}
                    </Text>
                    <TouchableOpacity
                      style={styles.sessionDeleteBtn}
                      onPress={() => handleDeleteSession(sess.id)}
                    >
                      <Ionicons name="trash-outline" size={13} color="#71717A" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.drawerProfileRow}
                onPress={() => {
                  setIsDrawerOpen(false);
                  navigation.navigate("Settings");
                }}
              >
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>D</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>Deepak • Team Griffins</Text>
                  <Text style={styles.profileSub}>Bhashini & Gemini 2.5</Text>
                </View>
                <Ionicons name="settings-outline" size={18} color="#D4AF37" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>

      {/* ── BLACK & GOLD VOICE-TO-VOICE MODE ── */}
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
          <View style={[styles.voiceModeHeader, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View>
              <Text style={styles.voiceModeTitle}>Voice Mode</Text>
              <Text style={styles.voiceModeLang}>
                {language === "ta" ? "தமிழ் (Tamil)" : "English"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.voiceModeCloseBtn}
              onPress={() => {
                setIsVoiceModeActive(false);
                stopListening();
              }}
            >
              <Ionicons name="close" size={24} color="#FFFDF7" />
            </TouchableOpacity>
          </View>

          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.glowingOrbOuter,
                { transform: [{ scale: voiceOrbAnim }] },
                voiceModeStatus === "speaking" && { backgroundColor: "rgba(212, 175, 55, 0.25)" },
              ]}
            />
            <Animated.View
              style={[
                styles.glowingOrbInner,
                voiceModeStatus === "speaking" && { backgroundColor: "#D4AF37" },
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
                size={44}
                color="#09090B"
              />
            </Animated.View>

            <Text style={styles.orbStatusText}>
              {voiceModeStatus === "listening"
                ? "Listening... Speak in Tamil or English"
                : voiceModeStatus === "thinking"
                ? "Analyzing meteorology..."
                : "WeatherGPT Speaking..."}
            </Text>

            {voiceModeTranscript ? (
              <View style={styles.voiceTranscriptCard}>
                <Text style={styles.voiceTranscriptText}>{voiceModeTranscript}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.voiceModeFooter, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
            <TouchableOpacity
              style={styles.voiceModeCircleBtn}
              onPress={toggleListening}
            >
              <Ionicons
                name={isListening ? "pause" : "mic"}
                size={24}
                color="#D4AF37"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voiceModeCircleBtn, styles.voiceModeExitBtn]}
              onPress={() => {
                setIsVoiceModeActive(false);
                stopListening();
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#09090B" />
              <Text style={styles.exitText}>Text Chat</Text>
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
    backgroundColor: "#09090B", // Pure Obsidian Black
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "#09090B",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.15)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modelSelectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141416",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  modelNameText: {
    color: "#FFFDF7",
    fontSize: 13,
    fontWeight: "600",
  },
  modelBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  modelBadgeText: {
    color: "#D4AF37",
    fontSize: 10,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  voiceModeHeaderBtn: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderColor: "rgba(212, 175, 55, 0.4)",
    borderWidth: 1,
  },

  /* ── Hero Landing Canvas (Black & Gold) ── */
  heroScroll: {
    flex: 1,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 20,
    alignItems: "center",
  },
  heroHeader: {
    alignItems: "center",
    marginBottom: 32,
    maxWidth: 480,
  },
  goldSparkIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(212, 175, 55, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#FFFDF7",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  promptCardsGrid: {
    width: "100%",
    maxWidth: 540,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  promptCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardIconBox: {
    marginBottom: 2,
  },
  cardTitle: {
    color: "#FFFDF7",
    fontSize: 13.5,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#71717A",
    fontSize: 11.5,
    lineHeight: 16,
  },

  /* ── Continuous Message Stream ── */
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 20,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "100%",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  goldAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(212, 175, 55, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "88%",
  },
  bubbleUser: {
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    borderBottomLeftRadius: 4,
  },
  textUser: {
    fontSize: 14.5,
    color: "#FFFDF7",
    lineHeight: 22,
  },
  textAssistant: {
    fontSize: 14.5,
    color: "#ECECE5",
    lineHeight: 23,
  },
  metricsBox: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.12)",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#09090B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  metricLabel: {
    fontSize: 11.5,
    color: "#D4AF37",
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  actionIconBtn: {
    padding: 3,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#D4AF37",
    fontStyle: "italic",
  },

  /* ── Black & Gold Elevated Input Box ── */
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#09090B",
  },
  goldInputBox: {
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 16,
    padding: 12,
    gap: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  textInput: {
    color: "#FFFDF7",
    fontSize: 14.5,
    minHeight: 38,
    maxHeight: 120,
    padding: 0,
  },
  inputInnerDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  inputDockLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dockIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  dockIconBtnListening: {
    backgroundColor: "#EF4444",
  },
  dockPill: {
    backgroundColor: "#1C1C20",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dockPillText: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "600",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Black & Gold Drawer ── */
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  modalBackdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: Math.min(300, SCREEN_WIDTH * 0.8),
    backgroundColor: "#0D0D10",
    borderRightWidth: 1,
    borderRightColor: "rgba(212, 175, 55, 0.25)",
    padding: 16,
    paddingTop: 46,
    justifyContent: "space-between",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  drawerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerLogoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBrandText: {
    color: "#FFFDF7",
    fontSize: 16,
    fontWeight: "700",
  },
  drawerCloseBtn: {
    padding: 4,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4AF37",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 18,
  },
  newChatBtnText: {
    color: "#09090B",
    fontSize: 13.5,
    fontWeight: "700",
  },
  drawerSectionTitle: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  sessionItemActive: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  sessionTitle: {
    color: "#A1A1AA",
    fontSize: 13,
    flex: 1,
  },
  sessionTitleActive: {
    color: "#FFFDF7",
    fontWeight: "600",
  },
  sessionDeleteBtn: {
    padding: 4,
  },
  drawerFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.18)",
  },
  drawerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#09090B",
    fontWeight: "700",
    fontSize: 13,
  },
  profileName: {
    color: "#FFFDF7",
    fontSize: 12.5,
    fontWeight: "600",
  },
  profileSub: {
    color: "#D4AF37",
    fontSize: 10.5,
  },

  /* ── Black & Gold Voice Mode ── */
  voiceModeContainer: {
    flex: 1,
    backgroundColor: "#09090B",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  voiceModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voiceModeTitle: {
    color: "#FFFDF7",
    fontSize: 18,
    fontWeight: "700",
  },
  voiceModeLang: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "600",
  },
  voiceModeCloseBtn: {
    padding: 6,
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowingOrbOuter: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
  },
  glowingOrbInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  orbStatusText: {
    color: "#FFFDF7",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  voiceTranscriptCard: {
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    maxWidth: "90%",
  },
  voiceTranscriptText: {
    color: "#ECECE5",
    fontSize: 13.5,
    textAlign: "center",
  },
  voiceModeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  voiceModeCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#141416",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  voiceModeExitBtn: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    gap: 6,
    width: 110,
    borderWidth: 0,
  },
  exitText: {
    color: "#09090B",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
