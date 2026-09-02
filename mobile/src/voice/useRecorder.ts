/**
 * useRecorder — Audio recording hook using expo-audio
 * Records audio in m4a format for uploading to /v1/query/voice
 */

import { useState } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        // Still allow demo interaction if permissions rejected
        setIsRecording(true);
        return true;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingUri(null);
      return true;
    } catch (err) {
      console.warn("Failed to start native recording, falling back to simulated mode:", err);
      setIsRecording(true);
      return true;
    }
  };

  const stopRecording = async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri || "simulated-recording.m4a";
      setIsRecording(false);
      setRecordingUri(uri);
      return uri;
    } catch (err) {
      console.warn("Failed to stop recording:", err);
      setIsRecording(false);
      return "simulated-recording.m4a";
    }
  };

  return {
    isRecording,
    recordingUri,
    startRecording,
    stopRecording,
  };
}

