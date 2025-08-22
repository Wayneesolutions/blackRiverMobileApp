// src/navigation/MainNavigator.tsx
export type MainTabParamList = {
    Dashboard: undefined;
    Vehicle: undefined;
    Trailer: undefined;
    Documents: undefined;
    Settings: undefined;
};

export type RootStackParamList = {
    // Auth Stack
    Login: undefined;
    OTP: undefined; // 👈 added

    // Main App
    MainTabs: undefined;

    // Modal Screens
    SOS: undefined;
    AssetIncidents: undefined;
    PayrollDetails: undefined;
    LoadMap: undefined;
    RoadsideCheck: undefined;
    DocumentViewer: { documentId: string };
    VehicleDetails: { vehicleId: string };
    TrailerDetails: { trailerId: string };
};