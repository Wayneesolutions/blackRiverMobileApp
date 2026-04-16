// src/screens/auth/LoginScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { apiService } from "../../services/api/apiService";
import { authManager } from "../../types/AuthManager";
import { logger } from "../../utils/loggerHelper";
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from "../../theme";

const logo = require("../../../assets/FleetGo.png");

type Props = NativeStackScreenProps<RootStackParamList, "Login"> & {
  onAuthSuccess: (userData?: any) => void;
};

interface LoginErrors {
  email?: string | null;
  password?: string | null;
}

export default function LoginScreen({ navigation, onAuthSuccess }: Props) {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [errors, setErrors]             = useState<LoginErrors>({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);

  // Subtle fade-in on mount
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    logger.userAction("Screen View", { screen: "LoginScreen" }, "LoginScreen");
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Login handler ────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (isLoading) return;
    setErrors({});
    if (!validateForm()) {
      logger.userAction("Login Validation Failed", { email }, "LoginScreen");
      return;
    }

    setIsLoading(true);
    const loginTimer = logger.startTimer("Login Process");

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        loginTimer();
        setErrors({ email: "Connection timeout. Please check your internet connection and try again." });
      }
    }, 30000);

    try {
      logger.userAction("Login Attempt", { email }, "LoginScreen");
      const response = await apiService.login(email, password);
      clearTimeout(timeoutId);

      logger.debug("Login response received", {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data && typeof response.data === "object" ? Object.keys(response.data) : null,
      });

      const backendResponse = response.data;
      const driverData =
        backendResponse?.driver ||
        (backendResponse && "id" in backendResponse ? backendResponse : null);

      if (response.success && driverData && typeof driverData === "object" && "id" in driverData) {
        const driver = driverData as { id: string; name: string; email: string; token: string };
        await authManager.login({ id: driver.id, name: driver.name, email: driver.email, token: driver.token });
        logger.userAction("Login Success", { userId: driver.id, email: driver.email }, "LoginScreen");
        onAuthSuccess(driver);
      } else {
        const newErrors: LoginErrors = {};
        const br = response.data as any;
        let errorMessage = br?.message || br?.error || response.error || "";
        const statusCode = response.statusCode || 0;

        if (statusCode === 401 || statusCode === 404 || statusCode === 400) {
          logger.userAction("Login Failed - Invalid Credentials", { email, error: errorMessage, statusCode }, "LoginScreen");
          if (errorMessage.toLowerCase().includes("driver not found") || errorMessage.toLowerCase().includes("not found") || statusCode === 404) {
            newErrors.email = errorMessage || `Driver not found with email: ${email}. Please check and try again.`;
          } else if (errorMessage.toLowerCase().includes("invalid credentials") || errorMessage.toLowerCase().includes("password") || statusCode === 401) {
            newErrors.password = errorMessage || "Incorrect password. Please check and try again.";
          } else {
            newErrors.email = errorMessage || "Incorrect email address or password.";
          }
        } else if (statusCode === 0 || errorMessage.includes("Unable to connect") || errorMessage.includes("Network request failed") || errorMessage.includes("timeout")) {
          newErrors.email = "Unable to connect to server. Please check your internet connection.";
        } else if (statusCode === 403) {
          newErrors.email = errorMessage || "Your account is not active. Please contact your administrator.";
        } else {
          newErrors.email = errorMessage || "Login failed. Please try again.";
        }
        setErrors(newErrors);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message === "Network request failed") errorMessage = "Unable to connect to server. Please check your internet connection.";
        else if (error.message.includes("timeout"))    errorMessage = "Connection timeout. Please try again.";
        else if (error.message.includes("ECONNREFUSED")) errorMessage = "Server is not available. Please try again later.";
        logger.error("Login error", { error: error.message, stack: error.stack, email }, "LoginScreen");
      } else {
        logger.error("Login error", { error: String(error), email }, "LoginScreen");
      }
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
      loginTimer();
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) setErrors(prev => ({ ...prev, email: null }));
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) setErrors(prev => ({ ...prev, password: null }));
  };

  // ─── Input border helper ──────────────────────────────────────────────────────
  const inputBorder = (focused: boolean, hasError?: string | null) => {
    if (hasError) return COLORS.accentRed;
    if (focused)  return COLORS.accentBlue;
    return COLORS.borderSubtle;
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero / Brand section ────────────────────────────────────────── */}
          <View style={styles.heroSection}>
            {/* Neon glow circle behind logo */}
            <View style={styles.logoGlow} />
            <Image source={logo} style={styles.logoImage} resizeMode="contain" />

            <View style={styles.brandTextRow}>
              <Text style={styles.tagline}>All in One </Text>
              <View style={styles.taglineHighlight}>
                <Text style={styles.taglineHighlightText}>Driver Platform</Text>
              </View>
            </View>

            <Text style={styles.heroSubtext}>
              Manage trips, logs & fleet — from your pocket.
            </Text>
          </View>

          {/* ── Form card ───────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Neon glow line at card top */}
            <View style={styles.cardGlowLine} />

            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to your account</Text>
            </View>

            {/* ── Email ─────────────────────────────────────────────────────── */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View
              style={[
                styles.inputContainer,
                { borderColor: inputBorder(emailFocused, errors.email) },
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={errors.email ? COLORS.accentRed : emailFocused ? COLORS.accentBlue : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
            {errors.email && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={12} color={COLORS.accentRed} />
                <Text style={styles.errorText}>{errors.email}</Text>
              </View>
            )}

            {/* ── Password ──────────────────────────────────────────────────── */}
            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Password</Text>
            <View
              style={[
                styles.inputContainer,
                { borderColor: inputBorder(passFocused, errors.password) },
                passFocused && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={errors.password ? COLORS.accentRed : passFocused ? COLORS.accentBlue : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={errors.password ? COLORS.accentRed : COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={12} color={COLORS.accentRed} />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}

            {/* ── Sign In button ────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.black} size="small" />
                  <Text style={[styles.loginButtonText, { marginLeft: SPACING.sm }]}>
                    Signing in…
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="log-in-outline" size={20} color={COLORS.black} style={{ marginRight: 6 }} />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Footer note ───────────────────────────────────────────────── */}
            <Text style={styles.footerNote}>
              Having trouble? Contact your fleet administrator.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: SPACING["3xl"],
    paddingBottom: SPACING["2xl"],
    paddingHorizontal: SPACING.base,
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentBlue,
    opacity: 0.06,
    top: SPACING["2xl"],
  },
  logoImage: {
    width: 140,
    height: 46,
    marginBottom: SPACING.xl,
  },
  brandTextRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONT_SIZE["2xl"],
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  taglineHighlight: {
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  taglineHighlightText: {
    fontSize: FONT_SIZE["2xl"],
    color: COLORS.black,
    fontWeight: FONT_WEIGHT.bold,
  },
  heroSubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  // ── Form card ─────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING["2xl"],
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderBottomWidth: 0,
    // shadow
    shadowColor: COLORS.accentBlue,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGlowLine: {
    height: 2,
    backgroundColor: COLORS.accentBlue,
    opacity: 0.50,
    marginHorizontal: SPACING["2xl"],
    borderBottomLeftRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
    marginBottom: SPACING.xl,
  },
  welcomeSection: {
    marginBottom: SPACING.xl,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },

  // ── Inputs ───────────────────────────────────────────────────────────────────
  inputLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  inputContainerFocused: {
    backgroundColor: "rgba(0,209,255,0.04)",
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md + 2,
    fontSize: FONT_SIZE.base,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.accentRed,
    flex: 1,
    lineHeight: 16,
  },

  // ── Button ────────────────────────────────────────────────────────────────────
  loginButton: {
    backgroundColor: COLORS.accentBlue,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xl,
    shadowColor: COLORS.accentBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: "rgba(0,209,255,0.35)",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.black,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Footer note ───────────────────────────────────────────────────────────────
  footerNote: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
