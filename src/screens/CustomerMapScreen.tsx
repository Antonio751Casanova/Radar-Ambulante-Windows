import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import type { LatLng, Region } from 'react-native-maps';

import CategoryFilters, {
  CategoryFilter,
} from '../components/CategoryFilters';
import MapSearchBar from '../components/MapSearchBar';
import VendorBottomSheet from '../components/VendorBottomSheet';
import { DEFAULT_MAP_REGION, MOCK_VENDORS } from '../data/mockVendors';
import type { Vendor, VendorCoordinate } from '../types/vendor';

const ORDER_ENDPOINT = 'http://192.168.0.68/api/pedidos';

const initialCoordinates = MOCK_VENDORS.reduce<Record<string, VendorCoordinate>>(
  (coordinates, vendor) => {
    coordinates[vendor.id] = vendor.coordinate;
    return coordinates;
  },
  {},
);

function interpolateSegment(
  start: VendorCoordinate,
  end: VendorCoordinate,
  steps: number,
): VendorCoordinate[] {
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;

    return {
      latitude: start.latitude + (end.latitude - start.latitude) * progress,
      longitude: start.longitude + (end.longitude - start.longitude) * progress,
    };
  });
}

function createDynamicRoute(
  start: VendorCoordinate,
  destination: VendorCoordinate,
): VendorCoordinate[] {
  const longitudeDirection = destination.longitude >= start.longitude ? 1 : -1;
  const latitudeDirection = destination.latitude >= start.latitude ? 1 : -1;
  const longitudeOffset = 0.0012 * longitudeDirection;
  const latitudeOffset = 0.0008 * latitudeDirection;
  const waypoints: VendorCoordinate[] = [
    start,
    {
      latitude:
        start.latitude + (destination.latitude - start.latitude) * 0.3,
      longitude:
        start.longitude + (destination.longitude - start.longitude) * 0.3 +
        longitudeOffset,
    },
    {
      latitude:
        start.latitude + (destination.latitude - start.latitude) * 0.65 +
        latitudeOffset,
      longitude:
        start.longitude + (destination.longitude - start.longitude) * 0.65,
    },
    destination,
  ];

  return waypoints.slice(1).reduce<VendorCoordinate[]>(
    (route, waypoint, index) => [
      ...route,
      ...interpolateSegment(waypoints[index], waypoint, 6),
    ],
    [start],
  );
}

function createEmergencyRoute(
  start: VendorCoordinate,
  destination: VendorCoordinate,
): VendorCoordinate[] {
  return Array.from({ length: 5 }, (_, index) => {
    const progress = index / 4;

    return {
      latitude:
        start.latitude + (destination.latitude - start.latitude) * progress,
      longitude:
        start.longitude + (destination.longitude - start.longitude) * progress,
    };
  });
}

function haversineDistanceInMeters(
  first: VendorCoordinate,
  second: VendorCoordinate,
): number {
  const earthRadiusInMeters = 6371000;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const haversineValue =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 * earthRadiusInMeters * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  );
}

interface OsrmRouteResponse {
  routes?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
}

