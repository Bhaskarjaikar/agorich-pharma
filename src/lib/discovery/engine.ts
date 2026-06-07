import {
  GeoPoint,
  DistributorInfo,
  ProductListing,
  DistributorProductPrice,
  PriceComparisonResult,
  InvoicePreview,
  InvoicePreviewItem,
  DiscoverySearchParams,
  DiscoveryResult
} from './types';
import { sortByFEFO, calculateEstimatedAvailable, determineStockStatus } from '@/lib/inventory/engine';
import { InventoryBatchInfo } from '@/lib/inventory/types';

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const PROPRIETARY_MARGIN_BONUS = 5;

function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export async function getDistributorsWithinRadius(
  supabase: any,
  params: DiscoverySearchParams
): Promise<DiscoveryResult> {
  const radiusKm = Math.min(params.radiusKm || DEFAULT_RADIUS_KM, MAX_RADIUS_KM);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      business_name,
      phone,
      state_code,
      pincode,
      geo_point,
      distributors:distributors(
        min_order_value,
        delivery_surcharge,
        is_active
      )
    `)
    .eq('role', 'DISTRIBUTOR')
    .eq('distributors.is_active', true);

  if (error || !profiles) {
    return { distributors: [], totalFound: 0, searchRadius: radiusKm };
  }

  let distributors: DistributorInfo[] = profiles.map((p: any) => {
    const geoPoint = p.geo_point
      ? { lat: p.geo_point.lat, lng: p.geo_point.lng }
      : undefined;

    return {
      id: p.id,
      businessName: p.business_name || 'Unknown',
      phone: p.phone || '',
      stateCode: p.state_code || '',
      pincode: p.pincode || '',
      geoPoint,
      minOrderValue: p.distributors?.min_order_value || 0,
      deliverySurcharge: p.distributors?.delivery_surcharge || 0,
      isActive: p.distributors?.is_active || false,
      stockStatus: 'OUT_OF_STOCK' as const,
      inStockCount: 0,
      lowStockCount: 0
    };
  });

  if (params.lat && params.lng) {
    const userPoint: GeoPoint = { lat: params.lat, lng: params.lng };

    distributors = distributors
      .map(d => {
        if (d.geoPoint) {
          d.distanceKm = roundToTwo(haversineDistance(userPoint, d.geoPoint));
        }
        return d;
      })
      .filter(d => !d.distanceKm || d.distanceKm <= radiusKm)
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
  }

  const { data: inventoryData } = await supabase
    .from('inventory_batches')
    .select('distributor_id, quantity_available, stock_status')
    .eq('is_active', true)
    .neq('stock_status', 'QUARANTINE');

  if (inventoryData) {
    const stockByDistributor = new Map<string, { inStock: number; low: number }>();

    for (const batch of inventoryData) {
      const existing = stockByDistributor.get(batch.distributor_id) || { inStock: 0, low: 0 };
      if (batch.stock_status === 'IN_STOCK') existing.inStock++;
      if (batch.stock_status === 'LOW') existing.low++;
      stockByDistributor.set(batch.distributor_id, existing);
    }

    distributors = distributors.map(d => {
      const stock = stockByDistributor.get(d.id);
      d.inStockCount = stock?.inStock || 0;
      d.lowStockCount = stock?.low || 0;
      d.stockStatus = d.inStockCount > 0 ? 'IN_STOCK' : d.lowStockCount > 0 ? 'LOW' : 'OUT_OF_STOCK';
      return d;
    });
  }

  if (params.sortBy === 'price') {
    distributors.sort((a, b) => {
      const comparison = a.minOrderValue - b.minOrderValue;
      return params.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return {
    distributors,
    totalFound: distributors.length,
    searchRadius: radiusKm,
    userLocation: params.lat && params.lng ? { lat: params.lat, lng: params.lng } : undefined
  };
}

export async function searchProductsByMolecule(
  supabase: any,
  searchTerm: string,
  limit: number = 50
): Promise<ProductListing[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      generic_name,
      hsn_code,
      gst_rate,
      mrp,
      is_proprietary,
      manufacturers:manufacturer_id(name)
    `)
    .or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%`)
    .eq('is_active', true)
    .limit(limit);

  if (error || !data) return [];

  return data.map((p: any) => ({
    productId: p.id,
    productName: p.name,
    genericName: p.generic_name || '',
    manufacturer: p.manufacturers?.name || '',
    hsnCode: p.hsn_code || '',
    gstRate: p.gst_rate || 12,
    mrp: p.mrp || 0,
    isProprietary: p.is_proprietary || false
  }));
}

export async function getPriceComparison(
  supabase: any,
  productId: string,
  retailerGeoPoint?: GeoPoint,
  radiusKm: number = 5
): Promise<PriceComparisonResult | null> {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      generic_name,
      hsn_code,
      gst_rate,
      mrp,
      is_proprietary,
      manufacturers:manufacturer_id(name)
    `)
    .eq('id', productId)
    .single();

  if (productError || !product) return null;

  const productListing: ProductListing = {
    productId: product.id,
    productName: product.name,
    genericName: product.generic_name || '',
    manufacturer: product.manufacturers?.name || '',
    hsnCode: product.hsn_code || '',
    gstRate: product.gst_rate || 12,
    mrp: product.mrp || 0,
    isProprietary: product.is_proprietary || false
  };

  const { data: batches, error: batchError } = await supabase
    .from('inventory_batches')
    .select(`
      id,
      batch_number,
      expiry_date,
      quantity_total,
      quantity_reserved,
      quantity_available,
      ptr,
      ptd,
      mrp,
      stock_status,
      is_proprietary,
      warehouse_location,
      distributor_id,
      products:product_id(id, name)
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .neq('stock_status', 'QUARANTINE')
    .gt('quantity_available', 0);

  if (batchError || !batches) {
    return {
      productId,
      product: productListing,
      listings: [],
      lowestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      proprietaryLowest: 0,
      marketplaceLowest: 0
    };
  }

  const { data: distributors } = await supabase
    .from('profiles')
    .select('id, business_name, geo_point, distributors(delivery_surcharge)')
    .eq('role', 'DISTRIBUTOR');

  const distributorMap = new Map<string, any>();
  distributors?.forEach(d => distributorMap.set(d.id, d));

  const listings: DistributorProductPrice[] = [];
  let proprietaryLowest = Infinity;
  let marketplaceLowest = Infinity;

  for (const batch of batches) {
    const distributor = distributorMap.get(batch.distributor_id);
    if (!distributor) continue;

    const estimatedAvailable = Math.max(0,
      Math.floor(batch.quantity_available * 0.9)
    );

    const ptr = batch.ptr || product.mrp;
    const isProprietary = batch.is_proprietary || product.is_proprietary;

    let distanceKm: number | undefined;
    if (retailerGeoPoint && distributor.geo_point) {
      distanceKm = roundToTwo(haversineDistance(
        retailerGeoPoint,
        { lat: distributor.geo_point.lat, lng: distributor.geo_point.lng }
      ));
      if (distanceKm > radiusKm) continue;
    }

    const totalPrice = ptr + (distributor.distributors?.delivery_surcharge || 0);

    listings.push({
      distributorId: batch.distributor_id,
      distributorName: distributor.business_name || 'Unknown',
      distanceKm,
      batchId: batch.id,
      batchNumber: batch.batch_number,
      expiryDate: new Date(batch.expiry_date),
      ptr,
      ptd: batch.ptd || 0,
      mrp: batch.mrp || product.mrp,
      estimatedAvailable,
      stockStatus: (batch.stock_status as any) || 'IN_STOCK',
      deliverySurcharge: distributor.distributors?.delivery_surcharge || 0,
      isProprietary,
      isRecommended: false,
      totalPrice
    });

    if (isProprietary && ptr < proprietaryLowest) proprietaryLowest = ptr;
    if (!isProprietary && ptr < marketplaceLowest) marketplaceLowest = ptr;
  }

  const recommendedProprietary = proprietaryLowest < marketplaceLowest
    ? proprietaryLowest * (1 - PROPRIETARY_MARGIN_BONUS / 100)
    : Infinity;

  listings.forEach(l => {
    if (l.isProprietary && l.ptr <= recommendedProprietary) {
      l.isRecommended = true;
    }
  });

  listings.sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
    if (a.distanceKm !== b.distanceKm && retailerGeoPoint) {
      return (a.distanceKm || 999) - (b.distanceKm || 999);
    }
    return a.ptr - b.ptr;
  });

  const prices = listings.map(l => l.ptr);
  const lowestPrice = listings.length > 0 ? Math.min(...prices) : 0;
  const highestPrice = listings.length > 0 ? Math.max(...prices) : 0;
  const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  return {
    productId,
    product: productListing,
    listings,
    lowestPrice: roundToTwo(lowestPrice),
    highestPrice: roundToTwo(highestPrice),
    averagePrice: roundToTwo(averagePrice),
    proprietaryLowest: proprietaryLowest === Infinity ? 0 : roundToTwo(proprietaryLowest),
    marketplaceLowest: marketplaceLowest === Infinity ? 0 : roundToTwo(marketplaceLowest)
  };
}

export async function generateInvoicePreview(
  supabase: any,
  retailerId: string,
  distributorId: string,
  items: Array<{ batchId: string; quantity: number }>
): Promise<InvoicePreview | null> {
  const { data: retailer } = await supabase
    .from('profiles')
    .select('id, business_name, address, city, state, pincode, gst_number')
    .eq('id', retailerId)
    .single();

  const { data: distributor } = await supabase
    .from('profiles')
    .select('id, business_name, address, city, state, pincode, gst_number, drug_license_number')
    .eq('id', distributorId)
    .single();

  if (!retailer || !distributor) return null;

  const previewItems: InvoicePreviewItem[] = [];
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  const isInterState = retailer.state_code !== distributor.state_code;

  for (const item of items) {
    const { data: batch } = await supabase
      .from('inventory_batches')
      .select(`
        batch_number,
        expiry_date,
        ptr,
        mrp,
        is_proprietary,
        products:product_id(id, name, hsn_code, gst_rate)
      `)
      .eq('id', item.batchId)
      .single();

    if (!batch) continue;

    const unitPrice = batch.ptr || 0;
    const lineTotal = unitPrice * item.quantity;
    const gstRate = batch.products?.gst_rate || 12;
    const gstAmount = roundToTwo(lineTotal * (gstRate / 100));

    subtotal += lineTotal;

    if (isInterState) {
      totalIgst += gstAmount;
    } else {
      totalCgst += gstAmount / 2;
      totalSgst += gstAmount / 2;
    }

    previewItems.push({
      productId: batch.products?.id || '',
      productName: batch.products?.name || 'Unknown',
      batchNumber: batch.batch_number,
      expiryDate: new Date(batch.expiry_date),
      quantity: item.quantity,
      mrp: batch.mrp || 0,
      unitPrice,
      lineTotal,
      gstRate,
      gstAmount,
      isProprietary: batch.is_proprietary || false
    });
  }

  const { data: distributorProfile } = await supabase
    .from('distributors')
    .select('delivery_surcharge')
    .eq('id', distributorId)
    .single();

  const deliverySurcharge = distributorProfile?.delivery_surcharge || 0;
  const totalGst = totalCgst + totalSgst + totalIgst;
  const grandTotal = roundToTwo(subtotal + totalGst + deliverySurcharge);

  return {
    fromDistributor: {
      id: distributor.id,
      businessName: distributor.business_name || 'Unknown',
      address: [distributor.address, distributor.city, distributor.state, distributor.pincode].filter(Boolean).join(', '),
      gstin: distributor.gst_number || '',
      drugLicenseNumber: distributor.drug_license_number || ''
    },
    toRetailer: {
      id: retailer.id,
      businessName: retailer.business_name || 'Unknown',
      address: [retailer.address, retailer.city, retailer.state, retailer.pincode].filter(Boolean).join(', '),
      gstin: retailer.gst_number
    },
    items: previewItems,
    subtotal: roundToTwo(subtotal),
    gstBreakup: {
      cgst: isInterState ? undefined : roundToTwo(totalCgst),
      sgst: isInterState ? undefined : roundToTwo(totalSgst),
      igst: isInterState ? roundToTwo(totalIgst) : undefined,
      totalGst: roundToTwo(totalGst)
    },
    deliverySurcharge,
    grandTotal,
    gstType: isInterState ? 'IGST' : 'CGST_SGST'
  };
}

export class AgorichDiscoveryEngine {
  static readonly DEFAULT_RADIUS_KM = DEFAULT_RADIUS_KM;
  static readonly MAX_RADIUS_KM = MAX_RADIUS_KM;
  static readonly PROPRIETARY_MARGIN_BONUS = PROPRIETARY_MARGIN_BONUS;

  static getDistributorsWithinRadius = getDistributorsWithinRadius;
  static searchProductsByMolecule = searchProductsByMolecule;
  static getPriceComparison = getPriceComparison;
  static generateInvoicePreview = generateInvoicePreview;
  static haversineDistance = haversineDistance;
}
