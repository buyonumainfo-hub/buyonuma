<<<<<<< HEAD
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MessageCircle, User, LogOut, Info, Phone, Code, ShoppingCart, Users } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import MessagesPanel from '../../components/messaging/MessagesPanel';
import AppTabBar from '../../components/shared/AppTabBar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';


export default function BuyerDashboard({tab, setTab}) {
  const { buyer, isAuthenticated, loading, logout } = useBuyerAuth();
  const navigate = useNavigate();


  const handleLogout = () => { logout(); navigate('/'); };

  const primaryTabs = [
    { to: '/', icon: ShoppingCart, label: 'Marketplace', onClick: () => navigate('/') },
    { to: '/sellers', icon: Users, label: 'Sellers', onClick: () => navigate('/sellers') },
    { to: 'Messages', icon: MessageCircle, label: 'Messages', onClick: () => setTab('Messages') },
    { to: 'Profile', icon: User, label: 'Profile', onClick: () => setTab('Profile') },
  ];
  const moreTabs = [
    { to: '/about', icon: Info, label: 'About' },
    { to: '/contact', icon: Phone, label: 'Contact' },
    { to: '/developer', icon: Code, label: 'Developer' },
  ];

  return (
    <>
      <AppTabBar items={primaryTabs} moreItems={moreTabs} onLogout={handleLogout} activeOverride={tab} />
    </>
  );
}
=======
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MessageCircle, User, LogOut, Info, Phone, Code, ShoppingCart, Users } from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import MessagesPanel from '../../components/messaging/MessagesPanel';
import AppTabBar from '../../components/shared/AppTabBar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';


export default function BuyerDashboard({tab, setTab}) {
  const { buyer, isAuthenticated, loading, logout } = useBuyerAuth();
  const navigate = useNavigate();


  const handleLogout = () => { logout(); navigate('/'); };

  const primaryTabs = [
    { to: '/', icon: ShoppingCart, label: 'Marketplace', onClick: () => navigate('/') },
    { to: '/sellers', icon: Users, label: 'Sellers', onClick: () => navigate('/sellers') },
    { to: 'Messages', icon: MessageCircle, label: 'Messages', onClick: () => setTab('Messages') },
    { to: 'Profile', icon: User, label: 'Profile', onClick: () => setTab('Profile') },
  ];
  const moreTabs = [
    { to: '/about', icon: Info, label: 'About' },
    { to: '/contact', icon: Phone, label: 'Contact' },
    { to: '/developer', icon: Code, label: 'Developer' },
  ];

  return (
    <>
      <AppTabBar items={primaryTabs} moreItems={moreTabs} onLogout={handleLogout} activeOverride={tab} />
    </>
  );
}
>>>>>>> b403b42571a91fae11e3332f19cf5691d2aba20a
