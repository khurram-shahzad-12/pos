// app/products/page.js
'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopBar from '@/components/TopBar';
import Link from 'next/link';

function ProductsList() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      setDeleteId(id);
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError('Failed to delete product');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-slate-100">
  <TopBar title='Products' actions={<Link href={'/products/new'} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 transition min-h-[44px] flex items-center font-bold"> + Add Product</Link>}/>
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          {error}
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6 text-sm">
        <span className="text-slate-600">
          Total Products: <strong className="text-slate-900">{products.length}</strong>
        </span>
        <span className="text-slate-600">
          Showing: <strong className="text-slate-900">{filtered.length}</strong>
        </span>
        <span className="text-slate-600">
          Low Stock:{' '}
          <strong className="text-red-600">
            {products.filter((p) => p.stock <= 5).length}
          </strong>
        </span>
      </div>

      {/* Search */}
      <div className="p-4 bg-slate-100">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, barcode, or category..."
          className="w-full px-6 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-white shadow-sm"
        />
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            Loading products...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-xl mb-2">No products found</p>
            <Link
              href="/products/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product._id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-slate-600">
                      {product.barcode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.category || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                      £{product.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          product.stock <= 5
                            ? 'bg-red-100 text-red-700'
                            : product.stock <= 20
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/products/${product._id}`}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-semibold min-h-[40px] flex items-center"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(product._id)}
                          disabled={deleteId === product._id}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-semibold min-h-[40px] disabled:opacity-50"
                        >
                          {deleteId === product._id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


export default function ProductsPage() {
  return (
    <ProtectedRoute requiredPermissions={['read:products']}>
      <ProductsList />
    </ProtectedRoute>
  );
}