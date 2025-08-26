import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

type ToggleKey = "offDuty" | "onDuty" | "serviceBreak" | "drive";

interface ToggleStates {
    offDuty: boolean;
    onDuty: boolean;
    serviceBreak: boolean;
    drive: boolean;
}

const HoursOfService = () => {
    const [showExemptions, setShowExemptions] = useState(false);
    const [toggleStates, setToggleStates] = useState<ToggleStates>({
        offDuty: false,
        onDuty: false,
        serviceBreak: false,
        drive: false,
    });

    const handleToggle = (key: ToggleKey) => {
        // Logic: Only one can be active at a time
        const newStates: ToggleStates = {
            offDuty: false,
            onDuty: false,
            serviceBreak: false,
            drive: false,
        };
        newStates[key] = !toggleStates[key];
        setToggleStates(newStates);
    };

    const renderToggleRow = (label: string, key: ToggleKey, isActive: boolean, showSwitch: boolean = true) => (
        <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{label}</Text>
            {showSwitch ? (
                <Switch
                    value={isActive}
                    onValueChange={() => handleToggle(key)}
                    trackColor={{
                        false: '#e0e0e0',
                        true: key === 'serviceBreak' ? '#00bcd4' : '#4caf50'
                    }}
                    thumbColor={isActive ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#e0e0e0"
                />
            ) : (
                <View style={styles.inactiveSwitch} />
            )}
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerText}>Hour Of Service</Text>
        </View>
    );

    const renderPropertyCard = () => (
        <View style={styles.propertyCard}>
            <Text style={styles.propertyText}>Property 70 Hours/8days (16- Hours Exemption)</Text>
        </View>
    );

    const renderTimeContainer = () => (
        <View style={styles.timeContainer}>
            <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>SERVICE BREAK</Text>
                <Text style={styles.timeValue}>8:00</Text>
            </View>
            <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Driving Left</Text>
                <Text style={styles.timeValue}>11:00</Text>
            </View>
            <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Workday left</Text>
                <Text style={styles.timeValue}>12:20</Text>
            </View>
            <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Cycle Left</Text>
                <Text style={styles.timeValue}>11:00</Text>
            </View>
        </View>
    );

    const renderToggleSection = () => {
        if (showExemptions) {
            // Show only SERVICE BREAK and DRIVE when exemptions are visible
            return (
                <View style={styles.toggleContainer}>
                    {renderToggleRow('SERVICE BREAK', 'serviceBreak', toggleStates.serviceBreak, false)}
                    {renderToggleRow('DRIVE', 'drive', toggleStates.drive, false)}
                </View>
            );
        } else {
            // Show all toggles when exemptions are hidden
            return (
                <View style={styles.toggleContainer}>
                    {renderToggleRow('OFF DUTY', 'offDuty', toggleStates.offDuty)}
                    {renderToggleRow('ON DUTY', 'onDuty', toggleStates.onDuty)}
                    {renderToggleRow('SERVICE BREAK', 'serviceBreak', toggleStates.serviceBreak)}
                    {renderToggleRow('DRIVE', 'drive', toggleStates.drive)}
                </View>
            );
        }
    };

    const renderExemptionsSection = () => {
        if (!showExemptions) return null;

        return (
            <View style={styles.exemptionsSection}>
                <Text style={styles.exemptionsTitle}>Exemptions</Text>
                <Text style={styles.exemptionsSubtitle}>Adverse Driving Conditions</Text>

                <View style={styles.exemptionRow}>
                    <Text style={styles.exemptionLabel}>16 Hours Exemption</Text>
                    <TouchableOpacity style={styles.applyButton}>
                        <Text style={styles.applyButtonText}>Apply Today</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderButtons = () => (
        <View style={styles.buttonsContainer}>
            <TouchableOpacity 
                style={[styles.cycleButton, showExemptions && styles.cycleButtonSecondPage]}
                onPress={() => {/* Handle View Cycle Recap */}}
            >
                <Text style={styles.cycleButtonText}>View Cycle Recap</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.exemptionButton, showExemptions && styles.exemptionCardExpanded]}
                onPress={() => setShowExemptions(!showExemptions)}
            >
                <Text style={styles.exemptionButtonText}>
                    View Exemption {showExemptions ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView 
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {renderHeader()}
            {renderToggleSection()}
            {renderPropertyCard()}
            {renderTimeContainer()}
            {renderExemptionsSection()}
            {renderButtons()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 30,
    },
    header: {
        backgroundColor: '#9575cd',
        paddingVertical: 15,
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 20,
    },
    headerText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 20,
        paddingVertical: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    inactiveSwitch: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e0e0e0',
    },
    propertyCard: {
        backgroundColor: '#9575cd',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    propertyText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    timeContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 20,
        paddingVertical: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    timeLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '400',
    },
    timeValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    exemptionsSection: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    exemptionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    exemptionsSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    exemptionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exemptionLabel: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    applyButton: {
        backgroundColor: '#4caf50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    applyButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    buttonsContainer: {
        gap: 15,
    },
    cycleButton: {
        backgroundColor: '#4caf50',
        paddingVertical: 15,
        borderRadius: 8,
    },
    cycleButtonSecondPage: {
        backgroundColor: '#e91e63',
    },
    cycleButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    exemptionButton: {
        backgroundColor: '#e91e63',
        paddingVertical: 15,
        borderRadius: 8,
    },
    exemptionCardExpanded: {
        backgroundColor: '#e91e63',
    },
    exemptionButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HoursOfService;