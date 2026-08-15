import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { 
  MessageSquare, 
  Search, 
  RefreshCw, 
  User, 
  Heart, 
  MessageCircle, 
  AlertCircle, 
  Check, 
  X, 
  Eye, 
  Trash2 
} from 'lucide-react';

export interface PostRecord {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  category?: string;
  likes?: string[];
  commentsCount?: number;
  createdAt?: any;
}

export interface CommentRecord {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  text: string;
  createdAt?: any;
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected post for viewing comments
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const snap = await getDocs(collection(db, 'posts'));
      const list: PostRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PostRecord);
      });

      // Sort newest first
      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setPosts(list);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch community posts.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewComments = async (post: PostRecord) => {
    try {
      setSelectedPost(post);
      setLoadingComments(true);
      const q = query(collection(db, 'comments'), where('postId', '==', post.id));
      const snap = await getDocs(q);
      const list: CommentRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CommentRecord);
      });

      list.sort((a, b) => {
        const tA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      setComments(list);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this community post? This action cannot be undone.')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'posts', postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSuccess('Post deleted successfully from forum.');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete post.');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await deleteDoc(doc(db, 'comments', commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setSuccess('Comment deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
      } catch (fErr: any) {
        setError(fErr.message || 'Failed to delete comment.');
      }
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      (p.authorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-600" /> Community Forum Moderation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review user discussions, check post engagements, moderate inappropriate content, and delete reported comments.
          </p>
        </div>
        <button
          onClick={fetchPosts}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Forum
        </button>
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
            placeholder="Search post content, author name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
            id="input-search-admin-posts"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="General">General</option>
          <option value="Nutrition">Nutrition</option>
          <option value="Mental Health">Mental Health</option>
          <option value="Fitness">Fitness</option>
          <option value="Doctor Q&A">Doctor Q&A</option>
        </select>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading community posts...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No posts found matching search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-4">Author</th>
                  <th className="p-4">Content Excerpt</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Reactions & Comments</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {post.authorName || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-slate-400">UID: {post.userId}</div>
                    </td>
                    <td className="p-4 text-slate-700 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{post.content}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-[11px] border border-teal-200">
                        {post.category || 'General'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-rose-600">
                          <Heart className="w-3.5 h-3.5" /> {(post.likes || []).length}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-600">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewComments(post)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="View Comments"
                        >
                          <Eye className="w-3.5 h-3.5" /> Comments
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
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

      {/* View Comments Drawer / Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Post Comments Moderate</h3>
                <p className="text-xs text-slate-500 truncate max-w-md">"{selectedPost.content.substring(0, 60)}..."</p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {loadingComments ? (
                <div className="text-center py-8 text-slate-400">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No comments found for this post.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{c.authorName || 'User'}</div>
                      <p className="text-slate-700 leading-relaxed">{c.text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                      title="Delete Comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
