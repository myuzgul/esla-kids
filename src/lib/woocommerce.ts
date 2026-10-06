import { prisma } from './prisma';
import { slugify } from './utils';

export interface WooConnectionConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface ImportStats {
  categoriesImported: number;
  productsImported: number;
  variationsImported: number;
  ordersImported: number;
  errors: string[];
}

export function normalizeVariationAttributes(
  attributes: Array<{ id?: number; name?: string; slug?: string; option?: string }> | Record<string, any>
): Record<string, string> {
  const attrMap: Record<string, string> = {};

  if (Array.isArray(attributes)) {
    attributes.forEach((a) => {
      const rawName = (a.name || '').trim();
      const option = (a.option || '').trim();
      if (!rawName && !option) return;

      if (rawName) attrMap[rawName] = option;

      const lowerName = rawName.toLowerCase();
      const slug = (a.slug || '').toLowerCase();

      // Yaş / Beden / Size
      if (
        lowerName === 'yaş' ||
        lowerName === 'yas' ||
        lowerName === 'beden' ||
        lowerName === 'size' ||
        slug === 'pa_yas' ||
        slug === 'pa_beden' ||
        slug === 'pa_size'
      ) {
        attrMap['Beden'] = option;
        attrMap['Yaş'] = option;
      }

      // Renk / Color
      if (
        lowerName === 'renk' ||
        lowerName === 'color' ||
        slug === 'pa_renk'
      ) {
        attrMap['Renk'] = option;
      }

      // Desen / Pattern
      if (
        lowerName === 'desen' ||
        lowerName === 'pattern' ||
        slug === 'pa_desen'
      ) {
        attrMap['Desen'] = option;
      }
    });
  } else if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([k, v]) => {
      const rawName = (k || '').trim();
      const option = typeof v === 'string' ? v.trim() : String(v || '');
      if (!rawName && !option) return;

      attrMap[rawName] = option;

      const lowerName = rawName.toLowerCase();
      if (
        lowerName === 'yaş' ||
        lowerName === 'yas' ||
        lowerName === 'beden' ||
        lowerName === 'size'
      ) {
        attrMap['Beden'] = option;
        attrMap['Yaş'] = option;
      }

      if (lowerName === 'renk' || lowerName === 'color') {
        attrMap['Renk'] = option;
      }

      if (lowerName === 'desen' || lowerName === 'pattern') {
        attrMap['Desen'] = option;
      }
    });
  }

  // Cross fallbacks:
  if (!attrMap['Renk'] && attrMap['Desen']) {
    attrMap['Renk'] = attrMap['Desen'];
  }
  if (!attrMap['Beden'] && attrMap['Yaş']) {
    attrMap['Beden'] = attrMap['Yaş'];
  }
  if (!attrMap['Yaş'] && attrMap['Beden']) {
    attrMap['Yaş'] = attrMap['Beden'];
  }

  return attrMap;
}

export class WooCommerceImporter {
  private config: WooConnectionConfig;

  constructor(config: WooConnectionConfig) {
    let u = config.url.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    u = u.replace(/\/+$/, '');
    this.config = {
      url: u,
      consumerKey: config.consumerKey.trim(),
      consumerSecret: config.consumerSecret.trim(),
    };
  }

  private getAuthHeader(): string {
    const credentials = this.config.consumerKey + ':' + this.config.consumerSecret;
    const token = Buffer.from(credentials).toString('base64');
    return 'Basic ' + token;
  }

  async testConnection(): Promise<{ success: boolean; message: string; storeName?: string }> {
    try {
      const endpoint = this.config.url + '/wp-json/wc/v3/system_status';
      const res = await fetch(endpoint, {
        headers: { Authorization: this.getAuthHeader() },
      });
      if (!res.ok) {
        return { success: false, message: 'Bağlantı hatası: HTTP ' + res.status + ' ' + res.statusText };
      }
      const data = await res.json();
      return {
        success: true,
        message: 'WooCommerce mağazasına başarıyla bağlanıldı!',
        storeName: data?.environment?.site_title || 'WooCommerce Mağazası',
      };
    } catch (err: any) {
      return { success: false, message: 'Bağlantı kurulamadı: ' + err.message };
    }
  }

