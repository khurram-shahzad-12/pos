'use client';

import { useState, useEffect, useRef } from 'react';
import { useTill } from '@/components/TillProvider';
import { useCartStore } from '@/lib/store/cartStore';
import { usePosTopBar } from '@/lib/context/PosTopBarContext';

function CashierPage() {
  const tillId = useTill();
  const { setConfig } = usePosTopBar();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [parkLabel, setParkLabel] = useState('');
  const [parkedModalOpen, setParkedModalOpen] = useState(false);
  const [weightPrompt, setWeightPrompt] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const barcodeRef = useRef(null);
  const cartListRef = useRef(null);

  const cart = useCartStore((state) => state.cart);
  const addToCart = useCartStore((state) => state.addToCart);
  const addWeightedToCart = useCartStore((state) => state.addWeightedToCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQty = useCartStore((state) => state.updateQty);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotal = useCartStore((state) => state.getTotal);
  const getVatBreakdown = useCartStore((state) => state.getVatBreakdown);
  const getVatAmount = useCartStore((state) => state.getVatAmount);
  const parkedSales = useCartStore((state) => state.parkedSales);
  const parkCurrentSale = useCartStore((state) => state.parkCurrentSale);
  const resumeParkedSale = useCartStore((state) => state.resumeParkedSale);
  const deleteParkedSale = useCartStore((state) => state.deleteParkedSale);
  const subtotal = getSubtotal();
  const vatBreakdown = getVatBreakdown();
  const vatAmount = getVatAmount();
  const total = getTotal();

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setConfig({ title: 'Till', actions: null });
    return () => setConfig({ title: 'Cash & Carry POS', actions: null });
  }, [setConfig]);

  useEffect(() => {
  if (cartListRef.current && cart.length > 0) {
    cartListRef.current.scrollTo({
      top: cartListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }
}, [cart.length]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products', { credentials: 'include' });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const parsed = parseWeightBarcode(code);
    if (parsed) {
      const res = await fetch(`/api/products/barcode/2000${parsed.plu}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(`No product found for PLU: ${parsed.plu}`);
        setTimeout(() => setError(''), 3000);
        setBarcodeInput('');
        return;
      }
      const product = await res.json();
      if (product.pricingType !== 'weight') {
        setError('Weight barcode scanned, but product is not weight-priced');
        setTimeout(() => setError(''), 3000);
        setBarcodeInput('');
        return;
      }
      addWeightedToCart(product, parsed.weightGrams / 1000);
      setBarcodeInput('');
      return;
    }
    const res = await fetch(`/api/products/barcode/${code}`, { credentials: 'include' });
    if (!res.ok) {
      setError(`No product found for barcode: ${code}`);
      setTimeout(() => setError(''), 3000);
      setBarcodeInput('');
      return;
    }
    const product = await res.json();

    if (product.pricingType === 'weight') {
      setWeightPrompt({ product });
      setWeightInput('');
      setBarcodeInput('');
      return;
    }

    addToCart(product);
    setBarcodeInput('');
  };

  const handlePayByCash = () => {
    if (cart.length === 0) return;
    setAmountReceived('');
    setError('');
    setCashModalOpen(true);
  };

  const handleCompleteCashSale = async () => {
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received < total) {
      setError('Amount received must be at least the total');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const payload = {
        tillId,
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          barcode: item.barcode,
          price: item.price,
          qty: item.qty,
          weight: item.weight ?? null,
          pricingType: item.pricingType ?? 'unit',
          unit: item.unit ?? 'each',
          vatCode: item.vatCode ?? 'S',
          vatRate: item.vatRate ?? 20,
        })),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(vatAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
        paymentMethod: 'cash',
        vatBreakdown: Object.entries(vatBreakdown).map(([code, { rate, taxableAmount }]) => ({
          code,
          rate,
          taxableAmount: Number(taxableAmount.toFixed(2)),
          vatAmount: Number(((taxableAmount * rate) / 100).toFixed(2)),
        })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sale');

      const change = received - total;

      setCompletedSale({
        receiptNumber: data.receiptNumber,
        total,
        received,
        change,
      });

      fetch('/api/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ saleId: data._id, openDrawer: true }),
      }).catch((err) => console.error('Receipt print failed:', err));

      setCashModalOpen(false);
      setAmountReceived('');
      clearCart();
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    setCompletedSale(null);
    setError('');
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
  );

  const handleHoldSale = () => {
    if (cart.length === 0) return;
    setParkLabel('');
    setHoldModalOpen(true);
  };

  const handleConfirmHold = () => {
    if (!parkLabel.trim()) {
      setError('Please enter a label');
      return;
    }
    try {
      parkCurrentSale(parkLabel);
      setHoldModalOpen(false);
      setParkLabel('');
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResume = (id) => {
    try {
      resumeParkedSale(id);
      setParkedModalOpen(false);
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch (err) {
      setError(err.message);
    }
  };
  function parseWeightBarcode(code) {
    if (!/^2\d{12}$/.test(code)) return null;

    const plu = code.slice(1, 6);            // digits 2-6, e.g. "00042"
    const weightGrams = parseInt(code.slice(6, 11), 10);  // digits 7-11, e.g. 850
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) return null;

    return { plu, weightGrams };
  }

  return (
    <>
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <form onSubmit={handleBarcodeSubmit} className="mb-4">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type and press Enter..."
              className="w-full px-6 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white shadow-sm"
            />
          </form>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name..."
            className="w-full px-4 py-3 mb-4 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none bg-white"
          />

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p className="text-lg">No products found</p>
                <a
                  href="/products/new"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Add New Product
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => {
                      if (product.pricingType === 'weight') {
                        setWeightPrompt({ product });
                        setWeightInput('');
                      } else {
                        addToCart(product);
                      }
                    }}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition p-4 text-left min-h-[120px] flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-lg line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-sm text-slate-500">{product.barcode}</p>
                      {product.stock !== undefined && (
                        <p className="text-xs text-slate-400">
                          Stock: {product.stock}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                      £{product.price.toFixed(2)}
                      <span className="text-sm text-slate-500 font-normal ml-1">
                        {product.pricingType === 'weight' ? `/${product.unit || 'kg'}` : ' each'}
                      </span>
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-[60%] h-[90vh]  bg-white border-l border-slate-200 flex shadow-xl">
          <div className="w-[60%] flex flex-col border-r border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800"> Current Sale </h2>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-slate-500">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </p>
                {parkedSales.length > 0 && (
                  <button
                    onClick={() => setParkedModalOpen(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                  >
                    {parkedSales.length} parked
                  </button>
                )}
              </div>
            </div>
            <div ref={cartListRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p className="text-lg">Cart is empty</p>
                  <p className="text-sm">Scan a product to begin</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="bg-slate-50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate"> {item.name} </p>
                      <p className="text-sm text-slate-500">
                        {item.pricingType === 'weight' ? `${(item.weight ?? 0).toFixed(3)} ${item.unit || 'kg'} × £${item.price.toFixed(2)}/${item.unit || 'kg'}` : `£${item.price.toFixed(2)} each`}
                      </p>
                      {item.pricingType === 'weight' && (
                        <p className="text-xs text-slate-400"> = £{(item.price * (item.weight ?? 0)).toFixed(2)} </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {item.pricingType !== 'weight' && (
                        <>
                          <button
                            onClick={() => updateQty(item._id, -1)}
                            className="w-10 h-10 bg-slate-200 rounded-lg font-bold text-lg hover:bg-slate-300 active:scale-95 transition"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-bold text-lg"> {item.qty} </span>
                          <button
                            onClick={() => updateQty(item._id, 1)}
                            className="w-10 h-10 bg-slate-200 rounded-lg font-bold text-lg hover:bg-slate-300 active:scale-95 transition"
                          >
                            +
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="w-10 h-10 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 active:scale-95 transition ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="w-[40%] flex flex-col bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (excl VAT)</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {Object.entries(vatBreakdown).map(([code, { rate, taxableAmount }]) => (
                <div
                  key={code}
                  className="flex justify-between text-slate-600 text-sm"
                >
                  <span>VAT @ {code} ({rate}%)</span>
                  <span>£{((taxableAmount * rate) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-2xl font-bold text-slate-900 pt-2 border-t border-slate-300">
                <span>Total</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-4 space-y-3 border-t border-slate-300">
              <button
                disabled={cart.length === 0}
                className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-xl hover:bg-green-500 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[60px]"
              >
                Pay by Card
              </button>
              <button
                onClick={handlePayByCash}
                disabled={cart.length === 0}
                className="w-full py-4 bg-blue-600 text-white text-xl font-bold rounded-xl hover:bg-blue-500 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[60px]"
              >
                Pay by Cash
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleHoldSale}
                  disabled={cart.length === 0}
                  className="py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Hold Sale
                </button>
                <button
                  onClick={() => setParkedModalOpen(true)}
                  disabled={parkedSales.length === 0}
                  className="py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Parked ({parkedSales.length})
                </button>
              </div>

              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="w-full py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 active:scale-95 transition disabled:opacity-40 min-h-[44px]"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {cashModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Cash Payment</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter amount received from customer
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-100 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500">Amount Due</p>
                <p className="text-4xl font-bold text-slate-900">
                  £{total.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  Quick Amount
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAmountReceived(amount.toString())}
                      className="py-3 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 active:scale-95 transition min-h-[44px]"
                    >
                      £{amount}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAmountReceived(total.toFixed(2))}
                  className="mt-2 w-full py-3 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 active:scale-95 transition min-h-[44px]"
                >
                  Exact Amount (£{total.toFixed(2)})
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Amount Received (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-4 py-4 text-2xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {parseFloat(amountReceived) >= total && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-700 font-semibold">Change Due</p>
                  <p className="text-3xl font-bold text-green-700">
                    £{(parseFloat(amountReceived) - total).toFixed(2)}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center text-red-700 font-semibold text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setCashModalOpen(false);
                  setAmountReceived('');
                  setError('');
                }}
                disabled={processing}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteCashSale}
                disabled={processing || parseFloat(amountReceived) < total}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 min-h-[44px]"
              >
                {processing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Payment Successful
              </h2>
              <p className="text-slate-500 mb-6">
                Receipt #{completedSale.receiptNumber}
              </p>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-6">
                <div className="flex justify-between text-slate-700">
                  <span>Total</span>
                  <span className="font-bold">
                    £{completedSale.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Received</span>
                  <span className="font-bold">
                    £{completedSale.received.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-green-700 text-lg font-bold pt-2 border-t border-slate-200">
                  <span>Change</span>
                  <span>£{completedSale.change.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCloseSuccess}
                className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-500 min-h-[60px]"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {holdModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Hold Sale</h2>
              <p className="text-sm text-slate-500 mt-1">
                Give this sale a name so you can find it later
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-500">Current cart</p>
                <p className="text-2xl font-bold text-slate-900">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} · £
                  {total.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Label *
                </label>
                <input
                  type="text"
                  value={parkLabel}
                  onChange={(e) => setParkLabel(e.target.value)}
                  placeholder="e.g., Customer 1, Red shirt, Table 5"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmHold()}
                  className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This helps you identify the customer when they return.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center text-red-700 font-semibold text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setHoldModalOpen(false);
                  setParkLabel('');
                  setError('');
                }}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHold}
                disabled={!parkLabel.trim()}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50 min-h-[44px]"
              >
                Hold Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {parkedModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Parked Sales</h2>
              <p className="text-sm text-slate-500 mt-1">
                Click a sale to resume it
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {parkedSales.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  No parked sales
                </div>
              ) : (
                parkedSales.map((p) => (
                  <div
                    key={p.id}
                    className="bg-slate-50 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">
                        {p.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.cart.length} item{p.cart.length !== 1 ? 's' : ''} · £
                        {p.subtotal.toFixed(2)} · held at{' '}
                        {new Date(p.parkedAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleResume(p.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 min-h-[40px]"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete parked sale "${p.label}"?`)) {
                            deleteParkedSale(p.id);
                          }
                        }}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 min-h-[40px]"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setParkedModalOpen(false)}
                className="w-full py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {weightPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                Weigh {weightPrompt.product.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                £{weightPrompt.product.price.toFixed(2)} / {weightPrompt.product.unit || 'kg'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Weight ({(weightPrompt.product.unit || 'kg')}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const w = parseFloat(weightInput);
                      if (Number.isFinite(w) && w > 0) {
                        addWeightedToCart(weightPrompt.product, w);
                        setWeightPrompt(null);
                        setWeightInput('');
                      }
                    }
                  }}
                  placeholder="0.000"
                  autoFocus
                  className="w-full px-4 py-4 text-2xl text-center font-bold rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeightInput(w.toFixed(3))}
                    className="py-3 bg-slate-200 rounded-lg font-bold hover:bg-slate-300 min-h-[44px]"
                  >
                    {w}
                  </button>
                ))}
              </div>

              {weightInput && parseFloat(weightInput) > 0 && (
                <div className="bg-slate-100 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-500">Line total</p>
                  <p className="text-3xl font-bold text-slate-900">
                    £{(weightPrompt.product.price * parseFloat(weightInput)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setWeightPrompt(null);
                  setWeightInput('');
                }}
                className="flex-1 py-3 bg-slate-200 rounded-xl font-semibold hover:bg-slate-300 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const w = parseFloat(weightInput);
                  if (!Number.isFinite(w) || w <= 0) return;
                  addWeightedToCart(weightPrompt.product, w);
                  setWeightPrompt(null);
                  setWeightInput('');
                }}
                disabled={!weightInput || parseFloat(weightInput) <= 0}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 min-h-[44px]"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CashierPage;