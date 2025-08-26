import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';

const DVIRInspection = () => {
    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>Cascadio : S.No : 1253566</Text>
                <Text style={styles.headerSub}>👁 Need Review</Text>
            </View>

            {/* Top Details */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.label}>Centre Name</Text>
                    <Text style={styles.value}>Canada, GHA</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Carrier Address</Text>
                    <Text style={styles.value}>Canada, 105 Shrinking, GHA</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>August 28, 2025 - 2:45 PM</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Inspection Location</Text>
                    <Text style={styles.value}>105 Aberdeen Road, Canada</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Inspection Type</Text>
                    <Text style={styles.value}>Pre Trip</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Asset Type</Text>
                    <Text style={styles.value}>Vehicle</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Unit Number</Text>
                    <Text style={styles.value}>Cascadio : S.No : 1253566</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Signed By</Text>
                    <Text style={styles.value}>Morgan</Text>
                </View>
            </View>


            {/* Information */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Information</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.label}>VIN</Text>
                    <Text style={styles.value}>kidgn165464</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Trainer</Text>
                    <Text style={styles.value}>None</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Inspector Name</Text>
                    <Text style={styles.value}>Morgan</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Operator</Text>
                    <Text style={styles.value}>Morgan</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Home Terminal</Text>
                    <Text style={styles.value}>Above Care Logistics</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Home Terminal</Text>
                    <Text style={styles.value}>105 Shrinking Spring</Text>
                </View>

            </View>

            {/* Driver Certification */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Driver Certification</Text>
            </View>
            <View style={styles.card}>
                <TextInput
                    style={styles.remarkInput}
                    placeholder="Add a Remark"
                    placeholderTextColor="#aaa"
                    multiline
                />
            </View>

            {/* Certify Button */}
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Certify Previous Inspection</Text>
            </TouchableOpacity>
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
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    headerSub: {
        color: 'white',
        fontSize: 14,
    },
    card: {
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
    rowText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#555',
        fontWeight: '500',
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        flexShrink: 1, // keeps long text from breaking layout
        textAlign: 'right',
    },

    sectionHeader: {
        backgroundColor: '#9575cd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    remarkInput: {
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        fontSize: 14,
        color: '#333',
    },
    button: {
        backgroundColor: '#e91e63',
        paddingVertical: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DVIRInspection;
