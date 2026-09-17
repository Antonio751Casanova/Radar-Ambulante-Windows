import { useEffect } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION: Region = {
  latitude: 22.289,
  longitude: -97.871,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
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
            const token = await SecureStore.getItemAsync('vendor_token');

            if (token) {
              const response = await fetch('http://192.168.1.137/api/vendor/location', {
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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        mapType="standard"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
  },
  map: {
    width,
    height,
  },
});