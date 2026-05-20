import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Octicons } from "@expo/vector-icons";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors, Fonts } from "@/constants/theme";

interface Props {
  visible: boolean;
  spotId: Id<"spots"> | null;
  onClose: () => void;
}

export function AddToFavoritesSheet({ visible, spotId, onClose }: Props) {
  const [isRendered, setIsRendered] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const lists = useQuery(api.favorites.getUserLists);
  const addToList = useMutation(api.favorites.addToList);
  const createList = useMutation(api.favorites.createList);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsRendered(false);
        setCreatingList(false);
        setNewListName("");
      });
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [520, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleSelectList = async (listId?: Id<"favoriteLists">) => {
    if (!spotId) return;
    await addToList({ spotId, listId });
    onClose();
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || !spotId) return;
    const listId = await createList({ name: newListName.trim() });
    await addToList({ spotId, listId });
    onClose();
  };

  if (!isRendered) return null;

  return (
    <Modal
      transparent
      visible={isRendered}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Animated.View
          style={[s.backdrop, { opacity: overlayOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Ajouter aux favoris</Text>
            <Pressable style={s.closeBtn} onPress={onClose} hitSlop={12}>
              <Octicons name="x" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Default "Favoris" bucket */}
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => handleSelectList(undefined)}
            >
              <View style={[s.rowIcon, { backgroundColor: "#FFF0EB" }]}>
                <Octicons name="heart" size={18} color={Colors.accent} />
              </View>
              <Text style={s.rowLabel}>Favoris</Text>
              <Octicons name="chevron-right" size={14} color={Colors.muted} />
            </Pressable>

            {lists?.map((list) => (
              <Pressable
                key={list._id}
                style={({ pressed }) => [s.row, pressed && s.rowPressed]}
                onPress={() => handleSelectList(list._id)}
              >
                <View style={[s.rowIcon, { backgroundColor: Colors.tagBg }]}>
                  <Octicons name="list-unordered" size={18} color={Colors.primary} />
                </View>
                <Text style={s.rowLabel}>{list.name}</Text>
                <Octicons name="chevron-right" size={14} color={Colors.muted} />
              </Pressable>
            ))}
          </ScrollView>

          {/* Create list */}
          {creatingList ? (
            <View style={s.createRow}>
              <TextInput
                style={s.createInput}
                placeholder="Nom de la liste"
                placeholderTextColor={Colors.muted}
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateList}
              />
              <Pressable
                style={[s.confirmBtn, !newListName.trim() && s.confirmBtnDisabled]}
                onPress={handleCreateList}
                disabled={!newListName.trim()}
              >
                <Octicons name="check" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [s.createBtn, pressed && s.rowPressed]}
              onPress={() => setCreatingList(true)}
            >
              <View style={[s.rowIcon, { backgroundColor: Colors.surface }]}>
                <Octicons name="plus" size={18} color={Colors.text} />
              </View>
              <Text style={s.createBtnLabel}>Créer une liste</Text>
            </Pressable>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: 300,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    backgroundColor: Colors.surface,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  createBtnLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.muted,
  },
});
