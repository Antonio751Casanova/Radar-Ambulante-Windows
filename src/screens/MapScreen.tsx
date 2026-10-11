import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';
import { calculateVendorTrip } from '../utilidades/osrmTripService';

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION: Region = {
  latitude: 22.289,
  longitude: -97.871,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const mockZones = [
  { latitude: 22.3959, longitude: -97.9346 },
  { latitude: 22.3970, longitude: -97.9360 },
  { latitude: 22.3985, longitude: -97.9330 },
];

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RouteGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export default function MapScreen() {
  const [startCoords, setStartCoords] = useState<Coordinate>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [zones, setZones] = useState<Coordinate[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startLocationWatcher(): Promise<void> {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 5,
        },
        async (location) => {
          try {
            console.log(
              '📍 Coordenadas capturadas:',
              location.coords.latitude,
              location.coords.longitude,
            );

            const { latitude, longitude } = location.coords;
            setStartCoords({ latitude, longitude });
            const token = await SecureStore.getItemAsync('vendor_token');

            if (token) {
              const response = await fetch('http://192.168.1.135/api/vendor/location', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  lat: location.coords.latitude,
                  lng: location.coords.longitude,
                }),
              });

              console.log('📡 Respuesta del servidor:', response.status);

              if (!response.ok) {
                const err = await response.text();
                console.log('❌ Error del backend:', err);
              }
            }
          } catch (error) {
            console.log('🚨 Error general:', error);
          }
        },
      );
    }

    void startLocationWatcher();

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (zones.length === 0) {
      setRouteGeometry(null);
      return;
    }

    let isActive = true;

    async function updateVendorTrip(): Promise<void> {
      const result = await calculateVendorTrip(startCoords, zones);

      if (isActive && result?.geometry) {
        setRouteGeometry(result.geometry as RouteGeometry);
      }
    }

    void updateVendorTrip();

    return () => {
      isActive = false;
    };
  }, [zones, startCoords]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        mapType="standard"
      >
        {routeGeometry && (
          <Polyline
            coordinates={routeGeometry.coordinates.map(([longitude, latitude]) => ({
              latitude,
              longitude,
            }))}
            strokeColor="#1976d2"
            strokeWidth={4}
          />
        )}
      </MapView>
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => {
          if (testIndex < mockZones.length) {
            setZones((prev) => [...prev, mockZones[testIndex]]);
            setTestIndex((prev) => prev + 1);
          }
        }}
      >
        <Text style={styles.testButtonText}>Agregar Zona</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  map: {
    width,
    height,
  },
  testButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'blue',
    padding: 15,
    borderRadius: 10,
    zIndex: 10,
    elevation: 5,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});