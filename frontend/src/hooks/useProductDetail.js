import { useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

export default function useProductDetail(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedPagination, setRelatedPagination] = useState(null);
  const [loadingMoreRelated, setLoadingMoreRelated] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/products/${id}`);
      setData(res.data);
      setRelatedProducts(res.data.relatedProducts || []);
      setRelatedPage(1);
      setRelatedPagination(null);
      if (res.data.product?.seller?._id) {
        const rRes = await api.get(`/reviews/seller/${res.data.product.seller._id}`);
        setReviews(rRes.data.reviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadMoreRelated = async () => {
    setLoadingMoreRelated(true);
    try {
      const nextPage = relatedPage + 1;
      const res = await api.get(`/products/${id}/related`, { params: { page: nextPage, limit: 8 } });
      setRelatedProducts(prev => [...prev, ...(res.data.relatedProducts || [])]);
      setRelatedPagination(res.data.pagination);
      setRelatedPage(nextPage);
    } catch (err) {
      throw err;
    } finally {
      setLoadingMoreRelated(false);
    }
  };

  return {
    data, loading, reviews,
    relatedProducts, relatedPagination, loadingMoreRelated,
    loadMoreRelated,
  };
}