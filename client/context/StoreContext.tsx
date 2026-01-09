import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  type ProductOrSubscription,
  type ProductType,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from "react-native-iap";

const SKU_SUBS = [
  "com.spendful.app.premium.monthly",
  "com.spendful.app.premium.yearly",
];
const SKU_LIFETIME = "com.thinktankllc.spendful.premium.lifetime";

type StoreContextType = {
  products: ProductOrSubscription[];
  isPremium: boolean;
  loading: boolean;
  purchase: (sku: string, type: ProductType) => Promise<void>;
  restore: () => Promise<void>;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<ProductOrSubscription[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let updateSub: any;
    let errorSub: any;

    const initIAP = async () => {
      try {
        setLoading(true);

        // 1. Open connection
        await initConnection();

        // 2. Fetch all products including subs & lifetime
        const subs = await fetchProducts({
          skus: [...SKU_SUBS],
          type: "subs",
        });
        const lifetime = await fetchProducts({
          skus: [SKU_LIFETIME],
          type: "in-app",
        });

        const allProducts: ProductOrSubscription[] = [
          ...(subs ?? []),
          ...(lifetime ?? []),
        ];
        setProducts(allProducts);

        // 3. Check existing purchases (restore state if exists)
        await checkPremiumState();

        // 4. Listen for purchase events
        updateSub = purchaseUpdatedListener(async (purchase: any) => {
          try {
            // Finish the transaction
            await finishTransaction({
              purchase,
              isConsumable: false,
            });
          } catch (e) {
            console.warn("finishTransaction error:", e);
          }

          // Check or update premium
          await checkPremiumState();
        });

        errorSub = purchaseErrorListener((error: any) => {
          console.warn("Purchase error:", error);
        });
      } catch (e) {
        console.error("IAP init error:", e);
      } finally {
        setLoading(false);
      }
    };

    initIAP();

    return () => {
      updateSub?.remove();
      errorSub?.remove();
      endConnection();
    };
  }, []);

  // Check entitlements
  const checkPremiumState = async () => {
    try {
      const purchases: any[] = await getAvailablePurchases();
      const hasPremium = purchases.some((p) => p.productId.includes("premium"));
      setIsPremium(hasPremium);
    } catch (e) {
      console.warn("restore check error:", e);
    }
  };

  const purchase = async (sku: string, type: ProductType) => {
    if (Platform.OS === "ios") {
      await requestPurchase({
        request: {
          apple: {
            sku,
          },
        },
        type,
      });
    } else {
      await requestPurchase({
        request: {
          google: {
            skus: [sku],
          },
        },
        type,
      });
    }
  };

  const restore = async () => {
    await checkPremiumState();
  };

  return (
    <StoreContext.Provider
      value={{ products, isPremium, loading, purchase, restore }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
