// src/screens/auth/LoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import shape from "../../../assets/images/shape.png";

type Props = NativeStackScreenProps<RootStackParamList, "Login"> & {
  onAuthSuccess: (userData?: any) => void;
};

export default function LoginScreen({ navigation, onAuthSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Demo credentials - in production, this would be handled by your API
  const DEMO_CREDENTIALS = {
    email: "testuser@gmail.com",
    password: "123456"
  };

  const handleLogin = async () => {
    if (isLoading) return;

    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please enter both email and password");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check credentials
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        // Navigate to OTP screen for verification
        navigation.navigate("OTP");
      } else {
        Alert.alert(
          "Login Failed",
          `Invalid credentials.\n\nDemo credentials:\nEmail: ${DEMO_CREDENTIALS.email}\nPassword: ${DEMO_CREDENTIALS.password}`,
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Error",
        "An error occurred during login. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Top Purple Section */}
        <View style={styles.topSection}>
          <Image source={shape} style={styles.shapeImage} resizeMode="cover" />
          <Text style={styles.logoText}>FleetGo</Text>
          <Text style={styles.tagline}>All in One</Text>
          <Text style={styles.subtitle}>Driver Platform</Text>
        </View>

        {/* Bottom White Section */}
        <View style={styles.formCard}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>

          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Demo Credentials Button */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <Text style={styles.demoButtonText}>Use Demo Credentials</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>


        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  topSection: {
    flex: 1,
    backgroundColor: "#906AD1",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 30,
  },
  shapeImage: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 175,
    height: 250,
  },
  logoText: {
    position: "absolute",
    left: 15,
    top: 12,
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  tagline: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "600",
    position: "absolute",
    left: 15,
    bottom: 57,
  },
  subtitle: {
    fontSize: 26,
    color: "black",
    fontWeight: "600",
    position: "absolute",
    backgroundColor: "white",
    left: 15,
    bottom: 10,
    padding: 2,
  },
  formCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  welcomeSection: {
    marginBottom: 32,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  demoButton: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 16,
  },
  demoButtonText: {
    fontSize: 14,
    color: "#906AD1",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#906AD1",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#906AD1",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: "#C4B5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  additionalOptions: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 16,
    color: "#906AD1",
    fontWeight: "500",
  },
});