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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator"; // adjust path
import shape from "../../../assets/images/shape.png"; // purple shape

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    const validEmail = "testuser@gmail.com";
    const validPassword = "123456";

    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (email === validEmail && password === validPassword) {
      navigation.navigate("OTP"); // 👈 navigate to OTP screen
    } else {
      Alert.alert(
        "Error",
        "Invalid credentials. Use admin@fleetgo.com / 123456"
      );
    }
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
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
    bottom: 20,
    padding: 2,
  },
  formCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
  },
  passwordContainer: { flexDirection: "row", alignItems: "center" },
  eyeIcon: { position: "absolute", right: 16, padding: 4 },
  loginButton: {
    backgroundColor: "#906AD1",
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    width: 250,
    alignSelf: "center",
  },
  loginButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
});
