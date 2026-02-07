import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { Camera, FolderOpen, ChevronRight, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";

// Green theme (#2EA37A)
const PRIMARY_GREEN = "#2EA37A";
const PRIMARY_GREEN_DARK = "#258C62";
const PRIMARY_GREEN_MEDIUM = "#279A6A";
const GRAY_LIGHT = "#E8E8E8";
const GRAY_TEXT = "#6B6B6B";

const MAX_WIDTH_WEB = 480;
const isWeb = Platform.OS === "web";

type FoodAnalyzerScreenProps = {
  /** Called when Proceed is pressed with the image URI. If provided, replaces default mock behavior. */
  onProceed?: (imageUri: string) => void | Promise<void>;
};

export function FoodAnalyzerScreen({ onProceed: onProceedProp }: FoodAnalyzerScreenProps = {}) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openCamera() {
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera access is required to take photos.");
        return;
      }
      const result = await launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", (e as Error).message || "Failed to open camera.");
    }
  }

  async function openGallery() {
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Gallery access is required to upload photos.");
        return;
      }
      const result = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", (e as Error).message || "Failed to open gallery.");
    }
  }

  function onRetake() {
    setImageUri(null);
  }

  async function onProceed() {
    if (!imageUri) return;
    setLoading(true);
    try {
      if (onProceedProp) {
        await onProceedProp(imageUri);
        return;
      }
      // Mock API call - replace with actual navigation or API
      await new Promise((resolve) => setTimeout(resolve, 1200));
      Alert.alert("Proceed", "Navigation or API integration point - connect your backend here.");
    } finally {
      setLoading(false);
    }
  }

  const { width, height } = Dimensions.get("window");
  const contentMaxWidth = isWeb ? Math.min(width, MAX_WIDTH_WEB) : width;
  const minContentHeight = isWeb ? undefined : height;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        <Text style={[styles.loadingText, { color: PRIMARY_GREEN }]}>Analyzing your food...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { maxWidth: contentMaxWidth, minHeight: minContentHeight },
        !isWeb && styles.scrollContentMobile,
      ]}
      centerContent={isWeb}
      showsVerticalScrollIndicator={!isWeb}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: Fonts.serif }]}>
          Food Analyzer
        </Text>
      </View>

      <View style={styles.dropZone}>
        {imageUri ? (
          <>
            <View style={styles.imagePreviewWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
              <Pressable
                onPress={onRetake}
                style={({ pressed }) => [
                  styles.retakeBtn,
                  pressed && styles.retakeBtnPressed,
                ]}
              >
                <X size={18} color="#fff" strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.successLabel}>Photo captured!</Text>
          </>
        ) : (
          <>
            <View style={styles.iconWrapper}>
              <Camera size={48} color={PRIMARY_GREEN} strokeWidth={1.5} />
            </View>
            <Text style={styles.heading}>Take a Photo</Text>
            <Text style={styles.subheading}>
              Snap a picture of your food to analyze its nutritional content.
            </Text>
            <Pressable
              onPress={openCamera}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Camera size={20} color="#fff" strokeWidth={2} />
              <Text style={styles.primaryBtnText}>Open Camera</Text>
            </Pressable>
          </>
        )}
      </View>

      {imageUri ? (
        <Pressable
          onPress={onProceed}
          style={({ pressed }) => [
            styles.proceedBtn,
            pressed && styles.proceedBtnPressed,
          ]}
        >
          <Text style={styles.proceedBtnText}>Proceed</Text>
          <ChevronRight size={22} color="#fff" strokeWidth={2} />
        </Pressable>
      ) : (
        <Pressable
          onPress={openGallery}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
        >
          <FolderOpen size={20} color={GRAY_TEXT} strokeWidth={1.5} />
          <Text style={styles.secondaryBtnText}>Upload from Gallery</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignSelf: "center",
    width: "100%",
  },
  scrollContentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: PRIMARY_GREEN,
    fontWeight: "600",
    textAlign: "center",
  },
  dropZone: {
    borderWidth: 2,
    borderColor: PRIMARY_GREEN,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "rgba(156, 175, 136, 0.06)",
    width: "100%",
  },
  iconWrapper: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  imagePreviewWrapper: {
    width: "100%",
    position: "relative",
    aspectRatio: 4 / 3,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  retakeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  retakeBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  successLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_GREEN_MEDIUM,
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 56,
  },
  proceedBtnPressed: {
    backgroundColor: PRIMARY_GREEN_DARK,
  },
  proceedBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    minHeight: 52,
  },
  primaryBtnPressed: {
    backgroundColor: PRIMARY_GREEN_DARK,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GRAY_LIGHT,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 999,
    minHeight: 52,
  },
  secondaryBtnPressed: {
    backgroundColor: "#DDDDDD",
  },
  secondaryBtnText: {
    color: GRAY_TEXT,
    fontSize: 15,
    fontWeight: "500",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});
