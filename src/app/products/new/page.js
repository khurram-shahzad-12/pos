'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddProductPage() {
  const router = useRouter();
  const barcodeRef = useRef(null);

  const [form, setForm] = useState({
    barcode: '',
    name: '',
    price: '',
    stock: '',
    category: '',
    vatCode: 'S',
    vatRate: 20,
    pricingType: 'unit',
    unit: 'each',    
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-focus barcode field so scanner types directly here
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);
  
  const handleChange = (e) => {
  const { name, value } = e.target;
  setForm((prev) => {
    if (name === 'pricingType') {
      return {
        ...prev,
        pricingType: value,
        unit: value === 'weight' ? (prev.unit === 'each' ? 'kg' : prev.unit) : 'each',
      };
    }
    return { ...prev, [name]: value };
  });
};
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!form.barcode.trim()) {
      setError('Barcode is required. Scan or type it.');
      barcodeRef.current?.focus();
      return;
    }
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setError('Price must be greater than 0.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          price: Number(form.price),
          stock: Number(form.stock) || 0,
          category: form.category.trim() || undefined,
          vatCode: form.vatCode,
          vatRate: Number(form.vatRate),
          pricingType: form.pricingType,
          unit: form.pricingType === 'weight' ? (form.unit || 'kg') : 'each',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setSuccess('Product added successfully!');
      setTimeout(() => router.push('/products'), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ barcode: '', name: '', price: '', stock: '', category: '', vatCode: 'S', vatRate: 20, pricingType: 'unit', unit: 'each',});
    setError('');
    setSuccess('');
    barcodeRef.current?.focus();
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition min-h-[44px] flex items-center"
          >
            ← Back to Products
          </Link>
          <h1 className="text-2xl font-bold">Add New Product</h1>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500 text-white px-6 py-3 text-center font-semibold">
          {success}
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8 space-y-6"
        >
          {/* Barcode */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Barcode *
            </label>
            <input
              ref={barcodeRef}
              type="text"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Scan barcode or type manually..."
              className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              Scan the product barcode. The scanner types directly into this
              field.
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Coca Cola 330ml"
              className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Price (£) *
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="1.50"
                className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                min="0"
                placeholder="100"
                className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
  <label className="block text-sm font-semibold text-slate-700 mb-2">
    Pricing Type
  </label>
  <div className="flex gap-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="pricingType"
        value="unit"
        checked={form.pricingType === 'unit'}
        onChange={handleChange}
      />
      <span>Unit (per each)</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="pricingType"
        value="weight"
        checked={form.pricingType === 'weight'}
        onChange={handleChange}
      />
      <span>Weight (per kg)</span>
    </label>
  </div>
</div>

{form.pricingType === 'weight' && (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      Unit
    </label>
    <select
      name="unit"
      value={form.unit || 'kg'}
      onChange={handleChange}
      className="w-full px-4 py-3 rounded-xl border-2 border-slate-300"
    >
      <option value="kg">Kilograms (kg)</option>
      <option value="g">Grams (g)</option>
      <option value="L">Litres (L)</option>
    </select>
  </div>
)}

<div>
  <label className="block text-sm font-semibold text-slate-700 mb-2">
    Price {form.pricingType === 'weight' ? `(per ${form.unit || 'kg'})` : '(each)'}
  </label>
  <input
    type="number"
    step="0.01"
    name="price"
    value={form.price}
    onChange={handleChange}
    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300"
  />
</div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Drinks, Snacks, Household"
              className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
  <label className="block text-sm font-semibold text-slate-700 mb-2">
    VAT Rate *
  </label>
  <select
    name="vatCode"
    value={form.vatCode}
    onChange={(e) => {
      const code = e.target.value;
      const rateMap = { S: 20, Z: 0, R: 5, E: 0 };
      setForm((prev) => ({
        ...prev,
        vatCode: code,
        vatRate: rateMap[code],
      }));
    }}
    className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
  >
    <option value="S">S — Standard Rate (20%) — Snacks, drinks, alcohol</option>
    <option value="Z">Z — Zero Rate (0%) — Fresh food, veg, meat, bread</option>
    <option value="R">R — Reduced Rate (5%) — Energy-saving items</option>
    <option value="E">E — Exempt (0%) — Some services, insurance</option>
  </select>
  <p className="text-xs text-slate-500 mt-1">
    Stored as <code>{form.vatCode}</code> — shows on receipts and reports.
  </p>
</div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-500 active:scale-95 transition disabled:opacity-50 min-h-[60px]"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-8 py-4 bg-slate-200 text-slate-700 text-lg font-semibold rounded-xl hover:bg-slate-300 active:scale-95 transition disabled:opacity-50 min-h-[60px]"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}