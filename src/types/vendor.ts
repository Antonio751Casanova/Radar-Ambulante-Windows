export type VendorCategory = 'Snacks' | 'Bebidas';
export type VendorType = 'mobile' | 'fixed';

export interface VendorCoordinate {
  latitude: number;
  longitude: number;
}

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  category: VendorCategory;
  description: string;
  coordinate: VendorCoordinate;
  address: string;
  schedule: string;
  isOpen: boolean;
  menu: Array<{
    name: string;
    price: string;
  }>;
  route?: VendorCoordinate[];
  isMoving?: boolean;
}