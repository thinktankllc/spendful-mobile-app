import React, { createContext, useContext, useEffect, useState } from "react";
import * as RNIap from "react-native-iap";

const productIds = [
  "com.spendful.app.premium.monthly",
  "com.spendful.app.premium.yearly",
  "com.spendful.app.premium.lifetime",
];

type StoreContextType = {
  products: RNIap.Product[];
  isPremium: boolean;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [products, setProducts] = useState<RNIap.Product[]>([]);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await RNIap.initConnection();
    const items = await RNIap.getProducts({ skus: productIds });
    setProducts(items);
    await checkEntitlements();
  };

  const purchase = async (productId: string) => {
    await RNIap.requestPurchase({ sku: productId });
    await checkEntitlements();
  };

  const restore = async () => {
    await checkEntitlements();
  };

  const checkEntitlements = async () => {
    const purchases = await RNIap.getAvailablePurchases();

    const hasPremium = purchases.some((p) => p.productId.includes("premium"));

    setIsPremium(hasPremium);
  };

  return (
    <StoreContext.Provider value={{ products, isPremium, purchase, restore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
