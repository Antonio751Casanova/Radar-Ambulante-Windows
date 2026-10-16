import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import MapView, { Circle, Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

import { calculateVendorTrip, getSnappedHotStreet } from '../utilidades/osrmTripService';

const ORDERS_ENDPOINT = 'http://192.168.0.68/api/pedidos';

const customMapStyle = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
];

const VENDOR_LOCATION = { latitude: 22.264831183629244, longitude: -97.85802628269265 };

const COLOR_ALTA = '0, 230, 118';    // Verde claro/primavera (Alta Prioridad)
const COLOR_MEDIA = '0, 191, 255';   // Azul celeste/brillante (Buena zona)
const COLOR_BAJA = '180, 100, 255';  // Morado claro/lavanda (Poca gente)

const timeScenarios: any = {
  '16:00': {
    label: '4:00 PM', description: 'Salida de escuelas y tráfico',
    zones: [
      { id: 'z1', latitude: 22.2600, longitude: -97.8650, baseRadius: 500, rgbColor: COLOR_BAJA, text: '6', type: 'Baja', hotStreet: [{ latitude: 22.2600, longitude: -97.8655 }, { latitude: 22.2600, longitude: -97.8645 }] },
      { id: 'z2', latitude: 22.2750, longitude: -97.8500, baseRadius: 650, rgbColor: COLOR_ALTA, text: '52', type: 'Alta', hotStreet: [{ latitude: 22.2760, longitude: -97.8505 }, { latitude: 22.2740, longitude: -97.8495 }] },
      { id: 'z3', latitude: 22.2450, longitude: -97.8450, baseRadius: 450, rgbColor: COLOR_MEDIA, text: '18', type: 'Media', hotStreet: [{ latitude: 22.2460, longitude: -97.8450 }, { latitude: 22.2440, longitude: -97.8450 }] },
    ],
  },
  '17:00': {
    label: '5:00 PM', description: 'Transición hacia zonas comerciales',
    zones: [
      { id: 'z1', latitude: 22.2600, longitude: -97.8650, baseRadius: 550, rgbColor: COLOR_MEDIA, text: '25', type: 'Media', hotStreet: [{ latitude: 22.2605, longitude: -97.8650 }, { latitude: 22.2595, longitude: -97.8650 }] },
      { id: 'z2', latitude: 22.2750, longitude: -97.8500, baseRadius: 500, rgbColor: COLOR_MEDIA, text: '30', type: 'Media', hotStreet: [{ latitude: 22.2750, longitude: -97.8510 }, { latitude: 22.2750, longitude: -97.8490 }] },
      { id: 'z3', latitude: 22.2450, longitude: -97.8450, baseRadius: 500, rgbColor: COLOR_ALTA, text: '42', type: 'Alta', hotStreet: [{ latitude: 22.2455, longitude: -97.8460 }, { latitude: 22.2445, longitude: -97.8440 }] },
    ],
  },
  '19:00': {
    label: '7:00 PM', description: 'Flujo hacia parques y plazas',
    zones: [
      { id: 'z1', latitude: 22.2600, longitude: -97.8650, baseRadius: 600, rgbColor: COLOR_ALTA, text: '45', type: 'Alta', hotStreet: [{ latitude: 22.2610, longitude: -97.8655 }, { latitude: 22.2590, longitude: -97.8645 }] },
      { id: 'z2', latitude: 22.2750, longitude: -97.8500, baseRadius: 400, rgbColor: COLOR_BAJA, text: '12', type: 'Baja', hotStreet: [{ latitude: 22.2755, longitude: -97.8500 }, { latitude: 22.2745, longitude: -97.8500 }] },
      { id: 'z3', latitude: 22.2450, longitude: -97.8450, baseRadius: 600, rgbColor: COLOR_ALTA, text: '55', type: 'Alta', hotStreet: [{ latitude: 22.2460, longitude: -97.8455 }, { latitude: 22.2440, longitude: -97.8445 }] },
    ],
  },
};

