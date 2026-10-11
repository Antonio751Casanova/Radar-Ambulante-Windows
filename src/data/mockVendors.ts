import { Region } from 'react-native-maps';

import type { Vendor } from '../types/vendor';

export const DEFAULT_MAP_REGION: Region = {
  latitude: 22.25,
  longitude: -97.85,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export const MOCK_VENDORS: Vendor[] = [
  {
    id: 'troles-el-primo',
    name: 'Troles El Primo',
    type: 'mobile',
    category: 'Snacks',
    description: 'Troles preparados con elote, queso, chile y toppings.',
    menu: [
      { name: 'Trole Gigante', price: '$50' },
      { name: 'Esquites con tuétano', price: '$45' },
    ],
    coordinate: {
      latitude: 22.2492,
      longitude: -97.8542,
    },
    address: 'Avenida Hidalgo, Tampico',
    schedule: '16:00 - 23:00',
    isOpen: true,
    isMoving: true,
    route: [
      { latitude: 22.2492, longitude: -97.8542 },
      { latitude: 22.2494, longitude: -97.854 },
      { latitude: 22.2497, longitude: -97.8538 },
      { latitude: 22.25, longitude: -97.8536 },
      { latitude: 22.2503, longitude: -97.8534 },
      { latitude: 22.2506, longitude: -97.8532 },
      { latitude: 22.2509, longitude: -97.853 },
      { latitude: 22.2512, longitude: -97.8528 },
      { latitude: 22.2515, longitude: -97.8526 },
      { latitude: 22.2518, longitude: -97.8524 },
      { latitude: 22.252, longitude: -97.8522 },
      { latitude: 22.2518, longitude: -97.852 },
      { latitude: 22.2515, longitude: -97.8518 },
      { latitude: 22.2512, longitude: -97.8516 },
      { latitude: 22.2509, longitude: -97.8514 },
      { latitude: 22.2506, longitude: -97.8512 },
      { latitude: 22.2504, longitude: -97.851 },
      { latitude: 22.2502, longitude: -97.8508 },
      { latitude: 22.2501, longitude: -97.8505 },
      { latitude: 22.25, longitude: -97.85 },
    ],
  },
  {
    id: 'raspados-yeti',
    name: 'Raspados Yeti',
    type: 'fixed',
    category: 'Bebidas',
    description: 'Raspados artesanales con sabores frutales y chamoy.',
    menu: [
      { name: 'Raspado de fruta natural', price: '$35' },
      { name: 'Chamoyada Yeti', price: '$45' },
    ],
    coordinate: {
      latitude: 22.2554,
      longitude: -97.8518,
    },
    address: 'Zona centro, Tampico',
    schedule: '12:00 - 20:00',
    isOpen: true,
  },
  {
    id: 'elotes-la-purisima',
    name: 'Elotes La Purísima',
    type: 'fixed',
    category: 'Snacks',
    description: 'Elotes y esquites preparados con queso, chile y limón.',
    menu: [
      { name: 'Elote preparado', price: '$35' },
      { name: 'Esquites con queso', price: '$40' },
    ],
    coordinate: {
      latitude: 22.2508,
      longitude: -97.8359,
    },
    address: 'Zona centro, Ciudad Madero',
    schedule: '17:00 - 22:00',
    isOpen: true,
  },
  {
    id: 'trole-locos-don-beto',
    name: 'Trole-Locos Don Beto',
    type: 'mobile',
    category: 'Snacks',
    description: 'Troles con queso, crema, chile y chamoy al gusto.',
    menu: [
      { name: 'Trole-Loco especial', price: '$45' },
      { name: 'Chamoyada de mango', price: '$40' },
    ],
    coordinate: {
      latitude: 22.2428,
      longitude: -97.8475,
    },
    address: 'Avenida Álvaro Obregón, Ciudad Madero',
    schedule: '16:00 - 23:00',
    isOpen: true,
  },
  {
    id: 'raspados-miramar',
    name: 'Raspados Miramar',
    type: 'fixed',
    category: 'Bebidas',
    description: 'Raspados de sabores, chamoyadas y jarabes frutales.',
    menu: [
      { name: 'Raspado grande', price: '$40' },
      { name: 'Chamoyada de tamarindo', price: '$45' },
    ],
    coordinate: {
      latitude: 22.2726,
      longitude: -97.8164,
    },
    address: 'Acceso a Playa Miramar, Ciudad Madero',
    schedule: '12:00 - 20:00',
    isOpen: true,
  },
  {
    id: 'esquites-el-malecon',
    name: 'Esquites El Malecón',
    type: 'mobile',
    category: 'Snacks',
    description: 'Esquites calientes con queso, crema, chile y limón.',
    menu: [
      { name: 'Esquite tradicional', price: '$35' },
      { name: 'Esquite con tuétano', price: '$50' },
    ],
    coordinate: {
      latitude: 22.2168,
      longitude: -97.8667,
    },
    address: 'Malecón de Playa Miramar, Ciudad Madero',
    schedule: '17:00 - 23:00',
    isOpen: true,
  },
];