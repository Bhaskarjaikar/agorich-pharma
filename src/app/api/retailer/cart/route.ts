import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import {
  validateSingleDistributor,
  validateMOV,
  calculateCartTotals,
  mergeCartItems,
  removeCartItem,
  updateCartItemQuantity,
  validateCartForCheckout,
  AgorichCartEngine
} from '@/lib/cart/rules'

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CART_TTL_MINUTES = 60;

interface StoredCart {
  retailerId: string;
  distributorId: string | null;
  distributorName: string | null;
  items: any[];
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyRetailer(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    const { data: cartData } = await supabase
      .from('retailer_carts')
      .select('*')
      .eq('retailer_id', profile.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!cartData) {
      return NextResponse.json({
        success: true,
        cart: {
          retailerId: profile.id,
          distributorId: null,
          distributorName: null,
          items: [],
          subtotal: 0,
          deliverySurcharge: 0,
          grandTotal: 0,
          minOrderValue: 0,
          shortfall: 0
        }
      });
    }

    const items = cartData.items || [];
    const { subtotal, grandTotal } = calculateCartTotals(items, cartData.delivery_surcharge || 0);

    return NextResponse.json({
      success: true,
      cart: {
        retailerId: profile.id,
        distributorId: cartData.distributor_id,
        distributorName: cartData.distributor_name,
        items,
        subtotal,
        deliverySurcharge: cartData.delivery_surcharge || 0,
        grandTotal,
        minOrderValue: cartData.min_order_value || 0,
        shortfall: cartData.min_order_value ? Math.max(0, cartData.min_order_value - subtotal) : 0
      }
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'cart_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyRetailer(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { action, batch_id, quantity, distributor_id, distributor_name } = body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    if (action === 'add') {
      if (!batch_id || !quantity || quantity <= 0) {
        return NextResponse.json({
          success: false,
          error: 'batch_id and positive quantity are required',
          errorCode: AgorichCartEngine.ERROR_CODES.INVALID_QUANTITY
        }, { status: 400 });
      }

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
          distributor_id,
          products:product_id(id, name)
        `)
        .eq('id', batch_id)
        .single();

      type BatchProduct = { id: string; name: string } | null;
      type BatchType = {
        id: string;
        batch_number: string;
        expiry_date: string;
        ptr: number;
        ptd: number;
        mrp: number;
        is_proprietary: boolean;
        quantity_available: number;
        distributor_id: string;
        products: BatchProduct | BatchProduct[] | null;
      };

      const typedBatch = batch as BatchType | null;
      if (!typedBatch) {
        return NextResponse.json({
          success: false,
          error: 'Batch not found',
          errorCode: AgorichCartEngine.ERROR_CODES.ITEM_UNAVAILABLE
        }, { status: 404 });
      }

      if (typedBatch.quantity_available < quantity) {
        return NextResponse.json({
          success: false,
          error: `Only ${typedBatch.quantity_available} units available`,
          errorCode: AgorichCartEngine.ERROR_CODES.ITEM_UNAVAILABLE
        }, { status: 400 });
      }

      const { data: distributor } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', distributor_id || typedBatch.distributor_id)
        .single();

      const { data: distributorSettings } = await supabase
        .from('distributors')
        .select('min_order_value, delivery_surcharge')
        .eq('id', distributor_id || typedBatch.distributor_id)
        .single();

      const { data: existingCart } = await supabase
        .from('retailer_carts')
        .select('*')
        .eq('retailer_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      const productsInfo = Array.isArray(typedBatch.products) ? typedBatch.products[0] : typedBatch.products;

      if (!productsInfo?.id) {
        return NextResponse.json({
          success: false,
          error: 'Product information not found',
          errorCode: AgorichCartEngine.ERROR_CODES.ITEM_UNAVAILABLE
        }, { status: 400 });
      }

      const newItem = {
        batchId: typedBatch.id,
        productId: productsInfo.id,
        productName: productsInfo.name || 'Unknown',
        distributorId: typedBatch.distributor_id,
        distributorName: distributor?.business_name || 'Unknown',
        quantity,
        ptr: typedBatch.ptr || 0,
        ptd: typedBatch.ptd || 0,
        mrp: typedBatch.mrp || 0,
        isProprietary: typedBatch.is_proprietary || false,
        expiryDate: typedBatch.expiry_date
      };

      let items: any[] = [];
      let cartDistributorId = typedBatch.distributor_id;
      let cartDistributorName = distributor?.business_name || 'Unknown';

      if (existingCart) {
        const conflict = validateSingleDistributor(
          existingCart.items || [],
          newItem.distributorId,
          newItem.distributorName
        );

        if (conflict) {
          return NextResponse.json({
            success: false,
            error: `Your cart has items from ${conflict.existingDistributorName}. Checkout or clear cart to order from ${conflict.newDistributorName}.`,
            errorCode: AgorichCartEngine.ERROR_CODES.DISTRIBUTOR_MISMATCH,
            distributorConflict: {
              existingDistributorId: conflict.existingDistributorId,
              existingDistributorName: conflict.existingDistributorName,
              newDistributorId: conflict.newDistributorId,
              newDistributorName: conflict.newDistributorName
            }
          }, { status: 400 });
        }

        items = mergeCartItems(existingCart.items || [], newItem, quantity);
        cartDistributorId = existingCart.distributor_id;
        cartDistributorName = existingCart.distributor_name;
      }

      const { subtotal, grandTotal } = calculateCartTotals(items, distributorSettings?.delivery_surcharge || 0);
      const movShortfall = validateMOV(subtotal, distributorSettings?.min_order_value || 0);

      const expiresAt = new Date(Date.now() + CART_TTL_MINUTES * 60 * 1000);

      const cartRow = {
        retailer_id: profile.id,
        distributor_id: cartDistributorId,
        distributor_name: cartDistributorName,
        items,
        subtotal,
        delivery_surcharge: distributorSettings?.delivery_surcharge || 0,
        grand_total: grandTotal,
        min_order_value: distributorSettings?.min_order_value || 0,
        expires_at: expiresAt.toISOString()
      };

      if (existingCart) {
        await supabase
          .from('retailer_carts')
          .update(cartRow)
          .eq('id', existingCart.id);
      } else {
        await supabase
          .from('retailer_carts')
          .insert(cartRow);
      }

      return NextResponse.json({
        success: true,
        cart: {
          retailerId: profile.id,
          distributorId: cartDistributorId,
          distributorName: cartDistributorName,
          items,
          subtotal,
          deliverySurcharge: distributorSettings?.delivery_surcharge || 0,
          grandTotal,
          minOrderValue: distributorSettings?.min_order_value || 0,
          shortfall: movShortfall?.shortfall || 0
        },
        movShortfall
      });
    }

    if (action === 'remove') {
      if (!batch_id) {
        return NextResponse.json({ success: false, error: 'batch_id is required' }, { status: 400 });
      }

      const { data: existingCart } = await supabase
        .from('retailer_carts')
        .select('*')
        .eq('retailer_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!existingCart) {
        return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 });
      }

      const items = removeCartItem(existingCart.items || [], batch_id);
      const { subtotal, grandTotal } = calculateCartTotals(items, existingCart.delivery_surcharge || 0);

      if (items.length === 0) {
        await supabase.from('retailer_carts').delete().eq('id', existingCart.id);
      } else {
        await supabase
          .from('retailer_carts')
          .update({ items, subtotal, grand_total: grandTotal })
          .eq('id', existingCart.id);
      }

      return NextResponse.json({
        success: true,
        cart: {
          retailerId: profile.id,
          distributorId: existingCart.distributor_id,
          distributorName: existingCart.distributor_name,
          items,
          subtotal,
          deliverySurcharge: existingCart.delivery_surcharge || 0,
          grandTotal,
          minOrderValue: existingCart.min_order_value || 0,
          shortfall: Math.max(0, (existingCart.min_order_value || 0) - subtotal)
        }
      });
    }

    if (action === 'update_quantity') {
      if (!batch_id || quantity === undefined) {
        return NextResponse.json({ success: false, error: 'batch_id and quantity are required' }, { status: 400 });
      }

      const { data: existingCart } = await supabase
        .from('retailer_carts')
        .select('*')
        .eq('retailer_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!existingCart) {
        return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 });
      }

      const items = updateCartItemQuantity(existingCart.items || [], batch_id, quantity);

      if (items.length === 0) {
        await supabase.from('retailer_carts').delete().eq('id', existingCart.id);
      } else {
        const { subtotal, grandTotal } = calculateCartTotals(items, existingCart.delivery_surcharge || 0);
        await supabase
          .from('retailer_carts')
          .update({ items, subtotal, grand_total: grandTotal })
          .eq('id', existingCart.id);
      }

      return NextResponse.json({ success: true, message: 'Cart updated' });
    }

    if (action === 'clear') {
      await supabase
        .from('retailer_carts')
        .delete()
        .eq('retailer_id', profile.id);

      return NextResponse.json({
        success: true,
        cart: {
          retailerId: profile.id,
          distributorId: null,
          distributorName: null,
          items: [],
          subtotal: 0,
          deliverySurcharge: 0,
          grandTotal: 0,
          minOrderValue: 0,
          shortfall: 0
        }
      });
    }

    if (action === 'validate_checkout') {
      const { data: existingCart } = await supabase
        .from('retailer_carts')
        .select('*')
        .eq('retailer_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!existingCart || !existingCart.items || existingCart.items.length === 0) {
        return NextResponse.json({
          success: false,
          canCheckout: false,
          issues: ['Cart is empty']
        }, { status: 400 });
      }

      const cart = {
        retailerId: profile.id,
        distributorId: existingCart.distributor_id,
        distributorName: existingCart.distributor_name,
        items: existingCart.items,
        subtotal: existingCart.subtotal,
        deliverySurcharge: existingCart.delivery_surcharge || 0,
        grandTotal: existingCart.grand_total,
        minOrderValue: existingCart.min_order_value || 0,
        shortfall: Math.max(0, (existingCart.min_order_value || 0) - existingCart.subtotal)
      };

      const validation = validateCartForCheckout(cart);

      return NextResponse.json({
        success: true,
        ...validation
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'cart_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
