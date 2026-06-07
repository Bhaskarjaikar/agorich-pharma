import { createClient } from '@supabase/supabase-js';
import { generateInvoiceNumber } from '@/lib/invoice-sequence';
import { reserveStock, deductStock } from '@/lib/inventory/engine';
import {
  CreateOrderInput,
  OrderCreatedResult,
  OrderItemDetail,
  InvoiceData,
  InvoiceLineItem,
  OrderStatusType,
  isValidStatusTransition
} from './types';

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createOrder(
  supabase: any,
  input: CreateOrderInput
): Promise<OrderCreatedResult> {
  const errorId = generateErrorId();

  try {
    const { retailerId, distributorId, items } = input;

    if (!items || items.length === 0) {
      return { success: false, subtotal: 0, totalGst: 0, grandTotal: 0, error: 'No items provided', errorCode: 'NO_ITEMS' };
    }

    const { data: retailer } = await supabase
      .from('profiles')
      .select('id, business_name, address, city, state, pincode, gst_number, state_code')
      .eq('id', retailerId)
      .single();

    if (!retailer) {
      return { success: false, subtotal: 0, totalGst: 0, grandTotal: 0, error: 'Retailer not found', errorCode: 'RETAILER_NOT_FOUND' };
    }

    const { data: distributor } = await supabase
      .from('profiles')
      .select('id, business_name, address, city, state, pincode, gst_number, drug_license_number, state_code')
      .eq('id', distributorId)
      .single();

    if (!distributor) {
      return { success: false, subtotal: 0, totalGst: 0, grandTotal: 0, error: 'Distributor not found', errorCode: 'DISTRIBUTOR_NOT_FOUND' };
    }

    const orderItems: OrderItemDetail[] = [];
    let subtotal = 0;
    let totalGst = 0;
    let hasProprietary = false;
    let hasMarketplace = false;

    for (const item of items) {
      const { data: batch } = await supabase
        .from('inventory_batches')
        .select(`
          id,
          batch_number,
          expiry_date,
          ptr,
          ptd,
          mrp,
          is_proprietary,
          quantity_available,
          products:product_id(id, name, hsn_code, gst_rate)
        `)
        .eq('id', item.batchId)
        .single();

      if (!batch) {
        console.error(JSON.stringify({ errorId, context: 'batch_not_found', batchId: item.batchId }));
        continue;
      }

      if (batch.quantity_available < item.quantity) {
        return {
          success: false,
          subtotal: 0,
          totalGst: 0,
          grandTotal: 0,
          error: `Insufficient stock for ${batch.products?.name || 'product'}. Available: ${batch.quantity_available}`,
          errorCode: 'INSUFFICIENT_STOCK'
        };
      }

      const ptr = Number(batch.ptr) || 0;
      const lineTotal = roundToTwo(ptr * item.quantity);
      const gstRate = Number(batch.products?.gst_rate) || 12;
      const gstAmount = roundToTwo(lineTotal * (gstRate / 100));

      if (batch.is_proprietary) hasProprietary = true;
      else hasMarketplace = true;

      orderItems.push({
        batchId: batch.id,
        productId: batch.products?.id,
        productName: batch.products?.name || 'Unknown',
        batchNumber: batch.batch_number,
        expiryDate: new Date(batch.expiry_date),
        quantity: item.quantity,
        ptr,
        ptd: Number(batch.ptd) || 0,
        mrp: Number(batch.mrp) || 0,
        isProprietary: batch.is_proprietary || false,
        lineTotal,
        gstRate,
        gstAmount
      });

      subtotal += lineTotal;
      totalGst += gstAmount;
    }

    subtotal = roundToTwo(subtotal);
    totalGst = roundToTwo(totalGst);
    const grandTotal = roundToTwo(subtotal + totalGst);

    const isInterState = retailer.state_code !== distributor.state_code;
    const gstType = isInterState ? 'IGST' : 'CGST_SGST';

    const { data: distributorSettings } = await supabase
      .from('distributors')
      .select('delivery_surcharge')
      .eq('id', distributorId)
      .single();

    const deliverySurcharge = Number(distributorSettings?.delivery_surcharge) || 0;
    const finalGrandTotal = roundToTwo(grandTotal + deliverySurcharge);

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('retailer_id', retailerId)
      .eq('distributor_id', distributorId)
      .eq('order_status', 'DRAFT')
      .single();

    if (existingOrder) {
      await supabase
        .from('orders')
        .update({
          items: orderItems,
          subtotal_paise: Math.round(subtotal * 100),
          total_tax_paise: Math.round(totalGst * 100),
          grand_total_paise: Math.round(finalGrandTotal * 100),
          marketplace_amount_paise: hasMarketplace ? Math.round(subtotal * 100) : 0,
          proprietary_amount_paise: hasProprietary ? Math.round(orderItems.filter(i => i.isProprietary).reduce((s, i) => s + i.lineTotal, 0) * 100) : 0,
          delivery_surcharge: deliverySurcharge,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id);

      return {
        success: true,
        orderId: existingOrder.id,
        items: orderItems,
        subtotal,
        totalGst,
        grandTotal: finalGrandTotal
      };
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        retailer_id: retailerId,
        distributor_id: distributorId,
        order_status: 'DRAFT',
        payment_status: 'PENDING',
        items: orderItems,
        subtotal_paise: Math.round(subtotal * 100),
        total_tax_paise: Math.round(totalGst * 100),
        grand_total_paise: Math.round(finalGrandTotal * 100),
        marketplace_amount_paise: hasMarketplace ? Math.round(subtotal * 100) : 0,
        proprietary_amount_paise: hasProprietary ? Math.round(orderItems.filter(i => i.isProprietary).reduce((s, i) => s + i.lineTotal, 0) * 100) : 0,
        delivery_surcharge: deliverySurcharge,
        gst_type: gstType
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error(JSON.stringify({ errorId, context: 'order_creation_failed', error: orderError }));
      return { success: false, subtotal: 0, totalGst: 0, grandTotal: 0, error: 'Failed to create order', errorCode: 'ORDER_CREATION_FAILED' };
    }

    await writeStatusAuditLog(supabase, {
      entityType: 'ORDER',
      entityId: newOrder.id,
      fromStatus: null,
      toStatus: 'DRAFT',
      performedBy: retailerId,
      metadata: { orderNumber }
    });

    return {
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      items: orderItems,
      subtotal,
      totalGst,
      grandTotal: finalGrandTotal
    };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'create_order_exception', error: String(err) }));
    return { success: false, subtotal: 0, totalGst: 0, grandTotal: 0, error: String(err), errorCode: 'EXCEPTION' };
  }
}

