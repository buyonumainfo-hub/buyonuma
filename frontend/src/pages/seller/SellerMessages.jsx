import SellerLayout from '../../components/seller/SellerLayout';
import MessagesPanel from '../../components/messaging/MessagesPanel';

export default function SellerMessages() {
  return (
    <SellerLayout title="Messages">
      <div className="seller-dash fade-up">
        <MessagesPanel authRole="seller" myUnreadKey="sellerUnread" />
      </div>
    </SellerLayout>
  );
}
