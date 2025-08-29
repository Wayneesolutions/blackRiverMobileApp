// App.js
import React from "react";
import { SafeAreaView } from "react-native";
import DriverTracking from "./components/DriverTracking";

export default function App() {
  // Example: pass loadId; ideally you get this from navigation or server
  const loadId = "PUT_YOUR_LOAD_ID_HERE";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DriverTracking loadId={loadId} />
    </SafeAreaView>
  );
}

// components/DriverTracking.js
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import io from "socket.io-client";
import axios from "axios";

const SERVER_URL = "http://YOUR_SERVER_IP:4000"; // replace

export default function DriverTracking({ loadId }) {
  const socketRef = useRef(null);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [history, setHistory] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [stats, setStats] = useState({ total: 0, traveled: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadId) return;
    // fetch load details (pickup/dropoff)
    (async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/loads/${loadId}`);
        const load = res.data;
        if (load?.route?.selectPickup) {
          setPickup({
            latitude: parseFloat(load.route.selectPickup.latitude),
            longitude: parseFloat(load.route.selectPickup.longitude)
          });
        }
        if (load?.route?.selectDropOff) {
          setDropoff({
            latitude: parseFloat(load.route.selectDropOff.latitude),
            longitude: parseFloat(load.route.selectDropOff.longitude)
          });
        }
      } catch (err) {
        console.warn("Failed to fetch load:", err.message || err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadId]);

  useEffect(() => {
    // Setup socket once pickup/dropoff loaded (or even before)
    socketRef.current = io(SERVER_URL, { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      console.log("Socket connected", socketRef.current.id);
      socketRef.current.emit("joinLoad", { loadId });
    });

    socketRef.current.on("locationUpdate", (data) => {
      // data.history is array of {latitude, longitude, timestamp}
    
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude
      });

      if (Array.isArray(data.history)) {
        // convert to numeric coords for Polyline
        const coords = data.history.map(h => ({
          latitude: parseFloat(h.latitude),
          longitude: parseFloat(h.longitude)
        })).filter(c => !Number.isNaN(c.latitude) && !Number.isNaN(c.longitude));
        setHistory(coords);
      }

      setStats({
        total: Number((data.totalDistance ?? 0).toFixed(3)),
        traveled: Number((data.traveled ?? 0).toFixed(3)),
        remaining: Number((data.remaining ?? 0).toFixed(3))
      });
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [loadId]);

  useEffect(() => {
    let interval = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        return;
      }

      // send current position every 5s
      interval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("driverLocation", {
              loadId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          }
        } catch (err) {
          console.warn("Location error:", err);
        }
      }, 5000);
    })();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading route...</Text>
      </View>
    );
  }

  const initialRegion = pickup ? {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5
    } : {
      latitude: driverLocation?.latitude ?? 20.5937,
      longitude: driverLocation?.longitude ?? 78.9629,
      latitudeDelta: 5,
      longitudeDelta: 5
    };

  return (
    <View style={{ flex: 1 }}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {pickup && <Marker coordinate={pickup} title="Pickup" />}
        {dropoff && <Marker coordinate={dropoff} title="Dropoff" />}
        {driverLocation && <Marker coordinate={driverLocation} title="Driver" pinColor="blue" />}
        {history.length > 1 && (
          <Polyline coordinates={history} strokeWidth={4} />
        )}
      </MapView>

      <View style={styles.stats}>
        <Text style={styles.statText}>Total: {stats.total} km</Text>
        <Text style={styles.statText}>Traveled: {stats.traveled} km</Text>
        <Text style={styles.statText}>Remaining: {stats.remaining} km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height
  },
  stats: {
    position: "absolute",
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    elevation: 6
  },
  statText: {
    fontSize: 16,
    marginVertical: 2
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" }
});