export async function confirmOrder(
  supabase: any,
  orderId: string,
  confirmedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { data: order } = await supabase
    .from('orders')
    .select('order_status, retailer_id, distributor_id, items')
    .eq('id', orderId)
    .single();

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  if (!isValidStatusTransition(order.order_status as OrderStatusType, 'CONFIRMED')) {
    return { success: false, error: `Cannot confirm order from status ${order.order_status}` };
  }

  for (const item of order.items || []) {
    const reserveResult = await reserveStock(supabase, {
      batchId: item.batchId,
      productId: item.productId,
      orderId,
      quantity: item.quantity,
      reservedBy: confirmedBy
    });

    if (!reserveResult.success) {
      console.error(`Failed to reserve stock for batch ${item.batchId}: ${reserveResult.error}`);
    }
  }

  await supabase
    .from('orders')
    .update({
      order_status: 'CONFIRMED',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  await writeStatusAuditLog(supabase, {
    entityType: 'ORDER',
    entityId: orderId,
    fromStatus: order.order_status,
    toStatus: 'CONFIRMED',
    performedBy: confirmedBy
  });

  return { success: true };
}

export async function updateOrderStatus(
  supabase: any,
  orderId: string,
  newStatus: OrderStatusType,
  changedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: order } = await supabase
    .from('orders')
    .select('order_status')
    .eq('id', orderId)
    .single();

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  if (!isValidStatusTransition(order.order_status as OrderStatusType, newStatus)) {
    return { success: false, error: `Invalid status transition from ${order.order_status} to ${newStatus}` };
  }

  await supabase
    .from('orders')
    .update({
      order_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  await writeStatusAuditLog(supabase, {
    entityType: 'ORDER',
    entityId: orderId,
    fromStatus: order.order_status,
    toStatus: newStatus,
    performedBy: changedBy,
    reason
  });

  return { success: true };
}

async function writeStatusAuditLog(
  supabase: any,
  entry: {
    entityType: string;
    entityId: string;
    fromStatus: string | null;
    toStatus: string;
    performedBy: string;
    reason?: string;
    metadata?: Record<string, any>;
  }
) {
  await supabase.from('status_audit_logs').insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    from_status: entry.fromStatus,
    to_status: entry.toStatus,
    actor_id: entry.performedBy,
    reason: entry.reason,
    metadata: entry.metadata,
    created_at: new Date().toISOString()
  });
}

export async function generateInvoices(
  supabase: any,
  orderId: string
): Promise<{ success: boolean; invoices?: InvoiceData[]; error?: string }> {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      retailer_id,
      distributor_id,
      items,
      subtotal_paise,
      total_tax_paise,
      grand_total_paise,
      gst_type,
      marketplace_amount_paise,
      proprietary_amount_paise,
      profiles_retailer:retailer_id(id, business_name, address, city, state, pincode, gst_number, state_code),
      profiles_distributor:distributor_id(id, business_name, address, city, state, pincode, gst_number, drug_license_number, state_code)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  const invoices: InvoiceData[] = [];
  const invoiceNumbers: { sale?: string; stockTransfer?: string; commission?: string } = {};

  const retailer = order.profiles_retailer;
  const distributor = order.profiles_distributor;
  const items = order.items || [];
  const marketplaceItems = items.filter((i: any) => !i.isProprietary);
  const proprietaryItems = items.filter((i: any) => i.isProprietary);

  if (marketplaceItems.length > 0) {
    const saleResult = await generateMarketplaceSaleInvoice(supabase, order, marketplaceItems, retailer, distributor);
    if (saleResult.invoice) {
      invoices.push(saleResult.invoice);
      invoiceNumbers.sale = saleResult.invoice.invoiceNumber;
    }

    const commissionResult = await generateCommissionInvoice(supabase, order, marketplaceItems, retailer, distributor);
    if (commissionResult.invoice) {
      invoices.push(commissionResult.invoice);
      invoiceNumbers.commission = commissionResult.invoice.invoiceNumber;
    }
  }

  if (proprietaryItems.length > 0) {
    const stockTransferResult = await generateProprietaryStockTransferInvoice(supabase, order, proprietaryItems, distributor);
    if (stockTransferResult.invoice) {
      invoices.push(stockTransferResult.invoice);
      invoiceNumbers.stockTransfer = stockTransferResult.invoice.invoiceNumber;
    }

    const saleResult = await generateProprietarySaleInvoice(supabase, order, proprietaryItems, retailer, distributor);
    if (saleResult.invoice) {
      invoices.push(saleResult.invoice);
      if (!invoiceNumbers.sale) invoiceNumbers.sale = saleResult.invoice.invoiceNumber;
    }
  }

  return { success: true, invoices, invoiceNumbers };
}

async function generateMarketplaceSaleInvoice(
  supabase: any,
  order: any,
  items: any[],
  retailer: any,
  distributor: any
): Promise<{ invoice?: InvoiceData; error?: string }> {
  const invoiceResult = await generateInvoiceNumber(supabase);
  const invoiceNumber = invoiceResult.invoiceNo;

  const lineItems: InvoiceLineItem[] = items.map((item: any) => {
    const lineTotal = Number(item.lineTotal) || 0;
    const gstRate = Number(item.gstRate) || 12;
    const gstAmount = roundToTwo(lineTotal * (gstRate / 100));

    return {
      productId: item.productId,
      productName: item.productName,
      hsnCode: item.hsnCode || '',
      batchNumber: item.batchNumber,
      expiryDate: new Date(item.expiryDate),
      quantity: item.quantity,
      unitPrice: Number(item.ptr),
      lineTotal,
      gstRate,
      gstAmount,
      cgst: order.gst_type === 'CGST_SGST' ? roundToTwo(gstAmount / 2) : undefined,
      sgst: order.gst_type === 'CGST_SGST' ? roundToTwo(gstAmount / 2) : undefined,
      igst: order.gst_type === 'IGST' ? gstAmount : undefined
    };
  });

  const subtotal = roundToTwo(items.reduce((s: number, i: any) => s + Number(i.lineTotal), 0));
  const totalGst = roundToTwo(subtotal * 0.12);

  const invoice: InvoiceData = {
    invoiceNumber,
    invoiceType: 'MARKETPLACE_SALE',
    fromEntityId: distributor.id,
    toEntityId: retailer.id,
    orderId: order.id,
    items: lineItems,
    subtotal,
    cgst: order.gst_type === 'CGST_SGST' ? roundToTwo(totalGst / 2) : undefined,
    sgst: order.gst_type === 'CGST_SGST' ? roundToTwo(totalGst / 2) : undefined,
    igst: order.gst_type === 'IGST' ? totalGst : undefined,
    totalGst,
    grandTotal: roundToTwo(subtotal + totalGst),
    gstType: order.gst_type || 'CGST_SGST',
    placeOfSupply: retailer.state_code || '',
    gstinFrom: distributor.gst_number,
    gstinTo: retailer.gst_number,
    drugLicenseNumber: distributor.drug_license_number
  };

  await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    invoice_type: 'MARKETPLACE_SALE',
    from_entity_id: distributor.id,
    to_entity_id: retailer.id,
    order_id: order.id,
    items: lineItems,
    subtotal_paise: Math.round(subtotal * 100),
    total_tax_paise: Math.round(totalGst * 100),
    grand_total_paise: Math.round((subtotal + totalGst) * 100),
    gst_type: order.gst_type,
    place_of_supply: retailer.state_code,
    gstin_from: distributor.gst_number,
    gstin_to: retailer.gst_number,
    drug_license_number: distributor.drug_license_number
  });

  return { invoice };
}

