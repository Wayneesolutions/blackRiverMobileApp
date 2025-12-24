// src/screens/auth/LoginScreen.js
import React, { useState, useEffect } from "react";
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
import { apiService } from "../../services/api/apiService";
import { authManager } from "../../types/AuthManager";
import { logger } from '../../utils/loggerHelper';
// Asset import - using require for better compatibility with Expo Go
const shape = require("../../../assets/images/shape.png");
const logo = require("../../../assets/FleetGo.png");

type Props = NativeStackScreenProps<RootStackParamList, "Login"> & {
  onAuthSuccess: (userData?: any) => void;
};


interface LoginErrors {
  email?: string | null;
  password?: string | null;
}

export default function LoginScreen({ navigation, onAuthSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  useEffect(() => {
    // Log screen view
    logger.userAction('Screen View', { screen: 'LoginScreen' }, 'LoginScreen');
  }, []);

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleLogin = async () => {
    if (isLoading) return;

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      logger.userAction('Login Validation Failed', { email }, 'LoginScreen'); // Fixed typo: Logger -> logger
      return;
    }

    setIsLoading(true);
    const loginTimer = logger.startTimer('Login Process');

    // Set up timeout for the request
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        loginTimer();

        logger.userAction('Login Timeout', {
          email,
          error: "Request timeout after 30 seconds"
        }, 'LoginScreen');

        Alert.alert(
          "Connection Timeout",
          "The request took too long. Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
      }
    }, 30000); // 30 second timeout

    try {
      logger.userAction('Login Attempt', { email }, 'LoginScreen');

      // Call login API
      const response = await apiService.login(email, password);

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // Log the full response for debugging
      logger.debug('Login response received', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
        dataStructure: response.data
      });

      // Handle both response structures: direct response or wrapped in data
      // Backend returns: { success: true, message: "...", driver: {...} }
      // apiService wraps it: { success: true, data: { success: true, message: "...", driver: {...} } }
      const backendResponse = response.data;
      const driverData = backendResponse?.driver || (backendResponse && 'id' in backendResponse ? backendResponse : null);
      
      // Type guard to check if driverData has the required properties
      if (response.success && driverData && typeof driverData === 'object' && 'id' in driverData) {
        const driver = driverData as { id: string; name: string; email: string; token: string };

        // Store user data using AuthManager
        await authManager.login({
          id: driver.id,
          name: driver.name,
          email: driver.email,
          token: driver.token,
        });

        // Log successful login
        logger.userAction('Login Success', {
          userId: driver.id,
          email: driver.email
        }, 'LoginScreen');

        // Call success callback to update auth state in AppNavigator
        // This will automatically trigger the AppNavigator to switch from
        // Login/OTP stack to MainTabs stack (which includes Dashboard)
        // No manual navigation needed - the conditional rendering handles it
        onAuthSuccess(driver);

      } else {
        // Handle API error
        let errorMessage = "Login failed. Please try again.";
        let alertTitle = "Login Failed";
        
        // Check if backend returned a specific error message
        const backendResponse = response.data as any;
        if (backendResponse && typeof backendResponse === 'object') {
          // Backend returns: { success: false, message: "..." }
          if (backendResponse.message) {
            errorMessage = backendResponse.message;
          } else if (backendResponse.error) {
            errorMessage = backendResponse.error;
          }
        } else if (response.error) {
          errorMessage = response.error;
        }

        // Check status code to determine error type
        const statusCode = response.statusCode || 0;

        // Network/Connection errors (statusCode 0 or network-related errors)
        if (statusCode === 0 || 
            errorMessage.includes('Unable to connect') || 
            errorMessage.includes('Network request failed') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('timeout')) {
          alertTitle = "Connection Error";
          
          // Format the detailed error message for better readability
          const lines = errorMessage.split('\n');
          const title = lines[0] || 'Connection Error';
          const details = lines.slice(1).join('\n');
          
          logger.userAction('Login Failed - Network Error', {
            email,
            error: errorMessage,
            statusCode: statusCode
          }, 'LoginScreen');

          Alert.alert(
            title,
            details || "Unable to connect to server. Please check:\n• Backend server is running\n• Device and server on same Wi-Fi\n• Firewall allows port 3000",
            [{ text: "OK" }]
          );
        } 
        // Invalid credentials (401, 404, 400 from backend)
        else if (statusCode === 401 || statusCode === 404 || statusCode === 400) {
          // Backend returns specific messages:
          // 404: "Driver not found"
          // 401: "Invalid credentials"
          // 400: "Invalid email or password"
          
          // Use the backend message if available, otherwise show generic invalid credentials
          if (!errorMessage || errorMessage.includes('Login failed') || errorMessage.includes('Request failed')) {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
          }
          
          alertTitle = "Invalid Credentials";
          
          logger.userAction('Login Failed - Invalid Credentials', {
            email,
            error: errorMessage,
            statusCode: statusCode
          }, 'LoginScreen');

          Alert.alert(alertTitle, errorMessage, [{ text: "OK" }]);
        }
        // Account inactive or access denied (403)
        else if (statusCode === 403) {
          alertTitle = "Access Denied";
          
          logger.userAction('Login Failed - Access Denied', {
            email,
            error: errorMessage,
            statusCode: statusCode
          }, 'LoginScreen');

          Alert.alert(alertTitle, errorMessage, [{ text: "OK" }]);
        }
        // Other errors
        else {
          logger.userAction('Login Failed', {
            email,
            error: errorMessage,
            statusCode: statusCode
          }, 'LoginScreen');

          Alert.alert(alertTitle, errorMessage, [{ text: "OK" }]);
        }
      }

    } catch (error: unknown) {
      // ✅ TypeScript-safe error handling
      clearTimeout(timeoutId);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error instanceof Error) {
        if (error.message === "Network request failed") {
          errorMessage =
            "Unable to connect to server. Please check your internet connection.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Connection timeout. Please try again.";
        } else if (error.message.includes("ECONNREFUSED")) {
          errorMessage = "Server is not available. Please try again later.";
        }

        logger.error(
          "Login error",
          {
            error: error.message,
            stack: error.stack,
            email,
          },
          "LoginScreen"
        );
      } else {
        logger.error(
          "Login error",
          {
            error: String(error),
            email,
          },
          "LoginScreen"
        );
      }

      Alert.alert("Connection Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
      loginTimer(); // Complete the timer
    }
  };

  const handleEmailChange = (text: any) => {
    setEmail(text);
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  const handlePasswordChange = (text: any) => {
    setPassword(text);
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: null }));
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
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.tagline}>All in One</Text>
          <Text style={styles.subtitle}>Driver Platform</Text>
        </View>

        {/* Bottom White Section */}
        <View style={styles.formCard}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
          </View>

          {/* Email Input */}
          <View style={[
            styles.inputContainer,
            errors.email && styles.inputContainerError
          ]}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={errors.email ? "#EF4444" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          {/* Password Input */}
          <View style={[
            styles.inputContainer,
            errors.password && styles.inputContainerError
          ]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={errors.password ? "#EF4444" : "#999"}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={errors.password ? "#EF4444" : "#999"}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

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
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>
                  Signing in...
                </Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
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
  logoImage: {
    position: "absolute",
    left: 15,
    top: 12,
    width: 120,
    height: 40,
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
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
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
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 16,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: "#906AD1",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  debugSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  debugText: {
    fontSize: 10,
    color: "#6B7280",
    fontFamily: 'monospace',
  },
  testButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#906AD1",
    borderRadius: 4,
    alignItems: 'center',
  },
  testButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: 'bold',
  },
});
