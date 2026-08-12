import { useParams } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import ProductDetailModal from '../../components/public/ProductDetailModal';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  return (
    <>
    
      {/* Reuses the exact same modal content, giving a real shareable /product/:id URL */}
      <ProductDetailModal productId={id} onClose={() => window.history.back()} />
      
    </>
  );
}