const INITIAL_DIRECT_ORDERS = [
  { id: 'pedido_1', name: 'Carlos M.', phone: '5218331112233', address: 'Calle Universidad de Veracruz 104', reference: 'Casa blanca con portón negro', product: '1x Trole grande', latitude: 22.2530, longitude: -97.8740 },
  { id: 'pedido_2', name: 'Ana P.', phone: '5218334445566', address: 'Circuito Universitario 502', reference: 'Edificio verde, timbre 3', product: '2x Troles', latitude: 22.2490, longitude: -97.8780 }
];

function getBearing(start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }): number {
  const lat1 = start.latitude * (Math.PI / 180);
  const lat2 = end.latitude * (Math.PI / 180);
  const lon1 = start.longitude * (Math.PI / 180);
  const lon2 = end.longitude * (Math.PI / 180);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const brng = Math.atan2(y, x);
  return ((brng * (180 / Math.PI)) + 360) % 360;
}

function detectTurns(
  path: { latitude: number; longitude: number }[],
  angleThreshold = 25,
  minGapMeters = 80,
) {
  const turns: { point: { latitude: number; longitude: number }; bearing: number; direction: 'derecha' | 'izquierda' }[] = [];
  let lastTurnPoint: { latitude: number; longitude: number } | null = null;

  function distanceMeters(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
  ): number {
    const R = 6371000;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  for (let i = 2; i < path.length - 2; i++) {
    const bearingIn = getBearing(path[i - 2], path[i]);
    const bearingOut = getBearing(path[i], path[i + 2]);
    const delta = ((bearingOut - bearingIn + 540) % 360) - 180;

    if (Math.abs(delta) > angleThreshold) {
      if (!lastTurnPoint || distanceMeters(lastTurnPoint, path[i]) > minGapMeters) {
        turns.push({
          point: path[i],
          bearing: bearingOut,
          direction: delta > 0 ? 'derecha' : 'izquierda',
        });
        lastTurnPoint = path[i];
      }
    }
  }

  return turns;
}

export default function VendorDashboardScreen() {
  const [activeTime, setActiveTime] = useState('16:00'); 
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [routeData, setRouteData] = useState<{ path: {latitude: number, longitude: number}[], eta: number } | null>(null);

  const [orders, setOrders] = useState<any[]>(INITIAL_DIRECT_ORDERS);
  const knownOrderIdsRef = useRef<Set<string>>(
    new Set(INITIAL_DIRECT_ORDERS.map((o) => o.id))
  );

  const [isMegaRouteActive, setIsMegaRouteActive] = useState(false);
  const [megaRouteData, setMegaRouteData] = useState<any>(null);
  const [isLoadingMegaRoute, setIsLoadingMegaRoute] = useState(false);
  const [snappedHotStreets, setSnappedHotStreets] = useState<any[]>([]);

  // Listener en tiempo real para nuevos pedidos desde el Backend
  useEffect(() => {
    let isMounted = true;

    const fetchActiveOrders = async () => {
      try {
        const response = await fetch(ORDERS_ENDPOINT);
        if (!response.ok) return;

        const data = await response.json();
        if (!isMounted || !Array.isArray(data.orders)) return;

        const incomingOrders = data.orders;
        let newestOrder: any = null;

        for (const order of incomingOrders) {
          if (!knownOrderIdsRef.current.has(order.id)) {
            knownOrderIdsRef.current.add(order.id);
            if (!newestOrder) {
              newestOrder = order;
            }
          }
        }

        if (incomingOrders.length > 0) {
          setOrders([...incomingOrders, ...INITIAL_DIRECT_ORDERS]);
        }

        if (newestOrder) {
          Alert.alert(
            '🛎️ ¡Nuevo Pedido en Vivo!',
            `${newestOrder.product}\n📍 ${newestOrder.address}`,
            [
              { text: 'Cerrar', style: 'cancel' },
              {
                text: 'Ver Pedido',
                onPress: () => setSelectedItem({ type: 'order', data: newestOrder }),
              },
            ]
          );
        }
      } catch (error) {
        // Silencioso en caso de parpadeo de red local
      }
    };

    void fetchActiveOrders();
    const intervalId = setInterval(fetchActiveOrders, 2500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setSelectedItem(null);
    setRouteData(null);
    setIsMegaRouteActive(false);
    setMegaRouteData(null);
  }, [activeTime]); 

  const currentScenario = timeScenarios[activeTime];

  useEffect(() => {
    let isActive = true;

    async function loadSnappedHotStreets(): Promise<void> {
      const streets = await Promise.all(
        currentScenario.zones.map((z: any) =>
          getSnappedHotStreet(z.hotStreet[0], z.hotStreet[1]),
        ),
      );

      if (isActive) {
        setSnappedHotStreets(streets);
      }
    }

    void loadSnappedHotStreets();

    return () => {
      isActive = false;
    };
  }, [activeTime]);

  const toggleMegaRoute = async () => {
    if (isMegaRouteActive) {
      setIsMegaRouteActive(false);
      setMegaRouteData(null);
      return;
    }

    setIsLoadingMegaRoute(true);
    const priorityWeight: any = { Alta: 3, Media: 2, Baja: 1 };
    const sortedZones = [...currentScenario.zones].sort((a: any, b: any) => priorityWeight[b.type] - priorityWeight[a.type]);
    const megaRouteWaypoints = sortedZones.flatMap((z: any) => z.hotStreet);
    const result = await calculateVendorTrip(VENDOR_LOCATION, megaRouteWaypoints);

    if (result && result.geometry) {
      const coords = result.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }));

      const stops = sortedZones.map((z: any, index: number) => ({
        stepNumber: index + 1,
        coords: { latitude: z.latitude, longitude: z.longitude },
      }));

      setMegaRouteData({ path: coords, stops });
      setIsMegaRouteActive(true);
    } else {
      Alert.alert('Error', 'No se pudo calcular la ruta por las calles.');
    }
    setIsLoadingMegaRoute(false);
  };

  const handleMapPress = () => {
    setSelectedItem(null);
  };

  const clearRoute = () => {
    setRouteData(null);
  };

  const openWhatsApp = (name: string, phone: string) => {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${name}, voy en camino. 🌽`)}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "No se pudo abrir WhatsApp."));
  };

  const drawStaticRoute = async (destination: any) => {
    const start = VENDOR_LOCATION;
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`);
      
      if (!response.ok) throw new Error("Servidor OSRM caído");
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1], longitude: coord[0]
        }));
        
        const durationSeconds = data.routes[0].duration;
        const etaMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

        setRouteData({ path: coords, eta: etaMinutes });
      } else {
        throw new Error("Sin ruta válida");
      }
    } catch (error) {
      setRouteData({ path: [start, destination], eta: 5 });
    }
    
    setSelectedItem(null);
  };

  const activePolylineCoords = routeData ? routeData.path : [VENDOR_LOCATION, VENDOR_LOCATION];
  const activePolylineColor = routeData ? "#007AFF" : "transparent";
  const activePolylineWidth = routeData ? 5 : 0;
  const activeMegaPath = (isMegaRouteActive && megaRouteData?.path) ? megaRouteData.path : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🔥 Radar Ambulante</Text>
      </View>

      <View style={styles.timeSelectorContainer}>
        {Object.keys(timeScenarios).map((timeKey) => {
          const isActive = activeTime === timeKey;
          return (
            <TouchableOpacity key={timeKey} style={[styles.timeButton, isActive && styles.timeButtonActive]} onPress={() => {
                setActiveTime(timeKey);
              }}>
              <Text style={[styles.timeButtonText, isActive && styles.timeButtonTextActive]}>{timeScenarios[timeKey].label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={customMapStyle}
        toolbarEnabled={false} 
        initialRegion={{ latitude: 22.2600, longitude: -97.8600, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onPress={handleMapPress}
      >
        {currentScenario.zones.map((zone: any) => (
          <React.Fragment key={`circles-${activeTime}-${zone.id}`}>
            <Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.baseRadius} fillColor={`rgba(${zone.rgbColor}, 0.20)`} strokeWidth={0} />
            <Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.baseRadius * 0.6} fillColor={`rgba(${zone.rgbColor}, 0.35)`} strokeWidth={0} />
          </React.Fragment>
        ))}

        {snappedHotStreets.map((streetLine: any, idx: number) => (
          <Polyline
            key={`hotstreet-${activeTime}-${idx}`}
            coordinates={streetLine}
            strokeColor="#00E5FF"
            strokeWidth={8}
            lineCap="round"
            style={{ opacity: 0.8 }}
          />
        ))}

        {currentScenario.zones.map((zone: any) => (
          <Marker 
            key={`marker-${activeTime}-${zone.id}`} 
            coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
            stopPropagation={true}
            onPress={() => { 
              setSelectedItem({ type: 'zone', data: zone }); 
            }}
          >
            <View style={[styles.zoneLabel, { backgroundColor: `rgb(${zone.rgbColor})` }]}>
              <Text style={styles.zoneLabelText}>{zone.text}</Text>
            </View>
          </Marker>
        ))}

        {orders.map((order) => (
          <Marker 
            key={order.id} 
            coordinate={{ latitude: order.latitude, longitude: order.longitude }} 
            pinColor="#FF9900" 
            stopPropagation={true} 
            onPress={() => { 
              setSelectedItem({ type: 'order', data: order }); 
            }} 
          />
        ))}

        <Marker coordinate={VENDOR_LOCATION} zIndex={999}>
          <View style={styles.vendorMarker}>
            <MaterialIcons name="pedal-bike" size={24} color="#ffffff" />
          </View>
        </Marker>

        {/* POLÍGONO PARA RUTA ESTÁTICA SIMPLE */}
        <Polyline 
          coordinates={activePolylineCoords} 
          strokeColor={activePolylineColor} 
          strokeWidth={activePolylineWidth} 
          lineCap="round" 
          lineJoin="round" 
        />

        <Polyline
          coordinates={isMegaRouteActive && megaRouteData?.path ? megaRouteData.path : []}
          strokeColor="rgba(255, 215, 0, 0.8)"
          strokeWidth={6}
          lineCap="round"
          lineJoin="round"
          geodesic={true}
        />

        {activeMegaPath.length > 4 && detectTurns(activeMegaPath).map((turn, index) => (
          <Marker
            key={`turn-${index}`}
            coordinate={turn.point}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={turn.bearing}
            zIndex={9998}
          >
            <View style={{
              backgroundColor: '#1976d2',
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 2.5,
              borderColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.6,
              shadowRadius: 3,
              elevation: 5,
            }}>
              <MaterialIcons name="arrow-upward" size={18} color="#ffffff" />
            </View>
          </Marker>
        ))}

        {(isMegaRouteActive && megaRouteData?.stops) ? megaRouteData.stops.map((stop: any, idx: number) => (
          <Marker
            key={`megastop-${activeTime}-${idx}`}
            coordinate={stop.coords}
            zIndex={9999}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ backgroundColor: '#FFD700', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 6 }}>
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 13 }}>🎯 Destino {stop.stepNumber}</Text>
              </View>
              <View style={{ width: 4, height: 16, backgroundColor: '#000' }} />
              <View style={{ width: 10, height: 4, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.5)', marginTop: -2 }} />
            </View>
          </Marker>
        )) : null}
      </MapView>

      <TouchableOpacity
        style={[styles.megaRouteButton, isMegaRouteActive ? styles.megaRouteActive : null]}
        onPress={toggleMegaRoute}
        disabled={isLoadingMegaRoute}
      >
        <MaterialIcons name="alt-route" size={24} color="#fff" />
        <Text style={styles.megaRouteButtonText}>
          {isLoadingMegaRoute ? 'Calculando...' : isMegaRouteActive ? 'Ocultar Mega Ruta' : 'Iniciar Mega Ruta'}
        </Text>
      </TouchableOpacity>

      {routeData && (
        <View style={styles.etaBanner}>
          <MaterialIcons name="timer" size={20} color="#0d47a1" />
          <Text style={styles.etaText}>~ {routeData.eta} min</Text>
          <TouchableOpacity onPress={clearRoute} style={styles.closeRouteButton}>
            <MaterialIcons name="close" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Flujo de Clientes</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: `rgb(${COLOR_ALTA})` }]} />
          <Text style={styles.legendText}>Prioridad (Alto flujo)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: `rgb(${COLOR_MEDIA})` }]} />
          <Text style={styles.legendText}>Buena (Flujo medio)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: `rgb(${COLOR_BAJA})` }]} />
          <Text style={styles.legendText}>Disperso (Poca gente)</Text>
        </View>
      </View>

      {selectedItem && (
        <View style={styles.bottomCard}>
          {selectedItem.type === 'order' ? (
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>👤 {selectedItem.data.name}</Text>
                <Text style={styles.productBadge}>Venta Segura</Text>
              </View>
              <Text style={styles.sectionTitle}>📍 Dirección / Referencia:</Text>
              <Text style={styles.addressText}>{selectedItem.data.address}</Text>
              <Text style={styles.sectionTitle}>🛍️ Pedido:</Text>
              <Text style={styles.productText}>{selectedItem.data.product}</Text>
              
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={() => openWhatsApp(selectedItem.data.name, selectedItem.data.phone)}>
                  <Text style={styles.actionButtonText}>💬 Avisar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.routeButton]} onPress={() => drawStaticRoute(selectedItem.data)}>
                  <Text style={styles.actionButtonText}>📍 Trazar Ruta</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>🗺️ Zona de Demanda</Text>
                <Text style={[styles.productBadge, { backgroundColor: `rgb(${selectedItem.data.rgbColor})`, color: '#fff' }]}>
                  Nivel {selectedItem.data.type}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>👥 Clientes estimados:</Text>
              <Text style={styles.addressText}>~ {selectedItem.data.text} personas en el área</Text>
              
              <View style={[styles.actionButtonsRow, { marginTop: 20 }]}>
                <TouchableOpacity style={[styles.actionButton, styles.routeButton, { flex: 1 }]} onPress={() => drawStaticRoute(selectedItem.data)}>
                  <Text style={styles.actionButtonText}>📍 Trazar Ruta hacia la Zona</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { paddingTop: 40, paddingBottom: 10, backgroundColor: '#1a1a1a', alignItems: 'center', zIndex: 1 },
  headerText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  timeSelectorContainer: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingBottom: 15, justifyContent: 'space-evenly', zIndex: 1 },
  timeButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#333' },
  timeButtonActive: { backgroundColor: '#FF9900' },
  timeButtonText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  timeButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  
  map: { flex: 1, width: '100%' },

  megaRouteButton: { position: 'absolute', bottom: 100, right: 15, backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 25, elevation: 8, borderWidth: 2, borderColor: '#FFD700' },
  megaRouteActive: { backgroundColor: '#FFD700', borderColor: '#fff' },
  megaRouteButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  megaRouteStop: { backgroundColor: '#000', padding: 5, borderRadius: 15, borderWidth: 2, borderColor: '#FFD700' },
  megaRouteStopText: { color: '#FFD700', fontWeight: 'bold' },
  
  vendorMarker: { backgroundColor: '#FF3B30', borderRadius: 25, padding: 8, borderWidth: 2, borderColor: '#ffffff', shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 5, elevation: 8, alignItems: 'center', justifyContent: 'center' },
  zoneLabel: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  zoneLabelText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  legendContainer: { position: 'absolute', top: 120, right: 15, backgroundColor: 'rgba(30, 30, 30, 0.9)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#444', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 6 },
  legendTitle: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  legendText: { color: '#eeeeee', fontSize: 11, fontWeight: '500' },

  etaBanner: { position: 'absolute', top: 120, left: 15, backgroundColor: 'rgba(227, 242, 253, 0.95)', borderRadius: 30, paddingVertical: 8, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5, zIndex: 10 },
  etaText: { marginLeft: 6, marginRight: 10, color: '#0d47a1', fontSize: 14, fontWeight: 'bold' },
  closeRouteButton: { padding: 4, backgroundColor: 'rgba(255, 59, 48, 0.1)', borderRadius: 15 },

  bottomCard: { position: 'absolute', bottom: 20, left: 15, right: 15, backgroundColor: '#ffffff', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clientName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  productBadge: { backgroundColor: '#ffe5b4', color: '#ff8c00', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, fontWeight: 'bold', fontSize: 12, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, color: '#888', marginTop: 10, textTransform: 'uppercase', fontWeight: 'bold' },
  addressText: { fontSize: 15, color: '#444', marginTop: 2 },
  productText: { fontSize: 18, fontWeight: 'bold', color: '#e63946', marginTop: 2 },
  
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  whatsappButton: { backgroundColor: '#25D366', marginRight: 10 },
  routeButton: { backgroundColor: '#007AFF' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' }
});