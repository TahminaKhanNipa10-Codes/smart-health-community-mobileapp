import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Clock, 
  User, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';

export interface ArticleRecord {
  id: string;
  title: string;
  category: string;
  readTime: string;
  image: string;
  excerpt: string;
  content: string;
  author: string;
  createdAt?: any;
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isAdding, setIsAdding] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleRecord | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    category: 'Wellness',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600',
    excerpt: '',
    content: '',
    author: 'Smart Health Medical Editorial Team'
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'articles'));
      const list: ArticleRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ArticleRecord);
      });

      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setArticles(list);
    } catch (err: any) {
      console.error('Error fetching articles:', err);
      setError('Failed to fetch health articles library.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const payload = {
        ...formData,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'articles'), payload);
      setArticles((prev) => [{ id: ref.id, ...payload }, ...prev]);
      setSuccess('Health article published successfully!');
      setIsAdding(false);
      setFormData({
        title: '',
        category: 'Wellness',
        readTime: '4 min read',
        image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600',
        excerpt: '',
        content: '',
        author: 'Smart Health Medical Editorial Team'
      });
    } catch (err: any) {
      console.error('Error creating article:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'articles');
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to publish article.');
      }
    }
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'articles', editingArticle.id), {
        title: editingArticle.title,
        category: editingArticle.category,
        readTime: editingArticle.readTime,
        image: editingArticle.image,
        excerpt: editingArticle.excerpt,
        content: editingArticle.content,
        author: editingArticle.author,
        updatedAt: serverTimestamp()
      });

      setArticles((prev) =>
        prev.map((a) => (a.id === editingArticle.id ? { ...editingArticle } : a))
      );
      setSuccess('Article updated successfully.');
      setEditingArticle(null);
    } catch (err: any) {
      console.error('Error updating article:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `articles/${editingArticle.id}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to update article.');
      }
    }
  };

  const handleDeleteArticle = async (articleId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete article "${title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'articles', articleId));
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      setSuccess('Article deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting article:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `articles/${articleId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete article.');
      }
    }
  };

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Medical Knowledge & Health Articles
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Publish educational articles, health tips, preventive care guidelines, and medical updates for community members.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchArticles}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            id="btn-add-new-article"
          >
            <Plus className="w-4 h-4" /> Publish Article
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search article title, excerpt, category, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            id="input-search-admin-articles"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="Wellness">Wellness</option>
          <option value="Nutrition">Nutrition</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Mental Health">Mental Health</option>
          <option value="Pediatrics">Pediatrics</option>
        </select>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading articles...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No articles found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Article</th>
                  <th className="p-4">Category & Read Time</th>
                  <th className="p-4">Author</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredArticles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={art.image || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200'}
                          alt={art.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm line-clamp-1">{art.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{art.excerpt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                        {art.category || 'General'}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {art.readTime || '3 min read'}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {art.author || 'Editorial Team'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingArticle(art)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Edit Article"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(art.id, art.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Article"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateArticle} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Publish Health Article</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Article Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 10 Essential Daily Habits for Heart Health"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Read Time</label>
                  <input
                    type="text"
                    value={formData.readTime}
                    onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief 1-2 sentence preview..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-16"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Article Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed article body text..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-28"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer text-xs shadow-sm"
              >
                Publish Article
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleUpdateArticle} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Article</h3>
              <button type="button" onClick={() => setEditingArticle(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Article Title</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Excerpt</label>
                <textarea
                  value={editingArticle.excerpt}
                  onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 h-16"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer text-xs shadow-sm"
              >
                Save Article Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