async function generateCommissionInvoice(
  supabase: any,
  order: any,
  items: any[],
  retailer: any,
  distributor: any
): Promise<{ invoice?: InvoiceData; error?: string }> {
  const invoiceResult = await generateInvoiceNumber(supabase);
  const invoiceNumber = invoiceResult.invoiceNo;

  const subtotal = roundToTwo(items.reduce((s: number, i: any) => s + Number(i.lineTotal), 0));
  const platformFee = roundToTwo(subtotal * 0.05);
  const commissionGst = roundToTwo(platformFee * 0.18);

  const invoice: InvoiceData = {
    invoiceNumber,
    invoiceType: 'COMMISSION',
    fromEntityId: 'AGORICH',
    toEntityId: distributor.id,
    orderId: order.id,
    items: [{
      productId: 'COMMISSION',
      productName: 'Platform Commission Fee (5%)',
      hsnCode: '999999',
      batchNumber: 'N/A',
      expiryDate: new Date(),
      quantity: 1,
      unitPrice: platformFee,
      lineTotal: platformFee,
      gstRate: 18,
      cgst: roundToTwo(commissionGst / 2),
      sgst: roundToTwo(commissionGst / 2),
      gstAmount: commissionGst
    }],
    subtotal: platformFee,
    cgst: roundToTwo(commissionGst / 2),
    sgst: roundToTwo(commissionGst / 2),
    totalGst: commissionGst,
    grandTotal: roundToTwo(platformFee + commissionGst),
    gstType: 'CGST_SGST',
    placeOfSupply: distributor.state_code || ''
  };

  await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    invoice_type: 'COMMISSION',
    from_entity_id: 'AGORICH',
    to_entity_id: distributor.id,
    order_id: order.id,
    items: invoice.items,
    subtotal_paise: Math.round(platformFee * 100),
    total_tax_paise: Math.round(commissionGst * 100),
    grand_total_paise: Math.round((platformFee + commissionGst) * 100),
    gst_type: 'CGST_SGST',
    place_of_supply: distributor.state_code
  });

  return { invoice };
}

