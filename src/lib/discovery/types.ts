export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DistributorInfo {
  id: string;
  businessName: string;
  phone: string;
  stateCode: string;
  pincode: string;
  geoPoint?: GeoPoint;
  distanceKm?: number;
  minOrderValue: number;
  deliverySurcharge: number;
  isActive: boolean;
  stockStatus: 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK';
  inStockCount: number;
  lowStockCount: number;
}

export interface ProductListing {
  productId: string;
  productName: string;
  genericName: string;
  manufacturer: string;
  hsnCode: string;
  gstRate: number;
  mrp: number;
  isProprietary: boolean;
}

export interface DistributorProductPrice {
  distributorId: string;
  distributorName: string;
  distanceKm?: number;
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  ptr: number;
  ptd: number;
  mrp: number;
  estimatedAvailable: number;
  stockStatus: 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK';
  deliverySurcharge: number;
  isProprietary: boolean;
  isRecommended: boolean;
  totalPrice: number;
}

export interface PriceComparisonResult {
  productId: string;
  product: ProductListing;
  listings: DistributorProductPrice[];
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  proprietaryLowest: number;
  marketplaceLowest: number;
}

export interface InvoicePreview {
  fromDistributor: {
    id: string;
    businessName: string;
    address: string;
    gstin: string;
    drugLicenseNumber: string;
  };
  toRetailer: {
    id: string;
    businessName: string;
    address: string;
    gstin?: string;
  };
  items: InvoicePreviewItem[];
  subtotal: number;
  gstBreakup: {
    cgst?: number;
    sgst?: number;
    igst?: number;
    totalGst: number;
  };
  deliverySurcharge: number;
  grandTotal: number;
  gstType: 'CGST_SGST' | 'IGST';
}

export interface InvoicePreviewItem {
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  mrp: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
  isProprietary: boolean;
}

export interface DiscoverySearchParams {
  lat?: number;
  lng?: number;
  pincode?: string;
  radiusKm?: number;
  sortBy?: 'distance' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface DiscoveryResult {
  distributors: DistributorInfo[];
  totalFound: number;
  searchRadius: number;
  userLocation?: GeoPoint;
}
