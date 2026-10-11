export async function calculateVendorTrip(startCoords, routePoints) {
  const allPoints = [startCoords, ...routePoints];

  try {
    const coordinatesString = allPoints.map(c => `${c.longitude},${c.latitude}`).join(';');
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?steps=true&geometries=geojson&overview=full`;

    const response = await fetch(routeUrl);
    const data = await response.json();

    if (!response.ok || data.code !== 'Ok' || !data.routes) {
      throw new Error('OSRM rechazó la petición.');
    }

    const legs = data.routes[0].legs ?? data.trips?.[0]?.legs ?? [];
    const IGNORED_MANEUVER_TYPES = ['depart', 'arrive', 'new name', 'continue', 'notification'];
    const maneuvers = legs.flatMap(leg =>
      leg.steps
        .filter(step =>
          step.maneuver?.type &&
          !IGNORED_MANEUVER_TYPES.includes(step.maneuver.type) &&
          step.maneuver.modifier !== 'straight',
        )
        .map(step => ({
          location: {
            latitude: step.maneuver.location[1],
            longitude: step.maneuver.location[0],
          },
          bearing: step.maneuver.bearing_after,
          modifier: step.maneuver.modifier,
        })),
    );

    return { geometry: data.routes[0].geometry, maneuvers };
  } catch (error) {
    console.warn('⚠️ OSRM Caído. Usando fallback de líneas rectas.');
    return {
      geometry: {
        type: 'LineString',
        coordinates: allPoints.map(p => [p.longitude, p.latitude]),
      },
      maneuvers: [],
    };
  }
}

export async function getSnappedHotStreet(startCoord, endCoord) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoord.longitude},${startCoord.latitude};${endCoord.longitude},${endCoord.latitude}?geometries=geojson&overview=full`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
        latitude: lat,
        longitude: lon,
      }));
    }

    return [startCoord, endCoord];
  } catch {
    return [startCoord, endCoord];
  }
}
