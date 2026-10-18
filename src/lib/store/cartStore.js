import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (product) => {
        const { cart } = get();
        const existing = cart.find((item) => item._id === product._id);
        if (existing) {
          set({
            cart: cart.map((item) =>
              item._id === product._id ? { ...item, qty: item.qty + 1 } : item
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              {
                _id: product._id,
                name: product.name,
                barcode: product.barcode,
                price: product.price,
                pricingType: product.pricingType ?? 'unit',
                unit: product.unit ?? 'each',
                vatCode: product.vatCode ?? 'S',
                vatRate: product.vatRate ?? 20,
                qty: 1,
              },
            ],
          });
        }
      },
      addWeightedToCart: (product, weightKg) => {
        const line = {
          _id: `${product._id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product._id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          qty: 1,
          weight: weightKg,
          pricingType: 'weight',
          unit: product.unit ?? 'kg',
          vatCode: product.vatCode ?? 'S',
          vatRate: product.vatRate ?? 20,
        };
        set((state) => ({ cart: [...state.cart, line] }));
      },

      removeFromCart: (id) => {
        set({ cart: get().cart.filter((item) => item._id !== id) });
      },

      updateQty: (id, delta) => {
        set({
          cart: get()
            .cart.map((item) =>
              item._id === id && item.pricingType !== 'weight'
                ? { ...item, qty: item.qty + delta }
                : item
            )
            .filter((item) => item.pricingType === 'weight' || item.qty > 0),
        });
      },

      clearCart: () => set({ cart: [] }),
      lineTotalOf: (item) => item.pricingType === 'weight' ? item.price * (item.weight ?? 0) : item.price * item.qty,
      getSubtotal: () => {
        return get().cart.reduce((sum, item) => {
          const lt = item.pricingType === 'weight' ? item.price * (item.weight ?? 0) : item.price * item.qty;
          return sum + lt;
        }, 0);
      },

      getVatBreakdown: () => {
        const breakdown = {};
        for (const item of get().cart) {
          const code = item.vatCode ?? 'S';
          const rate = item.vatRate ?? 20;
          const lineTotal =
            item.pricingType === 'weight'
              ? item.price * (item.weight ?? 0)
              : item.price * item.qty;
          if (!breakdown[code]) breakdown[code] = { rate, taxableAmount: 0 };
          breakdown[code].taxableAmount += lineTotal;
        }
        return breakdown;
      },

      // Total VAT across all bands
      getVatAmount: () => {
        const breakdown = get().getVatBreakdown();
        let vat = 0;
        for (const { rate, taxableAmount } of Object.values(breakdown)) {
          vat += (taxableAmount * rate) / 100;
        }
        return vat;
      },

      parkedSales: [],

      parkCurrentSale: (label) => {
        const { cart, parkedSales } = get();
        if (cart.length === 0) return;
        if (!label || !label.trim()) throw new Error('Label is required');

        const parked = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          label: label.trim(),
          cart,
          parkedAt: new Date().toISOString(),
          subtotal: cart.reduce(
            (sum, i) =>
              sum +
              (i.pricingType === 'weight'
                ? i.price * (i.weight ?? 0)
                : i.price * i.qty),
            0
          ),
        };

        set({
          parkedSales: [...parkedSales, parked],
          cart: [], // clear the active cart
        });
      },

      resumeParkedSale: (id) => {
        const { cart, parkedSales } = get();
        const parked = parkedSales.find((p) => p.id === id);
        if (!parked) throw new Error('Parked sale not found');

        // If active cart isn't empty, park it first (don't lose it)
        if (cart.length > 0) {
          const autoLabel = `Auto-${new Date().toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}`;
          const autoParked = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            label: autoLabel,
            cart,
            parkedAt: new Date().toISOString(),
            subtotal: cart.reduce(
              (sum, i) =>
                sum +
                (i.pricingType === 'weight'
                  ? i.price * (i.weight ?? 0)
                  : i.price * i.qty),
              0
            ),
          };

          set({
            parkedSales: [
              ...parkedSales.filter((p) => p.id !== id),
              autoParked,
            ],
            cart: parked.cart,
          });
        } else {
          set({
            parkedSales: parkedSales.filter((p) => p.id !== id),
            cart: parked.cart,
          });
        }
      },

      deleteParkedSale: (id) => {
        set({ parkedSales: get().parkedSales.filter((p) => p.id !== id) });
      },

      clearAllParked: () => set({ parkedSales: [] }),
      getTotal: () => {
        return get().getSubtotal() + get().getVatAmount();
      },
    }),
    {
      name: 'pos-cart',
    }
  )
);