async function fetchOsrmRoute(
  start: VendorCoordinate,
  destination: VendorCoordinate,
): Promise<VendorCoordinate[]> {
  const endpoint = [
    `https://router.project-osrm.org/route/v1/driving/`,
    `${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}`,
    '?overview=full&geometries=geojson',
  ].join('');
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('OSRM excedió el tiempo máximo de 1 segundo'));
      }, 1000);
    });
    const response = await Promise.race([
      fetch(endpoint, { signal: controller.signal }),
      timeoutPromise,
    ]);

    if (!response.ok) {
      throw new Error(`OSRM respondió con estado ${response.status}`);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    const coordsGeoJSON = data.routes?.[0]?.geometry?.coordinates;

    if (!coordsGeoJSON || coordsGeoJSON.length < 2) {
      throw new Error('OSRM no devolvió una geometría válida');
    }

    const routeCoords = coordsGeoJSON.map((coord: [number, number]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    return routeCoords;
  } catch (error) {
    console.warn('OSRM falló; se usará la ruta de emergencia.', error);
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export default function CustomerMapScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('Todos');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeVendor, setActiveVendor] = useState<{
    id: string;
    coordinate: LatLng;
    path: LatLng[];
  } | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [userReference, setUserReference] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<VendorCoordinate>({
    latitude: DEFAULT_MAP_REGION.latitude,
    longitude: DEFAULT_MAP_REGION.longitude,
  });
  const [locationMode, setLocationMode] = useState<'exact' | 'zone' | null>(null);
  const [currentCoordinates, setCurrentCoordinates] =
    useState<Record<string, VendorCoordinate>>(initialCoordinates);
  const [trailCoordinates, setTrailCoordinates] = useState<
    Record<string, VendorCoordinate[]>
  >({});
  const [requestedDemandCoordinate, setRequestedDemandCoordinate] =
    useState<VendorCoordinate | null>(null);
  const animationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const mapRef = useRef<MapView | null>(null);
  const movementRequestId = useRef(0);
  const activeRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
        animationInterval.current = null;
      }
      activeRequestController.current?.abort();
    };
  }, []);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visibleVendors = MOCK_VENDORS.filter((vendor) => {
    const matchesCategory =
      selectedCategory === 'Todos' || vendor.category === selectedCategory;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      vendor.name.toLocaleLowerCase().includes(normalizedSearch) ||
      vendor.category.toLocaleLowerCase().includes(normalizedSearch) ||
      vendor.address.toLocaleLowerCase().includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  function handleVendorPress(vendor: Vendor): void {
    setSelectedVendor(vendor);
  }

  async function requestCustomerLocation(): Promise<{
    coordinate: VendorCoordinate;
    mode: 'exact' | 'zone';
  } | null> {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Ubicación necesaria',
          'Activa el permiso de ubicación para calcular la entrega.',
        );
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (locationMode) {
        setCustomerLocation(coordinate);
        setRequestedDemandCoordinate(coordinate);
        return { coordinate, mode: locationMode };
      }

      return new Promise((resolve) => {
        const selectMode = (mode: 'exact' | 'zone'): void => {
          setLocationMode(mode);
          setCustomerLocation(coordinate);
          setRequestedDemandCoordinate(coordinate);
          resolve({ coordinate, mode });
        };

        Alert.alert(
          '¿Cómo compartimos tu ubicación?',
          'Elige el nivel de precisión para este pedido.',
          [
            {
              text: 'Solo mi Zona',
              onPress: () => selectMode('zone'),
            },
            {
              text: 'Ubicación Precisa',
              onPress: () => selectMode('exact'),
            },
          ],
        );
      });
    } catch (error) {
      console.warn('No se pudo obtener la ubicación del cliente.', error);
      Alert.alert(
        'No se pudo obtener la ubicación',
        'Puedes intentarlo nuevamente antes de confirmar el pedido.',
      );
      return null;
    }
  }

  async function handleVendorRequest(mode: 'pickup' | 'delivery'): Promise<void> {
    const vendor = selectedVendor;

    if (!vendor) {
      return;
    }

    let orderLocation = customerLocation;
    let orderLocationMode = locationMode;

    if (!orderLocationMode) {
      const locationResult = await requestCustomerLocation();
      if (!locationResult) {
        return;
      }

      orderLocation = locationResult.coordinate;
      orderLocationMode = locationResult.mode;
    }

    await sendOrderToBackend(mode, orderLocation, orderLocationMode);
  }

  function resetRequestState(): void {
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }

    activeRequestController.current?.abort();
    activeRequestController.current = null;
    movementRequestId.current += 1;
    setActiveVendor(null);
    setEtaMinutes(null);
    setHasArrived(false);
    setArrivalMessage(null);
    setRequestedDemandCoordinate(null);
    setSelectedVendor(null);
    setCurrentCoordinates(initialCoordinates);
    setTrailCoordinates({});
  }

  async function startStreetAnimation(
    vendorId: string,
    start: LatLng,
    end: LatLng,
  ): Promise<void> {
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }

    setHasArrived(false);
    setArrivalMessage(null);
    setEtaMinutes(null);
    setActiveVendor({ id: vendorId, coordinate: start, path: [start] });

    const requestId = ++movementRequestId.current;
    const requestController = new AbortController();
    activeRequestController.current = requestController;
    let routeCoords: LatLng[] = [];

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
        { signal: requestController.signal },
      );
      const data = (await response.json()) as {
        routes?: Array<{
          duration?: number;
          geometry?: {
            coordinates?: number[][];
          };
        }>;
      };

      if (data.routes && data.routes.length > 0) {
        const durationInSeconds = data.routes[0].duration;
        if (typeof durationInSeconds === 'number') {
          setEtaMinutes(Math.max(1, Math.ceil(durationInSeconds / 60)));
        }

        routeCoords = (data.routes[0].geometry?.coordinates ?? []).map(
          (coordinate) => ({
            latitude: coordinate[1],
            longitude: coordinate[0],
          }),
        );
      }
    } catch (error) {
      if (requestController.signal.aborted) {
        return;
      }
      console.warn('OSRM falló, usando fallback de línea recta.', error);
    }

    if (
      requestId !== movementRequestId.current ||
      requestController.signal.aborted
    ) {
      return;
    }

    if (routeCoords.length === 0) {
      setEtaMinutes(3);
      const steps = 20;
      for (let index = 0; index <= steps; index += 1) {
        routeCoords.push({
          latitude:
            start.latitude + ((end.latitude - start.latitude) / steps) * index,
          longitude:
            start.longitude +
            ((end.longitude - start.longitude) / steps) * index,
        });
      }
    }

    let currentStep = 0;
    let intervalId: ReturnType<typeof setInterval>;

    intervalId = setInterval(() => {
      currentStep += 1;

      if (currentStep >= routeCoords.length) {
        clearInterval(intervalId);
        animationInterval.current = null;
        setHasArrived(true);
        return;
      }

      const nextCoord = routeCoords[currentStep];
      setActiveVendor((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          coordinate: nextCoord,
          path: [...previous.path, nextCoord],
        };
      });
    }, 100);

    animationInterval.current = intervalId;
  }

  function handleCancelOrder(): void {
    resetRequestState();
  }

  async function sendOrderToBackend(
    deliveryMode: 'pickup' | 'delivery',
    orderLocation: VendorCoordinate,
    orderLocationMode: 'exact' | 'zone',
  ): Promise<void> {
    const vendor = selectedVendor;

    if (!vendor || isSubmittingOrder) {
      return;
    }

    const items = vendor.menu;
    const order = {
      vendorId: vendor.id,
      items,
      userLocation: orderLocation,
      userReference,
      locationMode: orderLocationMode,
    };

    setIsSubmittingOrder(true);

    try {
      const response = await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.status !== 200) {
        throw new Error(`El backend respondió con estado ${response.status}`);
      }

      if (animationInterval.current) {
        clearInterval(animationInterval.current);
        animationInterval.current = null;
      }
      activeRequestController.current?.abort();
      activeRequestController.current = null;
      movementRequestId.current += 1;
      setActiveVendor(null);
      setEtaMinutes(null);
      setHasArrived(false);
      setArrivalMessage(null);
      setSelectedVendor(null);
      setUserReference('');

      Alert.alert(
        '¡Pedido Enviado!',
        'El vendedor ha sido notificado por WhatsApp.',
      );

      if (vendor.type === 'fixed' && deliveryMode === 'pickup') {
        setArrivalMessage(
          'Pedido recibido en puesto fijo, listo para recoger o enviar.',
        );
        setHasArrived(true);
      } else {
        void startStreetAnimation(
          vendor.id,
          vendor.coordinate,
          orderLocation,
        );
      }
    } catch (error) {
      console.warn('No se pudo enviar el pedido al backend.', error);
      Alert.alert(
        'No se pudo enviar el pedido',
        'Revisa la conexión con el servidor e inténtalo nuevamente.',
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  async function handleRequestCraving(): Promise<void> {
    const locationResult = await requestCustomerLocation();
    if (!locationResult) {
      return;
    }

    setRequestedDemandCoordinate(locationResult.coordinate);
  }

  function handleSuggestionSelect(vendor: Vendor): void {
    setSearchQuery(vendor.name);
    setSelectedVendor(vendor);
    mapRef.current?.animateToRegion(
      {
        ...vendor.coordinate,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      500,
    );
  }

  const searchSuggestions = normalizedSearch.length > 0
    ? visibleVendors.slice(0, 5)
    : [];

  const selectedVendorForSheet = selectedVendor
    ? {
        ...selectedVendor,
        coordinate:
          currentCoordinates[selectedVendor.id] ?? selectedVendor.coordinate,
      }
    : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_MAP_REGION}
        mapType="standard"
        toolbarEnabled={false}
        customMapStyle={[
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }],
          },
        ]}
        onRegionChangeComplete={(region) => {
          setMapRegion(region);
        }}
      >
        {locationMode && requestedDemandCoordinate ? (
          <>
            <Circle
              center={requestedDemandCoordinate}
              radius={locationMode === 'zone' ? 150 : 0}
              fillColor="rgba(14, 165, 233, 0.25)"
              strokeColor="rgba(2, 132, 199, 0.9)"
              strokeWidth={3}
            />
            {locationMode === 'exact' ? (
              <Marker
                coordinate={requestedDemandCoordinate}
                pinColor="#0284C7"
                title="Tu ubicación de solicitud"
                description="Punto de entrega seleccionado"
              />
            ) : null}
          </>
        ) : null}
        {Object.entries(trailCoordinates).map(([vendorId, coordinates]) =>
          coordinates.length > 1 ? (
            <Polyline
              key={`trail-${vendorId}`}
              coordinates={coordinates}
              strokeColor="#0EA5E9"
              strokeWidth={4}
              lineJoin="round"
            />
          ) : null,
        )}
        {activeVendor ? (
          <Polyline
            coordinates={activeVendor.path}
            lineCap="round"
            strokeColor="#007AFF"
            strokeWidth={5}
          />
        ) : null}
        {visibleVendors.map((vendor) => (
          <Marker
            key={vendor.id}
            coordinate={
              activeVendor?.id === vendor.id
                ? activeVendor.coordinate
                : vendor.coordinate
            }
            onPress={() => handleVendorPress(vendor)}
          >
            <View style={styles.vendorMarker}>
              <MaterialIcons
                name={vendor.type === 'fixed' ? 'storefront' : 'pedal-bike'}
                size={24}
                color={vendor.type === 'fixed' ? '#F59E0B' : '#E53935'}
              />
            </View>
          </Marker>
        ))}
      </MapView>
      <MapSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        suggestions={searchSuggestions}
        onSelectSuggestion={handleSuggestionSelect}
      />
      {activeVendor && !hasArrived ? (
        <View pointerEvents="none" style={styles.etaBadge}>
          <Text style={styles.etaText}>
            {etaMinutes === null
              ? '⏱️ Calculando llegada...'
              : `⏱️ El vendedor llega en aprox. ~${etaMinutes} min`}
          </Text>
        </View>
      ) : null}
      {hasArrived ? (
        <View style={styles.arrivalBanner}>
          <Text style={styles.arrivalText}>
            {arrivalMessage ??
              (selectedVendor?.type === 'fixed'
                ? '📍 Pedido recibido en puesto fijo, listo para recoger o enviar.'
                : '🎉 ¡El vendedor ha llegado a tu ubicación!')}
          </Text>
        </View>
      ) : null}
      <CategoryFilters
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
      {activeVendor && !hasArrived ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleCancelOrder}
          style={[styles.cancelButton, { bottom: insets.bottom + 20 }]}
        >
          <Text style={styles.cancelButtonText}>Cancelar pedido</Text>
        </Pressable>
      ) : null}
      <View
        style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleRequestCraving}
          style={styles.fab}
        >
          <Text style={styles.fabText}>Pedir Antojo Aquí</Text>
        </Pressable>
      </View>
      {visibleVendors.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyState}>
          <Text style={styles.emptyText}>No encontramos vendedores aquí</Text>
        </View>
      ) : null}
      <VendorBottomSheet
        visible={selectedVendor !== null}
        vendor={selectedVendorForSheet}
        onClose={() => setSelectedVendor(null)}
        onRequest={handleVendorRequest}
        userReference={userReference}
        onChangeUserReference={setUserReference}
        isSubmitting={isSubmittingOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  vendorMarker: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  etaBadge: {
    position: 'absolute',
    top: 132,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 42, 67, 0.92)',
    zIndex: 14,
    elevation: 14,
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  arrivalBanner: {
    position: 'absolute',
    top: 132,
    left: 20,
    right: 20,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#15803D',
    zIndex: 14,
    elevation: 14,
  },
  arrivalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancelButton: {
    position: 'absolute',
    left: 20,
    bottom: 28,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 23,
    backgroundColor: '#B91C1C',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 16,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    position: 'absolute',
    top: '48%',
    left: 24,
    right: 24,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    zIndex: 5,
    elevation: 5,
  },
  emptyText: {
    color: '#243B53',
    fontSize: 15,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    zIndex: 15,
    elevation: 15,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#0F766E',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  requestTypePanel: {
    width: 290,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 10,
  },
  requestTypeTitle: {
    marginBottom: 10,
    color: '#102A43',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  requestOption: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  zoneOption: {
    backgroundColor: '#0F766E',
  },
  requestOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  movingBadge: {
    position: 'absolute',
    top: 154,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 118, 110, 0.94)',
    zIndex: 11,
    elevation: 11,
  },
  movingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  centerPicker: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -34 }],
    zIndex: 12,
    elevation: 12,
  },
  centerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#0284C7',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  centerPinLabel: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 42, 67, 0.88)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});