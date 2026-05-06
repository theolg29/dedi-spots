import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Country } from "@/constants/countries";
import { COUNTRIES } from "@/constants/countries";
import { Colors, Fonts } from "@/constants/theme";
import { api } from "@/convex/_generated/api";

const PASSWORD_RULES = [
  { label: "8 caractères minimum", test: (p: string) => p.length >= 8 },
  { label: "1 majuscule (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 chiffre (0-9)", test: (p: string) => /[0-9]/.test(p) },
];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMPTY_OTP = ["", "", "", "", "", ""];

type Mode = "signup" | "verify" | "login" | "forgot" | "forgot-done";

type Props = {
  onSuccess?: () => Promise<void> | void;
  onSkip?: () => void;
};

// ---- OTP 6-box input ----
function OTPInput({
  value,
  onChange,
  onComplete,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<(TextInput | null)[]>(Array(6).fill(null));
  const [focused, setFocused] = useState(0);

  function handleChange(text: string, i: number) {
    const digits = text.replace(/\D/g, "");

    if (digits.length > 1) {
      // Paste : distribue les chiffres à partir de la position i
      const next = [...value];
      for (let j = 0; j < digits.length && i + j < 6; j++) {
        next[i + j] = digits[j];
      }
      onChange(next);
      const lastFilled = Math.min(i + digits.length - 1, 5);
      refs.current[lastFilled]?.focus();
      if (next.every((d) => d !== "")) onComplete?.(next.join(""));
      return;
    }

    const digit = digits.slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every((d) => d !== "")) onComplete?.(next.join(""));
  }

  function handleKeyPress(key: string, i: number) {
    if (key === "Backspace" && !value[i] && i > 0) {
      const next = [...value];
      next[i - 1] = "";
      onChange(next);
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <View style={os.row}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          style={[
            os.box,
            focused === i && os.boxFocused,
            !!value[i] && os.boxFilled,
          ]}
          value={value[i]}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused(-1)}
          keyboardType="number-pad"
          autoFocus={i === 0}
          selectTextOnFocus
          caretHidden
        />
      ))}
    </View>
  );
}

const os = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  box: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    fontSize: 22,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
    textAlign: "center",
  },
  boxFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tagBg,
  },
});

