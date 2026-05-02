'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EmptyCart, CartItems } from '@/features/cart/components';
import { hydrateCart, selectCartItems } from '@/lib/redux/slices/cartSlice/cartSlice';
import CmsBannerSlider from '@/components/cms/CmsBannerSlider';

export default function CartPage() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);

  // Hydrate from localStorage on mount in case the store was created before storage was readable.
  useEffect(() => {
    dispatch(hydrateCart());
  }, [dispatch]);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* CMS slot: cart-top — promo / discount banners for users mid-checkout. */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <CmsBannerSlider position="cart-top" />
      </div>
      {items.length > 0 ? <CartItems /> : <EmptyCart />}
    </div>
  );
}