  // 1. Categories Import with Pagination & Headers
  async importCategories(page = 1, perPage = 100): Promise<{ count: number; hasMore: boolean; totalCount: number; totalPages: number }> {
    const endpoint = `${this.config.url}/wp-json/wc/v3/products/categories?per_page=${perPage}&page=${page}&hide_empty=false`;
    const res = await fetch(endpoint, {
      headers: { Authorization: this.getAuthHeader() },
    });
    if (!res.ok) throw new Error('Kategori aktarım hatası: ' + res.statusText);

    const totalCount = parseInt(res.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    const categories = await res.json();
    if (!Array.isArray(categories) || categories.length === 0) {
      return { count: 0, hasMore: false, totalCount, totalPages };
    }

    let imported = 0;
    for (const c of categories) {
      try {
        if (c.slug === 'uncategorized' || c.name === 'Genel') continue;
        const slug = c.slug || slugify(c.name);

        await prisma.category.upsert({
          where: { slug },
          update: {
            name: c.name,
            description: c.description || null,
            image: c.image?.src || null,
            wooId: c.id,
          },
          create: {
            name: c.name,
            slug,
            description: c.description || null,
            image: c.image?.src || null,
            wooId: c.id,
          },
        });
        imported++;
      } catch (catErr) {
        console.error(`Error importing category ${c.name}:`, catErr);
      }
    }

    // Setup parent relationships
    for (const c of categories) {
      try {
        if (c.parent && c.parent > 0) {
          const parentCat = await prisma.category.findUnique({ where: { wooId: c.parent } });
          if (parentCat) {
            await prisma.category.updateMany({
              where: { wooId: c.id },
              data: { parentId: parentCat.id },
            });
          }
        }
      } catch (pErr) {}
    }

    return { 
      count: imported, 
      hasMore: page < totalPages && categories.length === perPage,
      totalCount,
      totalPages,
    };
  }

  // 2. Products and Variations Import with status=any & collision prevention
  async importProducts(page = 1, perPage = 100): Promise<{ count: number; variationsCount: number; hasMore: boolean; totalCount: number; totalPages: number }> {
    const endpoint = `${this.config.url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=any`;
    const res = await fetch(endpoint, {
      headers: { Authorization: this.getAuthHeader() },
    });
    if (!res.ok) throw new Error('Ürün aktarım hatası: ' + res.statusText);

    const totalCount = parseInt(res.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) {
      return { count: 0, variationsCount: 0, hasMore: false, totalCount, totalPages };
    }

    let prodCount = 0;
    let varCount = 0;

    for (const p of products) {
      try {
        let baseSlug = p.slug || slugify(p.name);
        const sku = p.sku && p.sku.trim() !== '' ? p.sku.trim() : 'WC-' + p.id;
        const price = parseFloat(p.price || p.regular_price || '0');
        const compareAtPrice = p.sale_price && p.regular_price ? parseFloat(p.regular_price) : null;
        const images = (p.images || []).map((img: any) => img.src);

        // Check if slug exists on a DIFFERENT product
        const slugMatch = await prisma.product.findUnique({ where: { slug: baseSlug } });
        if (slugMatch && slugMatch.wooId !== p.id && slugMatch.sku !== sku) {
          baseSlug = `${baseSlug}-${p.id}`;
        }

        // Check if product exists by wooId or sku
        const existing = await prisma.product.findFirst({
          where: {
            OR: [
              { wooId: p.id },
              { sku }
            ]
          }
        });

        let product: any;
        if (existing) {
          product = await prisma.product.update({
            where: { id: existing.id },
            data: {
              title: p.name,
              slug: baseSlug,
              sku,
              description: p.description?.replace(/<[^>]*>?/gm, '') || p.description,
              shortDescription: p.short_description?.replace(/<[^>]*>?/gm, '') || p.short_description,
              price: isNaN(price) ? 0 : price,
              compareAtPrice,
              stock: p.manage_stock && p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : (p.stock_status === 'instock' ? 10 : 0),
              stockStatus: p.stock_status === 'instock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
              images: JSON.stringify(images),
              wooId: p.id,
            },
          });
        } else {
          product = await prisma.product.create({
            data: {
              title: p.name,
              slug: baseSlug,
              sku,
              description: p.description?.replace(/<[^>]*>?/gm, '') || p.description,
              shortDescription: p.short_description?.replace(/<[^>]*>?/gm, '') || p.short_description,
              price: isNaN(price) ? 0 : price,
              compareAtPrice,
              stock: p.manage_stock && p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : (p.stock_status === 'instock' ? 10 : 0),
              stockStatus: p.stock_status === 'instock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
              images: JSON.stringify(images),
              wooId: p.id,
            },
          });
        }
        prodCount++;

        // Link categories
        if (p.categories && Array.isArray(p.categories)) {
          for (const cat of p.categories) {
            try {
              const dbCat = await prisma.category.findUnique({ where: { wooId: cat.id } });
              if (dbCat) {
                await prisma.categoriesOnProducts.upsert({
                  where: {
                    productId_categoryId: {
                      productId: product.id,
                      categoryId: dbCat.id,
                    },
                  },
                  update: {},
                  create: {
                    productId: product.id,
                    categoryId: dbCat.id,
                  },
                });
              }
            } catch (catErr) {}
          }
        }

        // Variations
        if (p.type === 'variable' || (p.variations && p.variations.length > 0)) {
          try {
            let varPage = 1;
            let hasMoreVars = true;

            while (hasMoreVars) {
              const varEndpoint = `${this.config.url}/wp-json/wc/v3/products/${p.id}/variations?per_page=100&page=${varPage}`;
              const vRes = await fetch(varEndpoint, {
                headers: { Authorization: this.getAuthHeader() },
              });
              if (!vRes.ok) break;

              const variations = await vRes.json();
              if (!Array.isArray(variations) || variations.length === 0) break;

              for (const v of variations) {
                try {
                  const vSku = v.sku && v.sku.trim() !== '' ? v.sku.trim() : `WC-${p.id}-VAR-${v.id}`;
                  const vPrice = parseFloat(v.price || v.regular_price || '0');
                  const vCompare = v.sale_price && v.regular_price ? parseFloat(v.regular_price) : null;
                  const attrMap = normalizeVariationAttributes(v.attributes || []);
                  const vImage = v.image?.src || (images && images.length > 0 ? images[0] : null);

                  const existingVar = await prisma.productVariation.findFirst({
                    where: {
                      OR: [
                        { wooVariationId: v.id },
                        { sku: vSku }
                      ]
                    }
                  });

                  const varData = {
                    productId: product.id,
                    sku: vSku,
                    price: isNaN(vPrice) || vPrice <= 0 ? price : vPrice,
                    compareAtPrice: vCompare,
                    stock: v.manage_stock && v.stock_quantity !== null && v.stock_quantity !== undefined ? v.stock_quantity : (v.stock_status === 'instock' ? 10 : 0),
                    image: vImage,
                    attributes: JSON.stringify(attrMap),
                    wooVariationId: v.id,
                  };

                  if (existingVar) {
                    await prisma.productVariation.update({
                      where: { id: existingVar.id },
                      data: varData,
                    });
                  } else {
                    await prisma.productVariation.create({
                      data: varData,
                    });
                  }
                  varCount++;
                } catch (varErr) {
                  console.error(`Variation save error (product ${p.id}, var ${v.id}):`, varErr);
                }
              }

              if (variations.length < 100) {
                hasMoreVars = false;
              } else {
                varPage++;
              }
            }
          } catch (vErr) {
            console.error('Variation fetch error for product ' + p.id + ':', vErr);
          }
        }
      } catch (prodErr) {
        console.error(`Product import error for product ${p.id}:`, prodErr);
      }
    }

    return { 
      count: prodCount, 
      variationsCount: varCount, 
      hasMore: page < totalPages && products.length > 0,
      totalCount,
      totalPages,
    };
  }

  // 3. Orders Import with status=any, per_page=100 & full pagination
  async importOrders(page = 1, perPage = 100): Promise<{ count: number; hasMore: boolean; totalCount: number; totalPages: number }> {
    const endpoint = `${this.config.url}/wp-json/wc/v3/orders?per_page=${perPage}&page=${page}&status=any`;
    const res = await fetch(endpoint, {
      headers: { Authorization: this.getAuthHeader() },
    });
    if (!res.ok) throw new Error('Sipariş aktarım hatası: ' + res.statusText);

    const totalCount = parseInt(res.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    const orders = await res.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      return { count: 0, hasMore: false, totalCount, totalPages };
    }

    let orderCount = 0;
    for (const o of orders) {
      try {
        let status = 'NEW';
        if (o.status === 'completed') status = 'DELIVERED';
        else if (o.status === 'processing') status = 'PREPARING';
        else if (o.status === 'on-hold') status = 'CONFIRMED';
        else if (o.status === 'cancelled' || o.status === 'failed') status = 'CANCELLED';
        else if (o.status === 'refunded') status = 'REFUNDED';
        else if (o.status === 'pending') status = 'NEW';

        const orderNumber = 'WC-' + (o.number || o.id);
        const fullName = ((o.billing?.first_name || '') + ' ' + (o.billing?.last_name || '')).trim() || 'Müşteri';
        const email = o.billing?.email || 'musteri@eslakids.com';
        const phone = o.billing?.phone || '';

        const shippingAddress = {
          fullName: ((o.shipping?.first_name || o.billing?.first_name || '') + ' ' + (o.shipping?.last_name || o.billing?.last_name || '')).trim(),
          phone,
          city: o.shipping?.city || o.billing?.city || 'İstanbul',
          district: o.shipping?.state || o.billing?.state || '',
          address: ((o.shipping?.address_1 || o.billing?.address_1 || '') + ' ' + (o.shipping?.address_2 || '')).trim(),
          postalCode: o.shipping?.postcode || '',
        };

        // Check if order exists by wooOrderId or orderNumber
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { wooOrderId: o.id },
              { orderNumber }
            ]
          }
        });

