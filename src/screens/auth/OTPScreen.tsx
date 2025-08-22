import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import otpImage from "../../../assets/images/otp.png";

interface OTPScreenProps {
    navigation: any;
    setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function OTPScreen({ navigation, setIsAuthenticated }: OTPScreenProps) {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const inputs = useRef<TextInput[]>([]);

    const handleChange = (value: string, index: number) => {
        if (/^[0-9]?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < 5) {
                inputs.current[index + 1]?.focus();
            }
        }
    };

    const handleVerify = () => {
        const enteredOtp = otp.join("");
        if (enteredOtp === "123456") {
            // First authenticate
            setIsAuthenticated(true);

            // Then navigate
            navigation.replace("MainTabs");
        } else {
            Alert.alert("Error", "Invalid OTP. Please try 123456.");
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Top Section */}
                <View style={styles.topSection}>
                    <Text style={styles.logo}>FleetGo</Text>
                </View>

                {/* Bottom White Card */}
                <View style={styles.card}>
                    <Text style={styles.title}>Verification required</Text>
                    <Text style={styles.subtitle}>
                        Enter the code sent to <Text style={styles.bold}>alexsmith@content-mobbin.com</Text>
                    </Text>

                    <Image source={otpImage} style={styles.image} resizeMode="contain" />

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            We highly encourage setting up an authenticator app for the highest level
                            of security. You can set up an authenticator app anytime through account
                            settings &gt; security.
                        </Text>
                    </View>

                    {/* OTP Inputs */}
                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    if (ref) inputs.current[index] = ref;
                                }}
                                style={styles.otpInput}
                                keyboardType="numeric"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleChange(value, index)}
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
                        <Text style={styles.verifyText}>Verify</Text>
                    </TouchableOpacity>

                    {/* Resend Timer */}
                    <Text style={styles.resendText}>Resend again in (01:49)</Text>



                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    topSection: {
        padding: 40,
        backgroundColor: "#906AD1",
    },
    logo: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
    },
    card: {
        flex: 1,
        backgroundColor: "#fff",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        alignItems: "center",

        // 👇 new additions
        marginTop: -20, // pull card upward over purple
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    title: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 6 },
    subtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 16,
    },
    bold: { fontWeight: "600", color: "#333" },
    image: { width: 120, height: 120, marginBottom: 16 },
    infoBox: {
        backgroundColor: "#F8F8F8",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    infoText: { fontSize: 13, color: "#444", textAlign: "center" },
    otpContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
        width: "80%",
    },
    otpInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        width: 45,
        height: 55,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        backgroundColor: "#FAFAFA",
    },
    verifyButton: {
        backgroundColor: "#906AD1",
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 40,
        marginBottom: 16,
    },
    verifyText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    resendText: { fontSize: 14, color: "#888", marginBottom: 12 },
    supportText: { fontSize: 13, color: "#666" },
    link: { color: "#906AD1", textDecorationLine: "underline" },
});