async function generateProprietaryStockTransferInvoice(
  supabase: any,
  order: any,
  items: any[],
  distributor: any
): Promise<{ invoice?: InvoiceData; error?: string }> {
  const invoiceResult = await generateInvoiceNumber(supabase);
  const invoiceNumber = invoiceResult.invoiceNo;

  const subtotal = roundToTwo(items.reduce((s: number, i: any) => s + (Number(i.ptd) || 0) * i.quantity, 0));
  const gstRate = 12;
  const totalGst = roundToTwo(subtotal * (gstRate / 100));

  const lineItems: InvoiceLineItem[] = items.map((item: any) => {
    const ptd = Number(item.ptd) || 0;
    const lineTotal = roundToTwo(ptd * item.quantity);
    const gstAmount = roundToTwo(lineTotal * (gstRate / 100));

    return {
      productId: item.productId,
      productName: item.productName,
      hsnCode: item.hsnCode || '',
      batchNumber: item.batchNumber,
      expiryDate: new Date(item.expiryDate),
      quantity: item.quantity,
      unitPrice: ptd,
      lineTotal,
      gstRate,
      cgst: roundToTwo(gstAmount / 2),
      sgst: roundToTwo(gstAmount / 2),
      gstAmount
    };
  });

  const invoice: InvoiceData = {
    invoiceNumber,
    invoiceType: 'PROP_STOCK_TRANSFER',
    fromEntityId: 'AGORICH',
    toEntityId: distributor.id,
    orderId: order.id,
    items: lineItems,
    subtotal,
    cgst: roundToTwo(totalGst / 2),
    sgst: roundToTwo(totalGst / 2),
    totalGst,
    grandTotal: roundToTwo(subtotal + totalGst),
    gstType: 'CGST_SGST',
    placeOfSupply: distributor.state_code || '',
    gstinFrom: 'AGORICH_GSTIN'
  };

  await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    invoice_type: 'PROP_STOCK_TRANSFER',
    from_entity_id: 'AGORICH',
    to_entity_id: distributor.id,
    order_id: order.id,
    items: lineItems,
    subtotal_paise: Math.round(subtotal * 100),
    total_tax_paise: Math.round(totalGst * 100),
    grand_total_paise: Math.round((subtotal + totalGst) * 100),
    gst_type: 'CGST_SGST',
    place_of_supply: distributor.state_code
  });

  return { invoice };
}

