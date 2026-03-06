import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Colors = {
  BG?: string;
  CARD?: string;
  BORDER?: string;
  TEXT?: string;
  MUTED?: string;
  SOFT?: string;
  SOFT_BORDER?: string;
  GREEN?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  text: string;
  loading?: boolean;
  colors?: Colors;
};

function parseSections(raw: string) {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [{ body: "" }];

  const HEADINGS = new Set([
    "DECISION SUMMARY",
    "WHY THIS STORE",
    "WHY THIS PLAN",
    "KEY INSIGHTS",
    "ASSUMPTIONS",
    "DATA",
  ]);

  const lines = text.split("\n");

  const sections: { heading?: string; body: string }[] = [];
  let currentHeading: string | undefined;
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (currentHeading || body) {
      sections.push({ heading: currentHeading, body });
    }
    currentHeading = undefined;
    currentBody = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();

    if (HEADINGS.has(upper)) {
      flush();
      currentHeading = upper;
      continue;
    }

    if (!trimmed && currentBody.length === 0) continue;
    currentBody.push(line);
  }

  flush();
  return sections.length ? sections : [{ body: text }];
}

export default function AiInsightsSheet({
  visible,
  onClose,
  title = "AI insights",
  text,
  loading = false,
  colors,
}: Props) {
  const C = {
    BG: colors?.BG ?? "#F2F7F5",
    CARD: colors?.CARD ?? "#FFFFFF",
    BORDER: colors?.BORDER ?? "#E2ECE7",
    TEXT: colors?.TEXT ?? "#0E1A17",
    MUTED: colors?.MUTED ?? "#5D6E69",
    SOFT: colors?.SOFT ?? "#EEF7F3",
    SOFT_BORDER: colors?.SOFT_BORDER ?? "#D6EFE5",
    GREEN: colors?.GREEN ?? "#2E8B6D",
  };

  const sections = useMemo(() => parseSections(text), [text]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: C.CARD }]} onPress={() => {}}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: C.BORDER }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBubble, { backgroundColor: C.SOFT, borderColor: C.SOFT_BORDER }]}>
                <Ionicons name="sparkles" size={18} color={C.GREEN} />
              </View>
              <View>
                <Text style={[styles.title, { color: C.TEXT }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: C.MUTED }]}>
                  Clear explanation of the recommendation
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={C.MUTED} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 60,
                    paddingTop: 8,
                }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled                         
          >
            {loading ? (
              <View style={[styles.loadingRow, { backgroundColor: C.SOFT, borderColor: C.SOFT_BORDER }]}>
                <ActivityIndicator />
                <Text style={[styles.loadingText, { color: C.MUTED }]}>
                  Generating insights…
                </Text>
              </View>
            ) : null}

            {sections.map((s, idx) => (
              <View
                key={`${idx}`}
                style={[styles.card, { backgroundColor: C.SOFT, borderColor: C.SOFT_BORDER }]}
              >
                {s.heading ? (
                  <Text style={[styles.cardHeading, { color: C.TEXT }]}>{s.heading}</Text>
                ) : null}

                <Text style={[styles.cardBody, { color: C.TEXT }]}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    height: "90%",
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
      },
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  loadingRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 20 },
});