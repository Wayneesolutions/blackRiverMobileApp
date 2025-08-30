
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: screenWidth } = Dimensions.get('window');

// Types
type RootStackParamList = {
    Dashboard: undefined;
    MainTabs: { screen?: string };
    TripDetails: { trip: ActiveTripItem };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ActiveTripItem {
    id: string;
    tripId: string;
    vehicle: {
        name: string;
        serialNo: string;
    };
    trailer?: {
        name: string;
        serialNo: string;
    } | null;
    shipment: {
        id: string;
        description: string;
    };
    route: {
        origin: string;
        destination: string;
        distance: string;
        estimatedTime: string;
    };
    status: string;
    statusColor: string;
    progress: number; // 0-100
    driver: {
        name: string;
        id: string;
    };
    startTime: string;
    estimatedArrival: string;
    currentLocation: string;
    nextCheckpoint: string;
    checkpointDistance: string;
    inspection: {
        hasDefects: boolean;
        defectCount: number;
        inspectionType: string;
        location: string;
        remarks: string;
        completedAt: string;
    };
}

// Static Data for Active Trips
const STATIC_ACTIVE_TRIPS: ActiveTripItem[] = [
    {
        id: '1',
        tripId: 'TR000001',
        vehicle: {
            name: 'Freightliner Cascadia',
            serialNo: 'FL-2023-001'
        },
        trailer: {
            name: 'Utility Dry Van',
            serialNo: 'UV-2023-045'
        },
        shipment: {
            id: 'SHP001',
            description: 'Electronics Equipment - Mixed Cargo'
        },
        route: {
            origin: 'Los Angeles, CA',
            destination: 'Phoenix, AZ',
            distance: '372 miles',
            estimatedTime: '5h 45m'
        },
        status: 'On Route',
        statusColor: '#10B981',
        progress: 65,
        driver: {
            name: 'John Martinez',
            id: 'DR001'
        },
        startTime: '6:30 AM',
        estimatedArrival: '1:15 PM',
        currentLocation: 'I-10 Near Blythe, CA',
        nextCheckpoint: 'Phoenix Distribution Center',
        checkpointDistance: '128 miles',
        inspection: {
            hasDefects: false,
            defectCount: 0,
            inspectionType: 'Pre-Trip',
            location: 'Los Angeles Terminal',
            remarks: 'All systems operational. Vehicle in excellent condition.',
            completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '2',
        tripId: 'TR000002',
        vehicle: {
            name: 'Peterbilt 579',
            serialNo: 'PB-2022-087'
        },
        trailer: {
            name: 'Great Dane Reefer',
            serialNo: 'GD-2023-112'
        },
        shipment: {
            id: 'SHP002',
            description: 'Fresh Produce - Temperature Controlled'
        },
        route: {
            origin: 'Salinas, CA',
            destination: 'Seattle, WA',
            distance: '845 miles',
            estimatedTime: '12h 30m'
        },
        status: 'Loading',
        statusColor: '#F59E0B',
        progress: 15,
        driver: {
            name: 'Sarah Johnson',
            id: 'DR002'
        },
        startTime: '5:00 AM',
        estimatedArrival: '8:30 PM',
        currentLocation: 'Salinas Cold Storage',
        nextCheckpoint: 'Sacramento Checkpoint',
        checkpointDistance: '98 miles',
        inspection: {
            hasDefects: true,
            defectCount: 2,
            inspectionType: 'Pre-Trip',
            location: 'Salinas Terminal',
            remarks: 'Minor tire wear on trailer axle 2. Refrigeration unit serviced.',
            completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '3',
        tripId: 'TR000003',
        vehicle: {
            name: 'Volvo VNL 760',
            serialNo: 'VV-2023-034'
        },
        trailer: null,
        shipment: {
            id: 'SHP003',
            description: 'Construction Materials - Steel Beams'
        },
        route: {
            origin: 'Houston, TX',
            destination: 'Dallas, TX',
            distance: '242 miles',
            estimatedTime: '3h 50m'
        },
        status: 'Near Destination',
        statusColor: '#059669',
        progress: 92,
        driver: {
            name: 'Mike Thompson',
            id: 'DR003'
        },
        startTime: '8:15 AM',
        estimatedArrival: '12:30 PM',
        currentLocation: 'I-45 Near Corsicana',
        nextCheckpoint: 'Dallas Construction Site',
        checkpointDistance: '18 miles',
        inspection: {
            hasDefects: false,
            defectCount: 0,
            inspectionType: 'Pre-Trip',
            location: 'Houston Yard',
            remarks: 'Vehicle and load securing chains inspected. All safety protocols met.',
            completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '4',
        tripId: 'TR000004',
        vehicle: {
            name: 'Kenworth T880',
            serialNo: 'KW-2023-156'
        },
        trailer: {
            name: 'Fontaine Flatbed',
            serialNo: 'FF-2022-203'
        },
        shipment: {
            id: 'SHP004',
            description: 'Heavy Machinery - Excavator Transport'
        },
        route: {
            origin: 'Denver, CO',
            destination: 'Las Vegas, NV',
            distance: '756 miles',
            estimatedTime: '11h 15m'
        },
        status: 'Maintenance Required',
        statusColor: '#EF4444',
        progress: 8,
        driver: {
            name: 'Robert Chen',
            id: 'DR004'
        },
        startTime: '4:45 AM',
        estimatedArrival: '7:00 PM',
        currentLocation: 'Denver Service Center',
        nextCheckpoint: 'Grand Junction, CO',
        checkpointDistance: '245 miles',
        inspection: {
            hasDefects: true,
            defectCount: 3,
            inspectionType: 'Pre-Trip',
            location: 'Denver Terminal',
            remarks: 'Air brake system needs adjustment. Hydraulic leak in trailer. DOT inspection overdue.',
            completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '5',
        tripId: 'TR000005',
        vehicle: {
            name: 'Mack Anthem',
            serialNo: 'MA-2023-089'
        },
        trailer: {
            name: 'Wabash DuraPlate',
            serialNo: 'WD-2023-078'
        },
        shipment: {
            id: 'SHP005',
            description: 'Retail Goods - Mixed Pallets'
        },
        route: {
            origin: 'Atlanta, GA',
            destination: 'Miami, FL',
            distance: '662 miles',
            estimatedTime: '9h 45m'
        },
        status: 'On Route',
        statusColor: '#10B981',
        progress: 45,
        driver: {
            name: 'Lisa Rodriguez',
            id: 'DR005'
        },
        startTime: '7:00 AM',
        estimatedArrival: '6:30 PM',
        currentLocation: 'I-75 Near Gainesville, FL',
        nextCheckpoint: 'Ocala Rest Stop',
        checkpointDistance: '67 miles',
        inspection: {
            hasDefects: false,
            defectCount: 0,
            inspectionType: 'Pre-Trip',
            location: 'Atlanta Hub',
            remarks: 'Excellent vehicle condition. Load properly secured and documented.',
            completedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '6',
        tripId: 'TR000006',
        vehicle: {
            name: 'International LT',
            serialNo: 'IN-2022-145'
        },
        trailer: {
            name: 'Timpte Hopper',
            serialNo: 'TH-2023-091'
        },
        shipment: {
            id: 'SHP006',
            description: 'Agricultural Feed - Grain Transport'
        },
        route: {
            origin: 'Omaha, NE',
            destination: 'Kansas City, MO',
            distance: '185 miles',
            estimatedTime: '2h 55m'
        },
        status: 'Departed',
        statusColor: '#8B5CF6',
        progress: 35,
        driver: {
            name: 'David Wilson',
            id: 'DR006'
        },
        startTime: '9:30 AM',
        estimatedArrival: '1:15 PM',
        currentLocation: 'US-34 Near Villisca, IA',
        nextCheckpoint: 'Kansas City Terminal',
        checkpointDistance: '89 miles',
        inspection: {
            hasDefects: true,
            defectCount: 1,
            inspectionType: 'Pre-Trip',
            location: 'Omaha Grain Facility',
            remarks: 'Minor hydraulic seal replacement needed on trailer gate mechanism.',
            completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '7',
        tripId: 'TR000007',
        vehicle: {
            name: 'Western Star 5700XE',
            serialNo: 'WS-2023-067'
        },
        trailer: null,
        shipment: {
            id: 'SHP007',
            description: 'Fuel Transport - Diesel Delivery'
        },
        route: {
            origin: 'Bakersfield, CA',
            destination: 'Fresno, CA',
            distance: '112 miles',
            estimatedTime: '1h 45m'
        },
        status: 'Preparing',
        statusColor: '#F59E0B',
        progress: 5,
        driver: {
            name: 'Carlos Mendoza',
            id: 'DR007'
        },
        startTime: '11:00 AM',
        estimatedArrival: '1:30 PM',
        currentLocation: 'Bakersfield Fuel Terminal',
        nextCheckpoint: 'Fresno Delivery Point',
        checkpointDistance: '112 miles',
        inspection: {
            hasDefects: false,
            defectCount: 0,
            inspectionType: 'Hazmat Pre-Trip',
            location: 'Bakersfield Terminal',
            remarks: 'Hazmat certification current. Tank integrity verified. Safety equipment checked.',
            completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
    },
    {
        id: '8',
        tripId: 'TR000008',
        vehicle: {
            name: 'Freightliner Columbia',
            serialNo: 'FL-2022-198'
        },
        trailer: {
            name: 'Hyundai Container',
            serialNo: 'HC-2023-134'
        },
        shipment: {
            id: 'SHP008',
            description: 'Import Containers - Mixed Goods'
        },
        route: {
            origin: 'Long Beach, CA',
            destination: 'Las Vegas, NV',
            distance: '270 miles',
            estimatedTime: '4h 20m'
        },
        status: 'On Route',
        statusColor: '#10B981',
        progress: 78,
        driver: {
            name: 'Jennifer Kim',
            id: 'DR008'
        },
        startTime: '6:00 AM',
        estimatedArrival: '11:45 AM',
        currentLocation: 'I-15 Near Barstow, CA',
        nextCheckpoint: 'Las Vegas Distribution',
        checkpointDistance: '48 miles',
        inspection: {
            hasDefects: false,
            defectCount: 0,
            inspectionType: 'Pre-Trip',
            location: 'Long Beach Port',
            remarks: 'Container seals verified. Customs documentation complete.',
            completedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        }
    }
];

interface CreatedTrip {
    id: string;
    tripId: string;
    vehicle: {
        name: string;
        serialNo: string;
        status: string;
        location: string;
    };
    trailer?: {
        name: string;
        serialNo: string;
        status: string;
        location: string;
    } | null;
    shipment: {
        id: string;
        name: string;
        serialNo: string;
        status: string;
        location: string;
    };
    inspection: {
        hasDefects: boolean;
        defectCount: number;
        inspectionType: string;
        location: string;
        remarks: string;
        completedAt: string;
        defects: string[];
    };
    createdAt: string;
}

// Mock storage service - replace with your actual storage solution
class TripStorageService {
    private static trips: CreatedTrip[] = [];
    private static tripCounter = 1;

    static addTrip(tripData: Omit<CreatedTrip, 'id' | 'tripId' | 'createdAt'>): CreatedTrip {
        const newTrip: CreatedTrip = {
            ...tripData,
            id: Date.now().toString(),
            tripId: `TR${String(this.tripCounter).padStart(6, '0')}`,
            createdAt: new Date().toISOString(),
        };
        this.tripCounter++;
        this.trips.push(newTrip);
        return newTrip;
    }

    static getTrips(): CreatedTrip[] {
        return this.trips;
    }

    static getTripById(id: string): CreatedTrip | undefined {
        return this.trips.find(trip => trip.id === id);
    }

    static updateTripProgress(tripId: string, progress: number, status: string): void {
        const trip = this.trips.find(t => t.id === tripId);
        if (trip) {
            // Update would go here - for now we'll simulate progress
        }
    }
}

// Back Button Component
const BackButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
        <Text style={styles.backButtonText}>← Back</Text>
    </TouchableOpacity>
);

// Progress Bar Component
const ProgressBar = ({ progress }: { progress: number }) => (
    <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
    </View>
);

// Inspection Status Component
const InspectionStatus = ({ inspection }: { inspection: ActiveTripItem['inspection'] }) => (
    <View style={styles.inspectionSection}>
        <View style={styles.inspectionHeader}>
            <Text style={styles.inspectionTitle}>Inspection Status</Text>
            <View style={[
                styles.inspectionBadge,
                { backgroundColor: inspection.hasDefects ? '#FEE2E2' : '#D1FAE5' }
            ]}>
                <Text style={[
                    styles.inspectionBadgeText,
                    { color: inspection.hasDefects ? '#DC2626' : '#059669' }
                ]}>
                    {inspection.hasDefects ? `${inspection.defectCount} Defects` : 'No Defects'}
                </Text>
            </View>
        </View>

        <View style={styles.inspectionDetails}>
            <View style={styles.inspectionRow}>
                <Text style={styles.inspectionLabel}>Type:</Text>
                <Text style={styles.inspectionValue}>{inspection.inspectionType}</Text>
            </View>
            {inspection.location && (
                <View style={styles.inspectionRow}>
                    <Text style={styles.inspectionLabel}>Location:</Text>
                    <Text style={styles.inspectionValue}>{inspection.location}</Text>
                </View>
            )}
            {inspection.remarks && (
                <View style={styles.inspectionRow}>
                    <Text style={styles.inspectionLabel}>Remarks:</Text>
                    <Text style={styles.inspectionValue} numberOfLines={2}>{inspection.remarks}</Text>
                </View>
            )}
            <View style={styles.inspectionRow}>
                <Text style={styles.inspectionLabel}>Completed:</Text>
                <Text style={styles.inspectionValue}>
                    {new Date(inspection.completedAt).toLocaleString()}
                </Text>
            </View>
        </View>
    </View>
);

// Trip Card Component
const TripCard = ({
    trip,
    onPress
}: {
    trip: ActiveTripItem;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.tripCard} onPress={onPress}>
        <View style={styles.tripCardHeader}>
            <View style={styles.tripIdSection}>
                <Text style={styles.tripId}>Trip {trip.tripId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: trip.statusColor + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: trip.statusColor }]}>
                        {trip.status}
                    </Text>
                </View>
            </View>
        </View>

        <View style={styles.tripCardContent}>
            {/* Vehicle & Trailer Info */}
            <View style={styles.vehicleSection}>
                <Text style={styles.vehicleText}>
                    {trip.vehicle.name} ({trip.vehicle.serialNo})
                </Text>
                {trip.trailer && (
                    <Text style={styles.trailerText}>
                        + {trip.trailer.name} ({trip.trailer.serialNo})
                    </Text>
                )}
            </View>

            {/* Route Info */}
            <View style={styles.routeSection}>
                <View style={styles.routeRow}>
                    <Text style={styles.routeLabel}>From:</Text>
                    <Text style={styles.routeValue}>{trip.route.origin}</Text>
                </View>
                <View style={styles.routeRow}>
                    <Text style={styles.routeLabel}>To:</Text>
                    <Text style={styles.routeValue}>{trip.route.destination}</Text>
                </View>
                <View style={styles.routeRow}>
                    <Text style={styles.routeLabel}>Distance:</Text>
                    <Text style={styles.routeValue}>{trip.route.distance}</Text>
                </View>
            </View>

            {/* Progress */}
            <ProgressBar progress={trip.progress} />

            {/* Driver & Time Info */}
            <View style={styles.bottomSection}>
                <View style={styles.driverInfo}>
                    <Text style={styles.driverLabel}>Driver:</Text>
                    <Text style={styles.driverName}>{trip.driver.name}</Text>
                </View>
                <View style={styles.timeInfo}>
                    <Text style={styles.timeLabel}>ETA:</Text>
                    <Text style={styles.timeValue}>{trip.estimatedArrival}</Text>
                </View>
            </View>

            {/* Current Location */}
            <View style={styles.locationSection}>
                <Text style={styles.locationLabel}>Current Location:</Text>
                <Text style={styles.locationValue}>{trip.currentLocation}</Text>
            </View>

            {/* Next Checkpoint */}
            <View style={styles.checkpointSection}>
                <Text style={styles.checkpointLabel}>Next Checkpoint:</Text>
                <Text style={styles.checkpointValue}>
                    {trip.nextCheckpoint} ({trip.checkpointDistance})
                </Text>
            </View>

            {/* Inspection Status */}
            <InspectionStatus inspection={trip.inspection} />
        </View>
    </TouchableOpacity>
);

// Search Component
const SearchBar = ({
    searchQuery,
    setSearchQuery,
    placeholder
}: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    placeholder: string;
}) => (
    <View style={styles.searchCard}>
        <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.searchIcon}>🔍</Text>
    </View>
);

// Main Component
const ActiveTripsScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeTrips, setActiveTrips] = useState<ActiveTripItem[]>(STATIC_ACTIVE_TRIPS);
    const [filteredTrips, setFilteredTrips] = useState<ActiveTripItem[]>(STATIC_ACTIVE_TRIPS);

    // Load trips when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            // Using static data now, but keeping the structure for future API integration
            setActiveTrips(STATIC_ACTIVE_TRIPS);
            setFilteredTrips(STATIC_ACTIVE_TRIPS);
        }, [])
    );

    // Filter trips based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredTrips(activeTrips);
        } else {
            const filtered = activeTrips.filter(
                (trip) =>
                    trip.tripId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.vehicle.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.route.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.route.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    trip.inspection.inspectionType.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredTrips(filtered);
        }
    }, [searchQuery, activeTrips]);

    const handleBack = () => {
        // navigation.navigate('MainTabs', { screen: 'Dashboard' });
        console.log('Back to Dashboard');
    };

    const handleTripPress = (trip: ActiveTripItem) => {
        console.log('Trip selected:', trip.tripId);
        // You can implement navigation to a detailed trip view here
        // navigation.navigate('TripDetails', { trip });
    };

    // Get status count for header
    const getStatusCounts = () => {
        const counts = {
            total: activeTrips.length,
            onRoute: activeTrips.filter(trip => trip.status === 'On Route').length,
            loading: activeTrips.filter(trip => trip.status === 'Loading' || trip.status === 'Preparing').length,
            delayed: activeTrips.filter(trip => trip.status === 'Maintenance Required').length,
            withDefects: activeTrips.filter(trip => trip.inspection.hasDefects).length,
        };
        return counts;
    };

    const statusCounts = getStatusCounts();

    return (

        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

                <View style={styles.mainContainer}>
                    {/* Header */}
                    <View style={styles.header}>

                        <Text style={styles.headerTitle}>Active Trips</Text>
                        <View style={styles.headerSpacer} />
                    </View>

                    {/* Stats Cards */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{statusCounts.total}</Text>
                            <Text style={styles.statLabel}>Total Active</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: '#10B981' }]}>{statusCounts.onRoute}</Text>
                            <Text style={styles.statLabel}>On Route</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{statusCounts.loading}</Text>
                            <Text style={styles.statLabel}>Loading</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{statusCounts.withDefects}</Text>
                            <Text style={styles.statLabel}>With Defects</Text>
                        </View>
                    </View>

                    {/* Search */}
                    <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        placeholder="Search trips by ID, vehicle, inspection..."
                    />

                    {/* Results Header */}
                    <View style={styles.resultsHeader}>
                        <Text style={styles.resultsTitle}>
                            {searchQuery ? `Results (${filteredTrips.length})` : `All Active Trips`}
                        </Text>
                    </View>

                    {/* Trip List */}
                    <ScrollView
                        style={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {filteredTrips.length > 0 ? (
                            filteredTrips.map((trip) => (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    onPress={() => handleTripPress(trip)}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    {activeTrips.length === 0 ? 'No trips created yet' : 'No trips found'}
                                </Text>
                                <Text style={styles.emptyStateSubtext}>
                                    {activeTrips.length === 0
                                        ? 'Create your first trip to see it here'
                                        : 'Try adjusting your search terms'
                                    }
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </ScrollView>
        </SafeAreaView>

    );
};

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40, // Add padding to account for footer
    },
    mainContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 16,
        marginTop: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
        textAlign: 'left',
    },
    headerSpacer: {
        width: 50,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    tripCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    tripCardHeader: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tripIdSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tripId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    tripCardContent: {
        padding: 16,
        gap: 12,
    },
    vehicleSection: {
        gap: 4,
    },
    vehicleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    trailerText: {
        fontSize: 12,
        color: '#6B7280',
    },
    routeSection: {
        gap: 4,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeLabel: {
        fontSize: 12,
        color: '#6B7280',
        width: 60,
    },
    routeValue: {
        fontSize: 12,
        color: '#111827',
        flex: 1,
        fontWeight: '500',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBarBackground: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#8B5CF6',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8B5CF6',
        minWidth: 35,
        textAlign: 'right',
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    driverInfo: {
        flex: 1,
    },
    driverLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    driverName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#111827',
    },
    timeInfo: {
        alignItems: 'flex-end',
    },
    timeLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    timeValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#10B981',
    },
    locationSection: {
        backgroundColor: '#F3F4F6',
        padding: 8,
        borderRadius: 6,
        marginTop: 4,
    },
    locationLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 2,
    },
    locationValue: {
        fontSize: 12,
        fontWeight: '500',
        color: '#111827',
    },
    checkpointSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    checkpointLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    checkpointValue: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8B5CF6',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    resultsHeader: {
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 4,
    },

    searchCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
        paddingVertical: 4,
    },
    searchIcon: {
        fontSize: 18,
        marginLeft: 8,
        color: "#6B7280",
    },
    inspectionSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inspectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    inspectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    inspectionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    inspectionBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    inspectionDetails: {
        gap: 4,
    },
    inspectionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    inspectionLabel: {
        fontSize: 11,
        color: '#6B7280',
        width: 70,
        flexShrink: 0,
    },
    inspectionValue: {
        fontSize: 11,
        color: '#111827',
        flex: 1,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

// Export the storage service for use in other screens
export { TripStorageService };
export default ActiveTripsScreen;