async function generateProprietarySaleInvoice(
  supabase: any,
  order: any,
  items: any[],
  retailer: any,
  distributor: any
): Promise<{ invoice?: InvoiceData; error?: string }> {
  const invoiceResult = await generateInvoiceNumber(supabase);
  const invoiceNumber = invoiceResult.invoiceNo;

  const lineItems: InvoiceLineItem[] = items.map((item: any) => {
    const lineTotal = Number(item.lineTotal) || 0;
    const gstRate = Number(item.gstRate) || 12;
    const gstAmount = roundToTwo(lineTotal * (gstRate / 100));

    return {
      productId: item.productId,
      productName: item.productName,
      hsnCode: item.hsnCode || '',
      batchNumber: item.batchNumber,
      expiryDate: new Date(item.expiryDate),
      quantity: item.quantity,
      unitPrice: Number(item.ptr),
      lineTotal,
      gstRate,
      cgst: order.gst_type === 'CGST_SGST' ? roundToTwo(gstAmount / 2) : undefined,
      sgst: order.gst_type === 'CGST_SGST' ? roundToTwo(gstAmount / 2) : undefined,
      igst: order.gst_type === 'IGST' ? gstAmount : undefined,
      gstAmount
    };
  });

  const subtotal = roundToTwo(items.reduce((s: number, i: any) => s + Number(i.lineTotal), 0));
  const totalGst = roundToTwo(subtotal * 0.12);

  const invoice: InvoiceData = {
    invoiceNumber,
    invoiceType: 'PROP_SALE',
    fromEntityId: distributor.id,
    toEntityId: retailer.id,
    orderId: order.id,
    items: lineItems,
    subtotal,
    cgst: order.gst_type === 'CGST_SGST' ? roundToTwo(totalGst / 2) : undefined,
    sgst: order.gst_type === 'CGST_SGST' ? roundToTwo(totalGst / 2) : undefined,
    igst: order.gst_type === 'IGST' ? totalGst : undefined,
    totalGst,
    grandTotal: roundToTwo(subtotal + totalGst),
    gstType: order.gst_type || 'CGST_SGST',
    placeOfSupply: retailer.state_code || '',
    gstinFrom: distributor.gst_number,
    gstinTo: retailer.gst_number,
    drugLicenseNumber: distributor.drug_license_number
  };

  await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    invoice_type: 'PROP_SALE',
    from_entity_id: distributor.id,
    to_entity_id: retailer.id,
    order_id: order.id,
    items: lineItems,
    subtotal_paise: Math.round(subtotal * 100),
    total_tax_paise: Math.round(totalGst * 100),
    grand_total_paise: Math.round((subtotal + totalGst) * 100),
    gst_type: order.gst_type,
    place_of_supply: retailer.state_code,
    gstin_from: distributor.gst_number,
    gstin_to: retailer.gst_number
  });

  return { invoice };
}

export class AgorichOrderEngine {
  static createOrder = createOrder;
  static confirmOrder = confirmOrder;
  static updateOrderStatus = updateOrderStatus;
  static generateInvoices = generateInvoices;
}
