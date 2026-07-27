import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  initialName?: string;
  title?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
}

export function CreateListModal({
  visible,
  onClose,
  onCreate,
  initialName = "",
  title = "Nouvelle liste",
  confirmLabel = "Créer",
  confirmingLabel = "Création…",
}: Props) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const handleClose = () => {
    setName(initialName);
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.label}>Nom de la liste</Text>
          <TextInput
            style={s.input}
            placeholder="Ex. Sorties du week-end"
            placeholderTextColor={Colors.muted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            accessibilityLabel="Nom de la liste"
          />
          <View style={s.actions}>
            <Pressable
              style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.75 }]}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
            >
              <Text style={s.secondaryBtnText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                s.primaryBtn,
                !name.trim() && s.primaryBtnDisabled,
                pressed && !!name.trim() && { opacity: 0.85 },
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || submitting}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ disabled: !name.trim() || submitting }}
            >
              <Text style={s.primaryBtnText}>{submitting ? confirmingLabel : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: Radius.cardSm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.muted,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: "#fff",
  },
});