        let order: any;
        if (existingOrder) {
          order = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              guestName: fullName,
              guestEmail: email,
              guestPhone: phone,
              shippingAddress: JSON.stringify(shippingAddress),
              billingAddress: JSON.stringify(shippingAddress),
              status,
              paymentMethod: (o.payment_method_title || o.payment_method || 'Kredi Kartı').toUpperCase(),
              paymentStatus: o.status === 'completed' || o.status === 'processing' ? 'PAID' : 'PENDING',
              subtotal: parseFloat(o.total || '0') - parseFloat(o.shipping_total || '0'),
              shippingFee: parseFloat(o.shipping_total || '0'),
              discountAmount: parseFloat(o.discount_total || '0'),
              totalAmount: parseFloat(o.total || '0'),
              customerNote: o.customer_note || null,
              wooOrderId: o.id,
            },
          });
        } else {
          order = await prisma.order.create({
            data: {
              orderNumber,
              guestName: fullName,
              guestEmail: email,
              guestPhone: phone,
              shippingAddress: JSON.stringify(shippingAddress),
              billingAddress: JSON.stringify(shippingAddress),
              status,
              paymentMethod: (o.payment_method_title || o.payment_method || 'Kredi Kartı').toUpperCase(),
              paymentStatus: o.status === 'completed' || o.status === 'processing' ? 'PAID' : 'PENDING',
              subtotal: parseFloat(o.total || '0') - parseFloat(o.shipping_total || '0'),
              shippingFee: parseFloat(o.shipping_total || '0'),
              discountAmount: parseFloat(o.discount_total || '0'),
              totalAmount: parseFloat(o.total || '0'),
              customerNote: o.customer_note || null,
              wooOrderId: o.id,
              createdAt: new Date(o.date_created_gmt || o.date_created || Date.now()),
            },
          });
        }

        // Add line items if new or missing
        if (o.line_items && Array.isArray(o.line_items)) {
          const existingItems = await prisma.orderItem.count({ where: { orderId: order.id } });
          if (existingItems === 0) {
            for (const item of o.line_items) {
              try {
                let matchedProduct: any = null;
                if (item.product_id) {
                  matchedProduct = await prisma.product.findUnique({ where: { wooId: item.product_id } });
                }
                if (!matchedProduct && item.name) {
                  matchedProduct = await prisma.product.findFirst({ where: { title: item.name } });
                }

                let matchedVar: any = null;
                if (item.variation_id) {
                  matchedVar = await prisma.productVariation.findUnique({ where: { wooVariationId: item.variation_id } });
                }

                let itemImage: string | null = null;
                if (matchedVar?.image) {
                  itemImage = matchedVar.image;
                } else if (matchedProduct?.images) {
                  try {
                    const pImgs = JSON.parse(matchedProduct.images);
                    if (pImgs.length > 0) itemImage = pImgs[0];
                  } catch (e) {}
                }

                let variationLabel: string | null = null;
                if (item.meta_data && Array.isArray(item.meta_data)) {
                  const metaParts = item.meta_data
                    .filter((m: any) => m.key && !m.key.startsWith('_'))
                    .map((m: any) => `${m.display_key || m.key}: ${m.display_value || m.value}`);
                  if (metaParts.length > 0) variationLabel = metaParts.join(', ');
                }
                if (!variationLabel && item.variation_id) {
                  variationLabel = 'Varyasyon #' + item.variation_id;
                }

                await prisma.orderItem.create({
                  data: {
                    orderId: order.id,
                    productId: matchedProduct?.id || null,
                    variationId: matchedVar?.id || null,
                    title: item.name,
                    sku: item.sku || null,
                    variationName: variationLabel,
                    price: parseFloat(item.price || '0'),
                    quantity: item.quantity || 1,
                    total: parseFloat(item.total || '0'),
                    image: itemImage,
                  },
                });
              } catch (itemErr) {
                console.error('Error importing line item:', itemErr);
              }
            }
          }
        }

        orderCount++;
      } catch (singleOrderErr) {
        console.error(`Error importing order ${o.id}:`, singleOrderErr);
      }
    }

    return { 
      count: orderCount, 
      hasMore: page < totalPages && orders.length === perPage,
      totalCount,
      totalPages,
    };
  }

  // 4. Dedicated Variation Sync & Local Attributes Repair
  async syncVariations(): Promise<{ syncedCount: number; fixedLocalCount: number; totalProducts: number }> {
    // 1. Fix all local variations in DB whose attributes need normalization
    const allLocalVars = await prisma.productVariation.findMany();
    let fixedLocalCount = 0;

    for (const lv of allLocalVars) {
      try {
        const parsed = JSON.parse(lv.attributes || '{}');
        const normalized = normalizeVariationAttributes(parsed);
        const normStr = JSON.stringify(normalized);
        if (normStr !== lv.attributes) {
          await prisma.productVariation.update({
            where: { id: lv.id },
            data: { attributes: normStr },
          });
          fixedLocalCount++;
        }
      } catch (e) {}
    }

    // 2. Query WooCommerce variable products from DB
    const wooProducts = await prisma.product.findMany({
      where: { wooId: { not: null } },
      select: { id: true, wooId: true, price: true, images: true },
    });

    let syncedCount = 0;
    for (const wp of wooProducts) {
      if (!wp.wooId) continue;
      try {
        let varPage = 1;
        let hasMore = true;

        let productImages: string[] = [];
        try {
          productImages = JSON.parse(wp.images || '[]');
        } catch (e) {}

        while (hasMore) {
          const varEndpoint = `${this.config.url}/wp-json/wc/v3/products/${wp.wooId}/variations?per_page=100&page=${varPage}`;
          const vRes = await fetch(varEndpoint, {
            headers: { Authorization: this.getAuthHeader() },
          });
          if (!vRes.ok) break;

          const variations = await vRes.json();
          if (!Array.isArray(variations) || variations.length === 0) break;

          for (const v of variations) {
            try {
              const vSku = v.sku && v.sku.trim() !== '' ? v.sku.trim() : `WC-${wp.wooId}-VAR-${v.id}`;
              const vPrice = parseFloat(v.price || v.regular_price || '0');
              const vCompare = v.sale_price && v.regular_price ? parseFloat(v.regular_price) : null;
              const attrMap = normalizeVariationAttributes(v.attributes || []);
              const vImage = v.image?.src || (productImages.length > 0 ? productImages[0] : null);

              const existingVar = await prisma.productVariation.findFirst({
                where: {
                  OR: [
                    { wooVariationId: v.id },
                    { sku: vSku }
                  ]
                }
              });

              const varData = {
                productId: wp.id,
                sku: vSku,
                price: isNaN(vPrice) || vPrice <= 0 ? wp.price : vPrice,
                compareAtPrice: vCompare,
                stock: v.manage_stock && v.stock_quantity !== null && v.stock_quantity !== undefined ? v.stock_quantity : (v.stock_status === 'instock' ? 10 : 0),
                image: vImage,
                attributes: JSON.stringify(attrMap),
                wooVariationId: v.id,
              };

              if (existingVar) {
                await prisma.productVariation.update({
                  where: { id: existingVar.id },
                  data: varData,
                });
              } else {
                await prisma.productVariation.create({
                  data: varData,
                });
              }
              syncedCount++;
            } catch (err) {}
          }

          if (variations.length < 100) {
            hasMore = false;
          } else {
            varPage++;
          }
        }
      } catch (err) {}
    }

    return {
      syncedCount,
      fixedLocalCount,
      totalProducts: wooProducts.length,
    };
  }
}