// ---- Main auth form ----
export function AuthForm({ onSuccess, onSkip }: Props) {
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.users.createProfile);

  const [mode, setMode] = useState<Mode>("signup");

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState<Country | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // OTP (shared between verify + forgot-done modes)
  const [otpDigits, setOtpDigits] = useState<string[]>([...EMPTY_OTP]);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Global
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce username for uniqueness check
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUsername(username), 500);
    return () => clearTimeout(t);
  }, [username]);

  const usernameExists = useQuery(
    api.users.checkUsername,
    debouncedUsername.length >= 3 && USERNAME_RE.test(debouncedUsername)
      ? { username: debouncedUsername }
      : "skip",
  );

  const usernameStatus = useMemo<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >(() => {
    if (!username) return "idle";
    if (!USERNAME_RE.test(username)) return "invalid";
    if (username !== debouncedUsername || usernameExists === undefined)
      return "checking";
    return usernameExists ? "taken" : "available";
  }, [username, debouncedUsername, usernameExists]);

  const filteredCountries = countrySearch
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()),
      )
    : COUNTRIES;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setOtpDigits([...EMPTY_OTP]);
  }


  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  // ---- Signup ----
  async function handleSignup() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Prénom et nom sont requis.");
      return;
    }
    if (usernameStatus !== "available") {
      setError("Choisis un pseudo valide et disponible.");
      return;
    }
    if (!country) {
      setError("Sélectionne ton pays.");
      return;
    }
    if (!passwordValid) {
      setError("Le mot de passe ne respecte pas les critères.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("password", {
        email,
        password,
        name: `${firstName.trim()} ${lastName.trim()}`,
        flow: "signUp",
      });
      if (!result.signingIn) {
        switchMode("verify");
      } else {
        await createProfile({
          username,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country: country.name,
        });
        await onSuccess?.();
      }
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Email verification ----
  async function handleVerify(codeOverride?: string) {
    setError(null);
    const code = codeOverride ?? otpDigits.join("");
    if (code.length !== 6) {
      setError("Entre le code à 6 chiffres reçu par email.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", { email, code, flow: "email-verification" });
      const profileData = {
        username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country: country?.name ?? "",
      };
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await createProfile(profileData);
          break;
        } catch (err: any) {
          if (err?.message?.includes("Non authentifié") && attempt < 3) {
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          } else {
            throw err;
          }
        }
      }
      await onSuccess?.();
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Login ----
  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
      await onSuccess?.();
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Forgot password ----
  async function handleForgot() {
    setError(null);
    if (!forgotEmail.trim()) {
      setError("Entre ton adresse email.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", { email: forgotEmail, flow: "reset" });
      switchMode("forgot-done");
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Reset verification ----
  async function handleResetVerify(codeOverride?: string) {
    setError(null);
    const code = codeOverride ?? otpDigits.join("");
    if (code.length !== 6) {
      setError("Entre le code à 6 chiffres reçu par email.");
      return;
    }
    if (!PASSWORD_RULES.every((r) => r.test(newPassword))) {
      setError("Le nouveau mot de passe ne respecte pas les critères.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email: forgotEmail,
        code,
        newPassword,
        flow: "reset-verification",
      });
      await onSuccess?.();
    } catch (err: any) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- Google ----
  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const { redirect } = await signIn("google", { redirectTo: "spots://" });
      if (!redirect) {
        await onSuccess?.();
        return;
      }
      const browserResult = await WebBrowser.openAuthSessionAsync(
        redirect.href,
        "spots://",
      );
      if (browserResult.type !== "success") return;
      const code = new URL(browserResult.url).searchParams.get("code");
      if (code) await signIn("google", { code });
      await onSuccess?.();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la connexion Google.");
    } finally {
      setLoading(false);
    }
  }

  function renderUsernameIcon() {
    if (usernameStatus === "checking")
      return <Ionicons name="time-outline" size={18} color={Colors.muted} />;
    if (usernameStatus === "available")
      return (
        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
      );
    if (usernameStatus === "taken" || usernameStatus === "invalid")
      return <Ionicons name="close-circle" size={18} color="#D94F4F" />;
    return null;
  }

  return (
    <View style={s.container}>
      {/* ---- SIGNUP ---- */}
      {mode === "signup" && (
        <>
          <View style={s.nameRow}>
            <TextInput
              style={[s.input, s.nameInput]}
              placeholder="Prénom"
              placeholderTextColor={Colors.muted}
              value={firstName}
              onChangeText={setFirstName}
              autoCorrect={false}
              autoCapitalize="words"
            />
            <TextInput
              style={[s.input, s.nameInput]}
              placeholder="Nom"
              placeholderTextColor={Colors.muted}
              value={lastName}
              onChangeText={setLastName}
              autoCorrect={false}
              autoCapitalize="words"
            />
          </View>

          <View style={s.inputWrapper}>
            <TextInput
              style={[s.input, s.inputWithIcon]}
              placeholder="Pseudo (ex: aventurier42)"
              placeholderTextColor={Colors.muted}
              value={username}
              onChangeText={(v) => setUsername(v.replace(/\s/g, ""))}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={s.inputIcon}>{renderUsernameIcon()}</View>
          </View>
          {usernameStatus === "invalid" && username.length > 0 && (
            <Text style={s.usernameHint}>
              3–20 caractères, lettres, chiffres ou _.
            </Text>
          )}
          {usernameStatus === "taken" && (
            <Text style={[s.usernameHint, { color: "#D94F4F" }]}>
              Ce pseudo est déjà pris.
            </Text>
          )}

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={s.countryBtn}
            onPress={() => {
              Keyboard.dismiss();
              setShowCountryModal(true);
            }}
          >
            {country ? (
              <Text style={s.countrySelected}>
                {country.flag}{"  "}{country.name}
              </Text>
            ) : (
              <Text style={s.countryPlaceholder}>Sélectionne ton pays</Text>
            )}
            <Ionicons name="chevron-down" size={16} color={Colors.muted} />
          </Pressable>

          <View style={s.inputWrapper}>
            <TextInput
              style={[s.input, s.inputWithIcon]}
              placeholder="Mot de passe"
              placeholderTextColor={Colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={s.inputIcon}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>

          <View style={s.rules}>
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <View key={rule.label} style={s.ruleRow}>
                  <View style={[s.ruleDot, ok && s.ruleDotOk]} />
                  <Text style={[s.ruleText, ok && s.ruleTextOk]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Chargement…" : "Créer mon compte"}
            </Text>
          </Pressable>
        </>
      )}

      {/* ---- VERIFY ---- */}
      {mode === "verify" && (
        <>
          <Text style={s.modeTitle}>Vérifie ton email</Text>
          <Text style={s.modeSub}>
            Un code à 6 chiffres a été envoyé à{"\n"}
            <Text selectable style={{ color: Colors.text, fontFamily: Fonts.bodySemiBold }}>
              {email}
            </Text>
          </Text>

          <OTPInput key="verify" value={otpDigits} onChange={setOtpDigits} onComplete={(code) => void handleVerify(code)} />

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={() => void handleVerify()}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Vérification…" : "Confirmer"}
            </Text>
          </Pressable>

          <Pressable
            style={s.linkBtn}
            onPress={() => {
              setOtpDigits([...EMPTY_OTP]);
              setError(null);
              void handleSignup();
            }}
          >
            <Text style={s.linkBtnText}>Renvoyer le code</Text>
          </Pressable>
        </>
      )}

      {/* ---- LOGIN ---- */}
      {mode === "login" && (
        <>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={s.inputWrapper}>
            <TextInput
              style={[s.input, s.inputWithIcon]}
              placeholder="Mot de passe"
              placeholderTextColor={Colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={s.inputIcon}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>

          <Pressable
            style={s.forgotLink}
            onPress={() => {
              setForgotEmail(email);
              switchMode("forgot");
            }}
          >
            <Text style={s.forgotLinkText}>Mot de passe oublié ?</Text>
          </Pressable>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Connexion…" : "Se connecter"}
            </Text>
          </Pressable>
        </>
      )}

      {/* ---- FORGOT ---- */}
      {mode === "forgot" && (
        <>
          <Pressable style={s.backBtn} onPress={() => switchMode("login")}>
            <Ionicons name="arrow-back" size={18} color={Colors.muted} />
            <Text style={s.backBtnText}>Retour</Text>
          </Pressable>

          <Text style={s.modeTitle}>Mot de passe oublié</Text>
          <Text style={s.modeSub}>
            Entre ton email pour recevoir un code de réinitialisation.
          </Text>

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={forgotEmail}
            onChangeText={setForgotEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={handleForgot}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Envoi…" : "Envoyer le code"}
            </Text>
          </Pressable>
        </>
      )}

      {/* ---- FORGOT-DONE ---- */}
      {mode === "forgot-done" && (
        <>
          <Text style={s.modeTitle}>Nouveau mot de passe</Text>
          <Text style={s.modeSub}>
            Code envoyé à{"\n"}
            <Text selectable style={{ color: Colors.text, fontFamily: Fonts.bodySemiBold }}>
              {forgotEmail}
            </Text>
          </Text>

          <OTPInput key="reset" value={otpDigits} onChange={setOtpDigits} onComplete={(code) => void handleResetVerify(code)} />

          <View style={s.inputWrapper}>
            <TextInput
              style={[s.input, s.inputWithIcon]}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={Colors.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={s.inputIcon}
              onPress={() => setShowNewPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showNewPassword ? "eye-off" : "eye"}
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>

          <View style={s.rules}>
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(newPassword);
              return (
                <View key={rule.label} style={s.ruleRow}>
                  <View style={[s.ruleDot, ok && s.ruleDotOk]} />
                  <Text style={[s.ruleText, ok && s.ruleTextOk]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={handleResetVerify}
            disabled={loading}
          >
            <Text style={s.primaryBtnText}>
              {loading ? "Réinitialisation…" : "Changer le mot de passe"}
            </Text>
          </Pressable>
        </>
      )}

      {/* ---- DIVIDER + GOOGLE ---- */}
      {(mode === "signup" || mode === "login") && (
        <>
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              s.googleBtn,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={handleGoogle}
            disabled={loading}
          >
            <Image
              source={require("@/assets/images/google-logo.png")}
              style={s.googleLogo}
              resizeMode="contain"
            />
            <Text style={s.googleBtnText}>Continuer avec Google</Text>
          </Pressable>
        </>
      )}

      {/* ---- SWITCH MODE TEXT ---- */}
      {(mode === "signup" || mode === "login") && (
        <Pressable
          style={s.switchLink}
          onPress={() => switchMode(mode === "signup" ? "login" : "signup")}
        >
          <Text style={s.switchLinkText}>
            {mode === "signup"
              ? "Vous avez déjà un compte ? "
              : "Vous n'avez pas de compte ? "}
            <Text style={s.switchLinkAction}>
              {mode === "signup" ? "Se connecter" : "Créer un compte"}
            </Text>
          </Text>
        </Pressable>
      )}

      {/* ---- SKIP ---- */}
      {onSkip && (mode === "signup" || mode === "login") && (
        <Pressable onPress={onSkip} style={s.skipLink}>
          <Text style={s.skipLinkText}>Continuer sans compte →</Text>
        </Pressable>
      )}

      {/* ---- COUNTRY PICKER MODAL ---- */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Sélectionne ton pays</Text>
            <Pressable onPress={() => setShowCountryModal(false)} hitSlop={16}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <TextInput
            style={s.modalSearch}
            placeholder="Rechercher…"
            placeholderTextColor={Colors.muted}
            value={countrySearch}
            onChangeText={setCountrySearch}
            autoCorrect={false}
            autoFocus
          />

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code + item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  s.countryItem,
                  pressed && { backgroundColor: Colors.background },
                  country?.code === item.code && s.countryItemSelected,
                ]}
                onPress={() => {
                  setCountry(item);
                  setShowCountryModal(false);
                  setCountrySearch("");
                }}
              >
                <Text style={s.countryItemFlag}>{item.flag}</Text>
                <Text style={s.countryItemName}>{item.name}</Text>
                {country?.code === item.code && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={Colors.primary}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function parseAuthError(err: any): string {
  const msg = err?.message ?? "";
  if (msg.includes("InvalidAccountId") || msg.includes("not found"))
    return "Aucun compte avec cet email.";
  if (msg.includes("InvalidSecret") || msg.includes("password"))
    return "Mot de passe incorrect.";
  if (msg.includes("already exists") || msg.includes("AccountAlreadyExists"))
    return "Un compte existe déjà avec cet email.";
  if (msg.includes("already pris") || msg.includes("already taken"))
    return "Ce pseudo est déjà pris.";
  if (msg.includes("Invalid OTP") || msg.includes("invalid code"))
    return "Code incorrect. Vérifie et réessaie.";
  return msg || "Une erreur est survenue.";
}

const s = StyleSheet.create({
  container: { width: "100%" },

  nameRow: { flexDirection: "row", gap: 10 },
  nameInput: { flex: 1, marginBottom: 12 },

  input: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputWrapper: { position: "relative", width: "100%" },
  inputWithIcon: { paddingRight: 44 },
  inputIcon: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 12,
    justifyContent: "center",
  },

  usernameHint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.muted,
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 4,
  },

  countryBtn: {
    height: 50,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countrySelected: { fontSize: 15, fontFamily: Fonts.body, color: Colors.text },
  countryPlaceholder: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.muted,
  },

  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 12,
    paddingVertical: 2,
  },
  forgotLinkText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
  },

  modeTitle: {
    fontSize: 20,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
    marginBottom: 6,
  },
  modeSub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    lineHeight: 21,
    marginBottom: 20,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
  },

  rules: { gap: 6, marginBottom: 14 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  ruleDotOk: { backgroundColor: Colors.primary },
  ruleText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.muted },
  ruleTextOk: { color: Colors.primary },

  errorText: {
    color: "#D94F4F",
    fontSize: 13,
    fontFamily: Fonts.body,
    marginBottom: 10,
    textAlign: "center",
  },

  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
  },


  linkBtn: { marginTop: 12, alignItems: "center", paddingVertical: 4 },
  linkBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.muted,
    textDecorationLine: "underline",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },

  googleBtn: {
    width: "100%",
    height: 52,
    backgroundColor: Colors.background,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleLogo: { width: 18, height: 18 },
  googleBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Fonts.bodyMedium,
  },

  switchLink: { marginTop: 18, alignItems: "center", paddingVertical: 4 },
  switchLinkText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.muted,
    textAlign: "center",
  },
  switchLinkAction: {
    color: Colors.primary,
    fontFamily: Fonts.bodySemiBold,
  },

  skipLink: { marginTop: 8, paddingVertical: 4, alignItems: "center" },
  skipLinkText: { color: Colors.muted, fontSize: 14, fontFamily: Fonts.body },

  modalContainer: { flex: 1, backgroundColor: Colors.card, paddingTop: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: Colors.text,
  },
  modalSearch: {
    marginHorizontal: 20,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 14,
  },
  countryItemSelected: { backgroundColor: Colors.tagBg },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { fontSize: 15, fontFamily: Fonts.body, color: Colors.text },
});
