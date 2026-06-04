/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Search,
  List,
  LayoutGrid,
  Sparkles,
  Check,
  ArrowRight,
  ShoppingCart,
  Smartphone,
  X,
  Download,
  Laptop,
  Lock,
  Info,
  ShoppingBag,
} from "lucide-react";

import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { CartSidebar } from "./components/CartSidebar";
import { CheckoutView } from "./components/CheckoutView";
import { AdminPanel } from "./components/AdminPanel";
import { Toast } from "./components/Toast";

import { Product, Addon, CartItem, StoreConfig, ClientProfile, Order } from "./types";
import { DEFAULT_PRODUCTS, DEFAULT_ADDONS, DEFAULT_STORE_CONFIG } from "./data";
import { safeStorage, calculateDynamicFreight, formatBRL, formatCEP, fetchAddressByCEP, getCartItemTotalPrice, getCartItemSinglePrice, isStoreOpen } from "./utils";

const ADMIN_PASSWORD_HASH = "enki2026";

export default function App() {
  // Main states
  const [view, setView] = useState<"menu" | "checkout" | "admin">("menu");
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"list" | "grid">("grid");

  // State caches loaded from Safe Failover Layer
  const [config, setConfig] = useState<StoreConfig>(() => {
    const saved = safeStorage.getItem("cardapio_config");
    let parsed = saved ? JSON.parse(saved) : { ...DEFAULT_STORE_CONFIG };
    
    // Auto-migrate/heal supabase config
    let updatedConfig = false;
    if (!parsed.supabaseUrl || parsed.supabaseUrl === "") {
      parsed.supabaseUrl = DEFAULT_STORE_CONFIG.supabaseUrl;
      updatedConfig = true;
    }
    if (!parsed.supabaseKey || parsed.supabaseKey === "") {
      parsed.supabaseKey = DEFAULT_STORE_CONFIG.supabaseKey;
      updatedConfig = true;
    }
    if (parsed.mpPubKey && parsed.mpPubKey.includes("sb_publishable")) {
      parsed.mpPubKey = "";
      updatedConfig = true;
    }

    // Auto-migrate/heal the specific case where the store address is updated but GPS pointers are legacy
    if (
      (parsed.storeAddress === "R. Luis de Oliveira Bulhões, 564" || parsed.storeAddress === "Ruan Luis de Oliveira Bulhões, 564" || parsed.storeAddress === "R. Luis de Oliveira Bulhões, 564 - Vila Albertina" || parsed.storeAddress === "Rua Luis de Oliveira Bulhões, 564") &&
      parsed.storeLat === "-23.564551" &&
      parsed.storeLon === "-46.652150"
    ) {
      parsed.storeLat = "-23.4477784";
      parsed.storeLon = "-46.6076214";
      updatedConfig = true;
    }
    
    if (updatedConfig) {
      safeStorage.setItem("cardapio_config", JSON.stringify(parsed));
    }
    return parsed;
  });

  const [produtos, setProdutos] = useState<Product[]>([]);

  const [adicionais, setAdicionais] = useState<Addon[]>([]);

  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(() => {
    const saved = safeStorage.getItem("enki_cliente_sessao");
    return saved ? JSON.parse(saved) : null;
  });

  const [ordersHistory, setOrdersHistory] = useState<Order[]>(() => {
    const saved = safeStorage.getItem("orders_history");
    return saved ? JSON.parse(saved) : [];
  });

  // Automation preferences
  const [autoPrintActive, setAutoPrintActive] = useState<boolean>(() => {
    return safeStorage.getItem("enki_auto_print") === "true";
  });
  const [soundAlertActive, setSoundAlertActive] = useState<boolean>(() => {
    return safeStorage.getItem("enki_sound_alert") !== "false";
  });

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playDoubleRing = (offset: number) => {
        const now = audioCtx.currentTime + offset;

        // Custom function to create a modulated tone representing a high-pitched phone ringer ring
        const createRingOscillator = (freq: number, start: number, end: number) => {
          const osc = audioCtx.createOscillator();
          const lfo = audioCtx.createOscillator();
          const lfoGain = audioCtx.createGain();
          const gainNode = audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);

          // 20Hz rapid frequency vibration for that iconic phone ringer "trrrrrr"
          lfo.type = "square";
          lfo.frequency.setValueAtTime(20, start);
          lfoGain.gain.setValueAtTime(45, start);

          // Envelope modeling clear solid sound with smooth rise and fall
          gainNode.gain.setValueAtTime(0, start);
          gainNode.gain.linearRampToValueAtTime(0.35, start + 0.05); // slightly louder max volume (0.35)
          gainNode.gain.setValueAtTime(0.35, end - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, end);

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);

          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          lfo.start(start);
          lfo.stop(end);
          osc.start(start);
          osc.stop(end);
        };

        // Standard double-ring pattern:
        // Ring 1: starts at 'now', ends 0.7s later
        // Ring 2: starts 0.9s later, ends 1.6s later (0.2s pause in between)
        // Tune with harmonious third (550Hz and 680Hz) to represent a multi-note loud electronic bell
        createRingOscillator(550, now, now + 0.7);
        createRingOscillator(685, now, now + 0.7);

        createRingOscillator(550, now + 0.9, now + 1.6);
        createRingOscillator(685, now + 0.9, now + 1.6);
      };

      // Sound the double-ring sequence 4 times, spaced by 3 seconds (approx 12 seconds total incoming ring alarm)
      for (let i = 0; i < 4; i++) {
        playDoubleRing(i * 3.0);
      }
    } catch (e) {
      console.warn("Audio Context blocked or unsupported:", e);
    }
  };

  const printDirectDbOrder = (dbItem: any) => {
    const orderId = dbItem.gateway_id || `PED-${dbItem.id || Math.floor(1000 + Math.random() * 9000)}`;
    const dataHora = dbItem.created_at ? new Date(dbItem.created_at).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR");
    
    const receipt = `
      <pre>
----------------------------------------
             ${config.storeName.toUpperCase()}
----------------------------------------
PEDIDO: ${orderId}
DATA: ${dataHora}
CLIENTE: ${(dbItem.nome || "Não informado").toUpperCase()}
TEL: ${dbItem.telefone || "Não informado"}
ENDEREÇO: ${(dbItem.endereco || "RETIRADA NO BALCÃO").toUpperCase()}
----------------------------------------
${dbItem.pedido_detalhes || ""}
----------------------------------------
TOTAL: ${formatBRL(Number(dbItem.total_pedido || 0))}
----------------------------------------
      </pre>
    `;
    setReceiptHtml(receipt);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Shopping cart operations
  const [carrinho, setCarrinho] = useState<Record<string, CartItem>>({});

  // Operational logistic attributes
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"entrega" | "retirada">("entrega");

  // Cloud sync credentials client definition
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<"disconnected" | "connected" | "error">("disconnected");

  // Authentication statuses
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [isAppStandalone, setIsAppStandalone] = useState(false);

  // Layout overlay modals
  const [activeProductDetail, setActiveProductDetail] = useState<Product | null>(null);
  const [productDetailNotes, setProductDetailNotes] = useState("");
  const [productDetailQty, setProductDetailQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [upsellQuantities, setUpsellQuantities] = useState<Record<string, number>>({});
  const [reviewOrderModalOpen, setReviewOrderModalOpen] = useState(false);

  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  const [clientLoginOpen, setClientLoginOpen] = useState(false);
  const [clientRegisterOpen, setClientRegisterOpen] = useState(false);
  
  // Local bindings for authentication fields
  const [loginPhone, setLoginPhone] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regName, setRegName] = useState("");
  const [regCep, setRegCep] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regNeighborhood, setRegNeighborhood] = useState("");
  const [regReferencia, setRegReferencia] = useState("");

  // Receipt printed buffer state
  const [receiptHtml, setReceiptHtml] = useState("");

  // Alerts feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // General Global Modal triggers
  const [generalModal, setGeneralModal] = useState<{
    title: string;
    body: React.ReactNode;
    actions: React.ReactNode;
  } | null>(null);

  // Effects 1: Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registrado com sucesso!", reg))
        .catch((err) => console.error("Falha ao registrar Service Worker do PWA:", err));
    }
  }, []);

  // Listen to beforeinstallprompt event and check for standalone mode
  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Optional toast alerting PWA is ready for premium install
      console.log("PWA antes do prompt interceptado e guardado!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforePrompt);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIsAppStandalone(!!isStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
    };
  }, []);

  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          showToast("Obrigado por instalar o aplicativo!", "success");
        }
      } catch (err) {
        setShowPwaInstallModal(true);
      }
    } else {
      setShowPwaInstallModal(true);
    }
  };

  // Effects 2: Router lookup listener
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === "#admin" || hash === "#/admin") {
        if (!adminAuthenticated) {
          setAdminAuthModalOpen(true);
        } else {
          setView("admin");
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [adminAuthenticated]);

  // Global Escape key down listener for all popups and modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (generalModal) {
          setGeneralModal(null);
        } else if (activeProductDetail) {
          setActiveProductDetail(null);
          setProductDetailNotes("");
          setProductDetailQty(1);
          setSelectedAddons({});
        } else if (reviewOrderModalOpen) {
          setReviewOrderModalOpen(false);
        } else if (showPwaInstallModal) {
          setShowPwaInstallModal(false);
        } else if (adminAuthModalOpen) {
          setAdminAuthModalOpen(false);
        } else if (clientLoginOpen) {
          setClientLoginOpen(false);
        } else if (clientRegisterOpen) {
          setClientRegisterOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    generalModal,
    activeProductDetail,
    reviewOrderModalOpen,
    showPwaInstallModal,
    adminAuthModalOpen,
    clientLoginOpen,
    clientRegisterOpen,
  ]);

  // Touch Swipe Gesture State variables for dismissing overlays easily!
  const touchStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };
  };

  const createTouchEndHandler = (onSwipeDismiss: () => void) => (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartRef.current.x;
    const diffY = endY - touchStartRef.current.y;

    // Direct sideways swipe (left/right) >= 120px OR downward swipe >= 120px resets the overlay!
    if (Math.abs(diffX) > 120 || diffY > 120) {
      onSwipeDismiss();
    }
  };

  // Effects 3: Sync credentials verification
  useEffect(() => {
    // Hardcoded per user request to avoid issues with local DB or missing process.envs
    const sUrl = "https://amylompetctxeaeyioig.supabase.co";
    const sKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWxvbXBldGN0eGVhZXlpb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc1ODAsImV4cCI6MjA5NTQ4MzU4MH0.KhQEC-EcfMQXiJ0KBg0nHM-1U1etJUHjIy524cVpKU4";

    if (sUrl && sKey) {
      try {
        const client = createClient(sUrl, sKey);
        setSupabaseClient(client);
        setSupabaseStatus("connected");

        // Load all remote data asynchronously
        fetchRemoteData(client);

        // Subscription real-time webhook rules
        const subscription = client
          .channel("realtime-orders-sync")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "clientes_pedidos" },
            (payload: any) => {
              showToast("Novo pedido recebido via site!", "success");
              
              // Executa o aviso sonoro se habilitado
              if (safeStorage.getItem("enki_sound_alert") !== "false") {
                playNotificationSound();
              }
              
              // Executa a auto-impressão se habilitada
              if (safeStorage.getItem("enki_auto_print") === "true" && payload && payload.new) {
                printDirectDbOrder(payload.new);
              }

              // Sincroniza localmente o histórico do aplicativo
              fetchRemoteOrders(client);
            }
          )
          .subscribe();

        return () => {
          client.removeChannel(subscription);
        };
      } catch (err) {
        setSupabaseStatus("error");
      }
    } else {
      setSupabaseClient(null);
      setSupabaseStatus("disconnected");
    }
  }, []);

  const fetchRemoteData = async (client: any) => {
    // 1. Fetch config (loja_config)
    try {
      const { data: configData, error: configErr } = await client
        .from("loja_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (configData && !configErr) {
        const mappedConfig: StoreConfig = {
          whatsapp: configData.whatsapp || config.whatsapp,
          supabaseUrl: configData.supabase_url || config.supabaseUrl || "",
          supabaseKey: configData.supabase_key || config.supabaseKey || "",
          ifoodBase: Number(configData.ifood_base) || config.ifoodBase,
          ifoodKm: Number(configData.ifood_km) || config.ifoodKm,
          mpPubKey: (configData.mp_pub_key && configData.mp_pub_key.includes("sb_publishable")) ? "" : (configData.mp_pub_key || config.mpPubKey || ""),
          mpAccessToken: configData.mp_access_token || config.mpAccessToken || "",
          storeName: configData.store_name || config.storeName,
          storeLogoUrl: configData.store_logo_url || config.storeLogoUrl || "",
          storeAddress: configData.store_address || config.storeAddress,
          storeLat: configData.store_lat || config.storeLat,
          storeLon: configData.store_lon || config.storeLon,
          businessHours: configData.business_hours
            ? (typeof configData.business_hours === "string" ? JSON.parse(configData.business_hours) : configData.business_hours)
            : (config.businessHours || DEFAULT_STORE_CONFIG.businessHours),
          productOrder: configData.product_order
            ? (typeof configData.product_order === "string" ? JSON.parse(configData.product_order) : configData.product_order)
            : (config.productOrder || []),
          notificationWebhook: configData.notification_webhook !== undefined 
            ? configData.notification_webhook 
            : (config.notificationWebhook || ""),
        };
        setConfig(mappedConfig);
        safeStorage.setItem("cardapio_config", JSON.stringify(mappedConfig));
      }
    } catch (err) {
      console.error("Erro ao carregar loja_config:", err);
    }

    // 2. Fetch products (hamburgueria_produtos)
    try {
      const { data: productsData, error: prodErr } = await client
        .from("hamburgueria_produtos")
        .select("*");

      if (productsData && !prodErr && productsData.length > 0) {
        const mappedProducts: Product[] = productsData.map((p: any) => ({
          id: p.id,
          categoria: p.categoria,
          nome: p.nome,
          descricao: p.descricao || "",
          preco: Number(p.preco),
          img: p.img || "",
          adicionaisPermitidos: p.adicionais_permitidos || [],
          isActive: p.is_active !== undefined ? !!p.is_active : true
        }));
        setProdutos(mappedProducts);
      } else {
        // If Supabase is totally empty, we might want to populate it with defaults, 
        // but for now let's just stick to what we have in state
      }
    } catch (err) {
      console.error("Erro ao carregar hamburgueria_produtos:", err);
    }

    // 3. Fetch additionals (hamburgueria_adicionais)
    try {
      const { data: addonsData, error: addonErr } = await client
        .from("hamburgueria_adicionais")
        .select("*");

      if (addonsData && !addonErr && addonsData.length > 0) {
        const mappedAddons: Addon[] = addonsData.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          preco: Number(a.preco),
          ativo: !!a.ativo
        }));
        setAdicionais(mappedAddons);
      }
    } catch (err) {
      console.error("Erro ao carregar hamburgueria_adicionais:", err);
    }

    // 4. Fetch orders history
    await fetchRemoteOrders(client);
  };

  const fetchRemoteOrders = async (client: any) => {
    try {
      const { data } = await client
        .from("clientes_pedidos")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        // Map and append to local order cache lists with dynamic sequence starting from 1
        const mapped: Order[] = data.map((item: any, index: number) => ({
          id: `PED-${index + 1}`,
          dataHora: new Date(item.created_at).toLocaleString("pt-BR"),
          nome: item.nome,
          telefone: item.telefone,
          rua: item.endereco ? (item.endereco.split("-")[0]?.trim() || "") : "",
          numero: "",
          bairro: "",
          cep: "",
          resumoItensString: item.pedido_detalhes,
          total: item.total_pedido,
          subtotal: item.total_pedido,
          frete: 0,
          pagamento: "Online",
          gatewayId: item.id?.toString() || "",
          gatewayStatus: item.gateway_status || "Aprovado",
          detalhesEstruturados: [],
        }));
        
        // Reverse so that the latest orders (highest numbers) are always shown at the top
        const reversed = [...mapped].reverse();
        setOrdersHistory(reversed);
        safeStorage.setItem("orders_history", JSON.stringify(reversed));
      }
    } catch {
      // Ignored: silent local fallback
    }
  };

  // State modifiers with asynchronous Supabase integration
  const handleSaveConfig = async (updated: StoreConfig) => {
    setConfig(updated);
    safeStorage.setItem("cardapio_config", JSON.stringify(updated));

    if (supabaseClient) {
      try {
        let { error } = await supabaseClient
          .from("loja_config")
          .upsert({
            id: 1,
            whatsapp: updated.whatsapp,
            supabase_url: updated.supabaseUrl || "",
            supabase_key: updated.supabaseKey || "",
            ifood_base: updated.ifoodBase,
            ifood_km: updated.ifoodKm,
            mp_pub_key: updated.mpPubKey || "",
            mp_access_token: updated.mpAccessToken || "",
            store_name: updated.storeName,
            store_logo_url: updated.storeLogoUrl || "",
            store_address: updated.storeAddress,
            store_lat: updated.storeLat,
            store_lon: updated.storeLon,
            business_hours: updated.businessHours ? JSON.stringify(updated.businessHours) : null,
            product_order: updated.productOrder ? JSON.stringify(updated.productOrder) : null,
            notification_webhook: updated.notificationWebhook || null,
          });

        if (error && (error.message?.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
          console.warn("Coluna product_order ou business_hours não existe no Supabase. Tentando sem product_order...");
          let { error: retryError } = await supabaseClient
            .from("loja_config")
            .upsert({
              id: 1,
              whatsapp: updated.whatsapp,
              supabase_url: updated.supabaseUrl || "",
              supabase_key: updated.supabaseKey || "",
              ifood_base: updated.ifoodBase,
              ifood_km: updated.ifoodKm,
              mp_pub_key: updated.mpPubKey || "",
              mp_access_token: updated.mpAccessToken || "",
              store_name: updated.storeName,
              store_logo_url: updated.storeLogoUrl || "",
              store_address: updated.storeAddress,
              store_lat: updated.storeLat,
              store_lon: updated.storeLon,
              business_hours: updated.businessHours ? JSON.stringify(updated.businessHours) : null,
            });
          
          if (retryError && (retryError.message?.includes("column") || retryError.code === "PGRST204" || retryError.code === "42703")) {
            console.warn("Coluna business_hours também não existe. Tentando salvar apenas campos padrão.");
            const { error: finalError } = await supabaseClient
              .from("loja_config")
              .upsert({
                id: 1,
                whatsapp: updated.whatsapp,
                supabase_url: updated.supabaseUrl || "",
                supabase_key: updated.supabaseKey || "",
                ifood_base: updated.ifoodBase,
                ifood_km: updated.ifoodKm,
                mp_pub_key: updated.mpPubKey || "",
                mp_access_token: updated.mpAccessToken || "",
                store_name: updated.storeName,
                store_logo_url: updated.storeLogoUrl || "",
                store_address: updated.storeAddress,
                store_lat: updated.storeLat,
                store_lon: updated.storeLon,
              });
            error = finalError;
          } else {
            error = retryError;
          }
        }

        if (error) {
          console.error("Erro de sincronização da loja_config no Supabase:", error);
          showToast(`Salvo localmente. Erro Supabase: ${error.message || "Desconhecido"}`, "error");
        } else {
          showToast("Configurações sincronizadas com Supabase!", "success");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveProduct = async (updated: Product) => {
    setProdutos((prev) => {
      const exists = prev.findIndex((item) => item.id === updated.id);
      let list = [...prev];
      if (exists !== -1) {
        list[exists] = updated;
      } else {
        list.push(updated);
      }
      return list;
    });

    if (supabaseClient) {
      try {
        let payload: any = {
          id: updated.id,
          categoria: updated.categoria,
          nome: updated.nome,
          descricao: updated.descricao || "",
          preco: Number(updated.preco),
          img: updated.img || "",
          adicionais_permitidos: updated.adicionaisPermitidos || [],
          is_active: updated.isActive !== undefined ? !!updated.isActive : true
        };
        
        let { error } = await supabaseClient
          .from("hamburgueria_produtos")
          .upsert(payload);

        if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes("is_active") || error.message?.includes("column"))) {
          delete payload.is_active;
          const fb = await supabaseClient.from("hamburgueria_produtos").upsert(payload);
          error = fb.error;
        }

        if (error) {
          console.error("Erro ao sincronizar produto no Supabase:", error);
          showToast(`Salvo localmente. Erro Supabase: ${error.message || "Desconhecido"}`, "error");
        } else {
          showToast("Produto sincronizado com Supabase!", "success");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProdutos((prev) => {
      const list = prev.filter((item) => item.id !== id);
      return list;
    });

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("hamburgueria_produtos")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Erro ao excluir produto no Supabase:", error);
          showToast("Excluído localmente. Erro no Supabase.", "error");
        } else {
          showToast("Produto removido do Supabase!", "success");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveAddon = async (updated: Addon) => {
    setAdicionais((prev) => {
      const exists = prev.findIndex((item) => item.id === updated.id);
      let list = [...prev];
      if (exists !== -1) {
        list[exists] = updated;
      } else {
        list.push(updated);
      }
      return list;
    });

    if (supabaseClient) {
      try {
        let payload: any = {
          id: updated.id,
          nome: updated.nome,
          preco: Number(updated.preco),
          ativo: !!updated.ativo
        };
        
        let { error } = await supabaseClient
          .from("hamburgueria_adicionais")
          .upsert(payload);

        if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes("ativo") || error.message?.includes("column"))) {
          delete payload.ativo;
          const fb = await supabaseClient.from("hamburgueria_adicionais").upsert(payload);
          error = fb.error;
        }

        if (error) {
          console.error("Erro ao sincronizar adicional no Supabase:", error);
          showToast(`Salvo localmente. Erro Supabase: ${error.message || "Desconhecido"}`, "error");
        } else {
          showToast("Adicional sincronizado com Supabase!", "success");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteAddon = async (id: string) => {
    setAdicionais((prev) => {
      const list = prev.filter((item) => item.id !== id);
      return list;
    });

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("hamburgueria_adicionais")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Erro ao excluir adicional no Supabase:", error);
          showToast("Excluído localmente. Erro no Supabase.", "error");
        } else {
          showToast("Adicional removido do Supabase!", "success");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Deseja realmente apagar todo o histórico de pedidos? Esta ação é irreversível e reiniciará a numeração a partir do 1.")) {
      return;
    }
    setOrdersHistory([]);
    safeStorage.removeItem("orders_history");

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("clientes_pedidos")
          .delete()
          .neq("id", 0); // deletes all rows in Postgres safely
        if (error) {
          console.error("Erro ao limpar banco de dados:", error);
        }
      } catch (err) {
        console.error("Erro ao limpar banco de dados:", err);
      }
    }
    showToast("Histórico de pedidos esvaziado! Numeração reiniciada no 1.", "success");
  };

  // Cart operations
  const changeCartQty = (id: string, change: number) => {
    if (change > 0) {
      const prod = produtos.find((p) => p.id === id);
      if (prod) {
        setActiveProductDetail(prod);
        setProductDetailNotes("");
        setProductDetailQty(1);
        setSelectedAddons({});
      }
      return;
    }

    setCarrinho((prev) => {
      const matches = Object.keys(prev).filter((k) => prev[k].id === id);
      if (matches.length === 0) return prev;
      
      const lastKey = matches[matches.length - 1];
      const exists = prev[lastKey];
      const updatedQty = exists.qtd + change;
      let next = { ...prev };
      if (updatedQty <= 0) {
        delete next[lastKey];
      } else {
        next[lastKey] = { ...exists, qtd: updatedQty };
      }
      return next;
    });
  };

  const changeCartQtyByKey = (cartKey: string, change: number) => {
    setCarrinho((prev) => {
      const exists = prev[cartKey];
      if (!exists) return prev;
      const updatedQty = exists.qtd + change;
      let next = { ...prev };
      if (updatedQty <= 0) {
        delete next[cartKey];
      } else {
        next[cartKey] = { ...exists, qtd: updatedQty };
      }
      return next;
    });
  };

  const handleAddProductWithNotes = () => {
    if (!activeProductDetail) return;
    
    const addonsList = adicionais
      .filter((a) => a.ativo && (selectedAddons[a.id] || 0) > 0)
      .map((a) => ({
        id: a.id,
        nome: a.nome,
        preco: a.preco,
        qtd: selectedAddons[a.id] || 0,
      }));

    const addonKeyPart = addonsList
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => `${a.id}:${a.qtd}`)
      .join(",");

    const notesClean = productDetailNotes.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    let cartKey = activeProductDetail.id;
    if (addonKeyPart) {
      cartKey += `_add_${addonKeyPart}`;
    }
    if (notesClean) {
      cartKey += `_obs_${notesClean}`;
    }

    setCarrinho((prev) => {
      const exists = prev[cartKey];
      const quantity = exists ? exists.qtd + productDetailQty : productDetailQty;
      return {
        ...prev,
        [cartKey]: {
          cartKey,
          id: activeProductDetail.id,
          nome: activeProductDetail.nome,
          preco: activeProductDetail.preco,
          qtd: quantity,
          observacoes: productDetailNotes,
          img: activeProductDetail.img,
          adicionais: addonsList,
        },
      };
    });

    setActiveProductDetail(null);
    setProductDetailNotes("");
    setProductDetailQty(1);
    setSelectedAddons({});
    showToast("Adicionado ao carrinho com sucesso!", "success");
  };

  // Logistics calculate action
  const handleCalculateRoute = async (street: string, number: string, neighborhood: string, cep: string) => {
    const logistics = await calculateDynamicFreight(street, number, neighborhood, cep, config);
    if (logistics) {
      setDeliveryDistance(logistics.distanceKm);
      setDeliveryFee(logistics.deliveryFee);
      showToast(
        `Frete calculado: ${logistics.distanceKm.toFixed(1)} km - ${formatBRL(logistics.deliveryFee)}`,
        "success"
      );
    } else {
      showToast("Não foi possível calcular o frete por coordenadas. Adicionando valor fixo.", "error");
      setDeliveryDistance(1.8);
      setDeliveryFee(config.ifoodBase);
    }
  };

  // Order triggers
  const handleFinalizeOrder = async (
    nome: string,
    telefone: string,
    rua: string,
    numero: string,
    bairro: string,
    cep: string,
    referencia: string,
    paymentMethod: string,
    cardType: string,
    paymentId: string,
    gatewayStatus: string,
    checkoutDeliveryType: "entrega" | "retirada" = "entrega"
  ) => {
    const orderId = `PED-${ordersHistory.length + 1}`;
    const items = Object.values(carrinho) as CartItem[];
    const subtotal = items.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
    const actualFreight = checkoutDeliveryType === "retirada" ? 0 : (deliveryFee || 0);
    const total = subtotal + actualFreight;

    // Prepare text summary
    let itemsDoc = "";
    items.forEach((item) => {
      let addonText = "";
      if (item.adicionais && item.adicionais.length > 0) {
        addonText = item.adicionais
          .map((a) => `\n   + ${a.qtd}x Adicional ${a.nome} (${formatBRL(a.preco)})`)
          .join("");
      }
      const obs = item.observacoes ? `\n   *Obs:* _${item.observacoes}_` : "";
      itemsDoc += `• *${item.qtd}x* ${item.nome}${addonText}${obs}\n`;
    });

    const newOrder: Order = {
      id: orderId,
      dataHora: new Date().toLocaleString("pt-BR"),
      nome,
      telefone,
      rua: checkoutDeliveryType === "retirada" ? "Retirada Secundária" : rua,
      numero: checkoutDeliveryType === "retirada" ? "" : numero,
      bairro: checkoutDeliveryType === "retirada" ? "" : bairro,
      cep: checkoutDeliveryType === "retirada" ? "" : cep,
      resumoItensString: itemsDoc,
      total,
      subtotal,
      frete: actualFreight,
      pagamento: paymentMethod,
      gatewayId: paymentId,
      gatewayStatus,
      detalhesEstruturados: items,
    };

    const nextHistory = [newOrder, ...ordersHistory];
    setOrdersHistory(nextHistory);
    safeStorage.setItem("orders_history", JSON.stringify(nextHistory));

    // Supabase optional cloud upload
    if (supabaseClient) {
      try {
        const enderecoDb = deliveryType === "retirada"
          ? "Retirada no Balcão"
          : `${newOrder.rua}, ${newOrder.numero} - ${newOrder.bairro} (CEP: ${cep})`;
        await supabaseClient.from("clientes_pedidos").insert([
          {
            nome: newOrder.nome,
            telefone: newOrder.telefone,
            endereco: enderecoDb,
            pedido_detalhes: newOrder.resumoItensString,
            total_pedido: newOrder.total,
            gateway_status: newOrder.gatewayStatus,
            gateway_id: newOrder.id,
          },
        ]);
      } catch (err) {
        console.error("Cloud sink failed, falling back safely:", err);
      }
    }

    // Prepare client account dynamic profile persistence
    const profile: ClientProfile = {
      telefone,
      nome,
      cep: deliveryType === "retirada" ? "" : cep,
      rua: deliveryType === "retirada" ? "" : rua,
      numero: deliveryType === "retirada" ? "" : numero,
      bairro: deliveryType === "retirada" ? "" : bairro,
      referencia: deliveryType === "retirada" ? "" : referencia,
    };
    setClientProfile(profile);
    safeStorage.setItem("enki_cliente_sessao", JSON.stringify(profile));

    // Auto save to local profiles ledger
    let ledger: ClientProfile[] = [];
    try {
      const savedLedger = safeStorage.getItem("enki_local_perfis");
      ledger = savedLedger ? JSON.parse(savedLedger) : [];
    } catch {
      ledger = [];
    }
    ledger = ledger.filter((p) => p.telefone !== telefone);
    ledger.push(profile);
    safeStorage.setItem("enki_local_perfis", JSON.stringify(ledger));

    // Redirect to whatsapp integration
    const finalPaymentModeText =
      paymentMethod === "Maquininha na Entrega" ? paymentMethod : `${paymentMethod} (Mercado Pago Aprovado)`;

    const deliveryDetail = checkoutDeliveryType === "retirada"
      ? `📍 *MODO DE ENTREGA:* Retirada na Loja (Balcão)\n🏬 *ENDEREÇO DA LOJA:* ${config.storeAddress}`
      : `📍 *MODO DE ENTREGA:* Envio para Endereço\n🏠 *ENDEREÇO:* ${rua}, ${numero} - ${bairro}\n📬 *CEP:* ${cep}${referencia ? `\n🗺️ *REF:* ${referencia}` : ""}\n🚗 *DISTÂNCIA:* ${deliveryDistance?.toFixed(1) || "?"} km`;

    const freightDetail = checkoutDeliveryType === "retirada" ? "Grátis" : formatBRL(actualFreight);

    const msg = `🔔 *NOVO PEDIDO - ${config.storeName.toUpperCase()}* (${orderId})\n\n` +
      `👤 *CLIENTE*\n${nome} - ${telefone}\n\n` +
      `${deliveryDetail}\n\n` +
      `📦 *ITENS*\n${itemsDoc}` +
      `💵 *SUBTOTAL:* ${formatBRL(subtotal)}\n` +
      `🚚 *TAXA DE ENTREGA:* ${freightDetail}\n` +
      `💰 *TOTAL DO PEDIDO:* ${formatBRL(total)}\n` +
      `💳 *PAGAMENTO:* ${finalPaymentModeText}`;

    const link = `https://api.whatsapp.com/send?phone=${config.whatsapp}&text=${encodeURIComponent(msg)}`;

    // Automated Webhook Notification background trigger for hands-free WhatsApp alerts
    if (config.notificationWebhook && config.notificationWebhook.trim() !== "") {
      const webhookUrl = config.notificationWebhook.trim();
      const payload = {
        orderId,
        date: new Date().toLocaleString("pt-BR"),
        clientName: nome,
        clientPhone: telefone,
        address: checkoutDeliveryType === "retirada" ? "Retirada no Balcão" : `${rua}, ${numero} - ${bairro}`,
        subtotal,
        frete: actualFreight,
        total,
        payment: finalPaymentModeText,
        itemsText: itemsDoc,
        rawMessage: msg
      };

      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Fallback for GET triggers (like CallMeBot parameter replacement)
        try {
          const callmebotUrl = webhookUrl.includes("text=")
            ? webhookUrl
            : `${webhookUrl}&text=${encodeURIComponent(msg)}`;
          fetch(callmebotUrl).catch(() => {});
        } catch {}
      });
    }

    const modalBody = (
      <div className="space-y-3.5 text-center py-2 text-stone-900 select-none">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
          <Check className="w-6 h-6 animate-pulse" />
        </div>
        <p className="font-bold text-sm text-neutral-950">Pedido Confirmado e Pago!</p>
        <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
          O pedido foi registrado em nosso sistema! <br />
          Estamos te aguardando no WhatsApp para enviar o comprovante. Redirecionando automaticamente...
        </p>
      </div>
    );

    const modalActions = (
      <a
        href={link}
        target="_self"
        onClick={() => {
          setGeneralModal(null);
        }}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none font-sans animate-bounce"
      >
        Mandar para o WhatsApp Manualmente
      </a>
    );

    // Empty cart right away!
    setCarrinho({});
    setView("menu");
    window.scrollTo(0, 0);

    setGeneralModal({
      title: "Pedido Recebido!",
      body: modalBody,
      actions: modalActions,
    });

    // Auto redirect to WhatsApp after 2 seconds for hands-free WhatsApp delivery!
    setTimeout(() => {
      window.location.href = link;
    }, 2000);
  };

  const executeCheckoutSubmit = () => {
    window.dispatchEvent(new CustomEvent("sidebar-checkout-submit"));
  };

  // Client side quick log session
  const submitClientLogin = () => {
    const cleanPhone = loginPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      showToast("Número de WhatsApp inválido.", "error");
      return;
    }

    setClientLoginOpen(false);
    showToast("Verificando cadastro...", "success");

    // Scan database profiles
    let ledger: ClientProfile[] = [];
    try {
      const savedLedger = safeStorage.getItem("enki_local_perfis");
      ledger = savedLedger ? JSON.parse(savedLedger) : [];
    } catch {
      ledger = [];
    }

    const found = ledger.find((p) => p.telefone === cleanPhone);
    if (found) {
      setClientProfile(found);
      safeStorage.setItem("enki_cliente_sessao", JSON.stringify(found));
      showToast(`Boas-vindas de volta, ${found.nome.split(" ")[0]}!`, "success");
    } else {
      showToast("Telefone não cadastrado. Criando perfil!", "error");
      // Open register window
      setRegPhone(cleanPhone);
      setRegName("");
      setRegCep("");
      setRegStreet("");
      setRegNumber("");
      setRegNeighborhood("");
      setRegReferencia("");
      setClientRegisterOpen(true);
    }
  };

  const submitClientRegister = () => {
    const cleanPhone = regPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      showToast("Número de celular inválido.", "error");
      return;
    }
    if (!regName.trim() || !regCep.trim() || !regStreet.trim() || !regNumber.trim() || !regNeighborhood.trim()) {
      showToast("Por favor, preencha todos os campos do cadastro.", "error");
      return;
    }

    const newProfile: ClientProfile = {
      telefone: cleanPhone,
      nome: regName,
      cep: regCep,
      rua: regStreet,
      numero: regNumber,
      bairro: regNeighborhood,
      referencia: regReferencia,
    };

    setClientProfile(newProfile);
    safeStorage.setItem("enki_cliente_sessao", JSON.stringify(newProfile));

    let ledger: ClientProfile[] = [];
    try {
      const savedLedger = safeStorage.getItem("enki_local_perfis");
      ledger = savedLedger ? JSON.parse(savedLedger) : [];
    } catch {
      ledger = [];
    }
    ledger = ledger.filter((p) => p.telefone !== cleanPhone);
    ledger.push(newProfile);
    safeStorage.setItem("enki_local_perfis", JSON.stringify(ledger));

    setClientRegisterOpen(false);
    showToast("Cadastro finalizado!", "success");
  };

  const handleProfileButtonClick = () => {
    if (clientProfile) {
      // Show profile details modal
      const body = (
        <div className="space-y-4 text-left py-2 text-stone-900 font-sans font-medium select-none">
          <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
              <span className="text-sm font-black font-mono">OK</span>
            </div>
            <div>
              <h4 className="font-extrabold text-neutral-950 text-sm leading-tight">{clientProfile.nome}</h4>
              <span className="text-xs text-stone-400 mt-1 block">{clientProfile.telefone}</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-stone-500">
            <span className="font-bold text-neutral-950 block">Endereço de Entrega Cadastrado:</span>
            <p className="leading-snug">{clientProfile.rua}, Nº {clientProfile.numero}</p>
            <p className="leading-snug">{clientProfile.bairro} - CEP: {clientProfile.cep}</p>
            {clientProfile.referencia && (
              <p className="italic text-[11px] text-orange-600 bg-orange-50/50 px-2.5 py-1 rounded-lg border border-orange-100/30 mt-2">
                Ref: {clientProfile.referencia}
              </p>
            )}
          </div>
        </div>
      );

      const actions = (
        <React.Fragment>
          <button
            onClick={() => {
              safeStorage.removeItem("enki_cliente_sessao");
              setClientProfile(null);
              setGeneralModal(null);
              showToast("Sessão deslogada.", "success");
            }}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-100 cursor-pointer font-sans"
          >
            Desconectar
          </button>
          <button
            onClick={() => setGeneralModal(null)}
            className="px-4 py-2 font-bold text-xs text-stone-500 hover:text-stone-700 cursor-pointer font-sans"
          >
            Fechar
          </button>
        </React.Fragment>
      );

      setGeneralModal({
        title: "Sua Conta",
        body,
        actions,
      });
    } else {
      setLoginPhone("");
      setClientLoginOpen(true);
    }
  };

  const handleAdminVerify = () => {
    if (adminPasswordInput === ADMIN_PASSWORD_HASH) {
      setAdminAuthenticated(true);
      setAdminAuthModalOpen(false);
      setAdminPasswordInput("");
      setView("admin");
      showToast("Acesso administrativo confirmado!", "success");
    } else {
      showToast("Senha incorreta.", "error");
    }
  };

  const printReceiptOutput = (orderId: string) => {
    const o = ordersHistory.find((item) => item.id === orderId);
    if (!o) return;
    const itemsText = o.resumoItensString;

    const receipt = `
      <pre>
----------------------------------------
             ${config.storeName.toUpperCase()}
----------------------------------------
PEDIDO: ${o.id}
DATA: ${o.dataHora}
CLIENTE: ${o.nome.toUpperCase()}
----------------------------------------
${itemsText}
----------------------------------------
TOTAL: ${formatBRL(o.total)}
PAGAMENTO: ${o.pagamento.toUpperCase()}
----------------------------------------
      </pre>
    `;
    setReceiptHtml(receipt);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Upsell handling
  const handleUpsellSelectionSubmit = () => {
    const activeAddons = adicionais.filter((a) => a.ativo);
    
    setCarrinho((prev) => {
      let next = { ...prev };
      activeAddons.forEach((a) => {
        const cartKey = `addon_${a.id}`;
        const finalQty = upsellQuantities[a.id] || 0;

        if (finalQty > 0) {
          next[cartKey] = {
            cartKey,
            id: a.id,
            nome: `Adicional: ${a.nome}`,
            preco: a.preco,
            qtd: finalQty,
            observacoes: "Selecionado via oferta ultra rápida",
          };
        } else {
          delete next[cartKey];
        }
      });
      return next;
    });

    setUpsellModalOpen(false);
    setUpsellQuantities({});
    setView("checkout");
  };

  // Sorted products based on custom arrangement or deterministic id
  const sortedProdutos = React.useMemo(() => {
    const orderList = config.productOrder || [];
    if (orderList.length === 0) {
      return [...produtos].sort((a, b) => a.id.localeCompare(b.id));
    }
    return [...produtos].sort((a, b) => {
      const idxA = orderList.indexOf(a.id);
      const idxB = orderList.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [produtos, config.productOrder]);

  // Search filtering logic
  const filteredProducts = sortedProdutos.filter((p) => {
    const matchQuery =
      p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === "todos" || p.categoria === activeCategory;
    return matchQuery && matchCat;
  });

  const cartItemsArray = Object.values(carrinho) as CartItem[];
  const cartTotalAmount = cartItemsArray.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
  const cartItemCount = cartItemsArray.reduce((acc, item) => acc + item.qtd, 0);
  const isOpen = isStoreOpen(config.businessHours);

  return (
    <div className="bg-stone-50 text-neutral-950 min-h-screen pb-16 relative">
      {/* Toast Notifier */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Embedded hidden printable receipt area */}
      <div id="thermal-receipt" className="hidden" dangerouslySetInnerHTML={{ __html: receiptHtml }} />

      {/* FAB WHATSAPP / AI ASSISTANT DIRECT LINK */}
      <a
        href={`https://api.whatsapp.com/send?phone=${config.whatsapp}&text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20o%20atendimento%20virtual.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1EBE57] transition-all duration-300 z-50 hover:scale-110 flex items-center justify-center animate-soft-pulse group"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.883-.653-1.48-1.459-1.653-1.756-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
        <span className="absolute right-16 bg-white text-stone-700 px-3 py-1.5 rounded-xl shadow-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-stone-100">
          Suporte {config.storeName}
        </span>
      </a>

      {/* Global Modals container template */}
      {generalModal && (
        <div
          onClick={() => setGeneralModal(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setGeneralModal(null))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] max-w-[400px] md:max-w-md w-full p-4 md:p-5 shadow-xl border border-stone-100 animate-in zoom-in-95 duration-200 cursor-default max-h-[92vh] flex flex-col overflow-hidden"
          >
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 mb-1 font-mono shrink-0">{generalModal.title}</h3>
            <div className="text-sm text-[#FF3D00] mb-2 font-sans flex items-center gap-1 block shrink-0">
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest font-mono select-none block">DICA: Toque fora ou pressione ESC para fechar</span>
            </div>
            <div className="text-sm text-stone-600 mb-3 overflow-y-auto pr-1 flex-1 min-h-0">
              {generalModal.body}
            </div>
            {generalModal.actions && (
              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100 shrink-0">
                {generalModal.actions}
              </div>
            )}
          </div>
        </div>
      )}

      <Header
        config={config}
        clientProfile={clientProfile}
        onProfileClick={handleProfileButtonClick}
        onLogoClick={() => {
          setView("menu");
          if (window.location.hash) {
            window.history.pushState("", document.title, window.location.pathname + window.location.search);
          }
        }}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main left layout sheet */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            
            {/* White label geolocation layout banner */}
            {view === "menu" && (
              <div id="hero-banner" className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
                <div>
                  <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-widest mb-1">
                    Localização Oficial
                  </p>
                  <p className="font-bold text-neutral-950 text-sm sm:text-base flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#FF3D00] shrink-0" />{" "}
                    <span className="truncate max-w-[280px] sm:max-w-md">{config.storeAddress}</span>
                  </p>
                </div>
                {isOpen ? (
                  <span className="md:hidden bg-emerald-50 text-emerald-600 text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aberto para pedidos
                  </span>
                ) : (
                  <span className="md:hidden bg-rose-50 text-rose-600 text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-rose-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Fechado no momento
                  </span>
                )}
              </div>
            )}

            {/* View 1: Catalog Menu */}
            {view === "menu" && (
              <div className="space-y-6">
                {/* Horizontal categories list */}
                <div className="flex gap-2 overflow-x-auto lg:overflow-x-visible lg:flex-wrap pb-2 no-scrollbar scroll-smooth select-none">
                  <button
                    onClick={() => setActiveCategory("todos")}
                    className={`px-5 py-3 rounded-full text-xs font-bold transition whitespace-nowrap active:scale-95 cursor-pointer ${
                      activeCategory === "todos"
                        ? "bg-black text-white shadow-md shadow-black/10 text-xs font-bold"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    🍔 Todos os Itens
                  </button>
                  {Array.from(new Set(sortedProdutos.map(p => p.categoria))).filter(Boolean).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-5 py-3 rounded-full text-xs font-bold capitalize transition whitespace-nowrap active:scale-95 cursor-pointer ${
                        activeCategory === cat
                          ? "bg-black text-white shadow-md"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search banner and visual settings */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar hambúrguer, batata frita, bebida..."
                      className="w-full bg-stone-100 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#FF3D00] focus:outline-none placeholder-stone-400"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-stone-100 pb-2 sm:pb-0 sm:border-none gap-2 select-none">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider capitalize">
                      {activeCategory === "todos" ? "Todos os Itens" : activeCategory}
                    </span>
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/50">
                      <button
                        onClick={() => setLayoutMode("list")}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          layoutMode === "list"
                            ? "text-neutral-950 bg-white shadow-sm"
                            : "text-stone-400 hover:text-neutral-950"
                        }`}
                        title="Ver em Lista"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLayoutMode("grid")}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          layoutMode === "grid"
                            ? "text-neutral-950 bg-white shadow-sm"
                            : "text-stone-400 hover:text-neutral-950"
                        }`}
                        title="Ver em Grade"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Catalog Listing */}
                <div
                  className={`transition-all duration-300 ${
                    layoutMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
                      : "space-y-4"
                  }`}
                >
                  {filteredProducts.map((p) => {
                    const totalQtd = (Object.values(carrinho) as CartItem[])
                      .filter((item) => item.id === p.id)
                      .reduce((sum, item) => sum + item.qtd, 0);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        layoutMode={layoutMode}
                        quantity={totalQtd}
                        onSelect={() => {
                          setActiveProductDetail(p);
                          setProductDetailNotes("");
                          setProductDetailQty(1);
                          setSelectedAddons({});
                        }}
                        onIncrease={(e) => {
                          e.stopPropagation();
                          changeCartQty(p.id, 1);
                        }}
                        onDecrease={(e) => {
                          e.stopPropagation();
                          changeCartQty(p.id, -1);
                        }}
                      />
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 col-span-full select-none">
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">
                        Nenhum hambúrguer encontrado para a busca.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View 2: Logistics / Checkout Form details */}
            {view === "checkout" && (
              <CheckoutView
                carrinho={carrinho}
                config={config}
                clientProfile={clientProfile}
                deliveryDistance={deliveryDistance}
                deliveryFee={deliveryFee}
                deliveryType={deliveryType}
                onDeliveryTypeChange={setDeliveryType}
                onCalculateRoute={handleCalculateRoute}
                onFinalizeOrder={handleFinalizeOrder}
                onBackToMenu={() => setView("menu")}
                showToast={showToast}
                onShowModal={(title, body, actions) => setGeneralModal({ title, body, actions })}
                onCloseModal={() => setGeneralModal(null)}
              />
            )}

            {/* View 3: Back-office portal admin options */}
            {view === "admin" && adminAuthenticated && (
              <AdminPanel
                config={config}
                onSaveConfig={handleSaveConfig}
                ordersHistory={ordersHistory}
                onClearHistory={handleClearHistory}
                produtos={sortedProdutos}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                adicionais={adicionais}
                onSaveAddon={handleSaveAddon}
                onDeleteAddon={handleDeleteAddon}
                supabaseStatus={supabaseStatus}
                onLogout={() => {
                  setAdminAuthenticated(false);
                  setView("menu");
                  showToast("Sessão administrativa encerrada.", "success");
                }}
                onPrintOrder={printReceiptOutput}
                showToast={showToast}
                onShowModal={(title, body, actions) => setGeneralModal({ title, body, actions })}
                onCloseModal={() => setGeneralModal(null)}
                autoPrintActive={autoPrintActive}
                setAutoPrintActive={(val) => {
                  setAutoPrintActive(val);
                  safeStorage.setItem("enki_auto_print", val ? "true" : "false");
                  showToast(val ? "A auto-impressão de pedidos está ativa!" : "Auto-impressão desligada.", "success");
                }}
                soundAlertActive={soundAlertActive}
                setSoundAlertActive={(val) => {
                  setSoundAlertActive(val);
                  safeStorage.setItem("enki_sound_alert", val ? "true" : "false");
                  showToast(val ? "Sinal sonoro de novos pedidos ativo!" : "Sinal sonoro desativado.", "success");
                }}
              />
            )}
          </div>

          {/* Sticky Sidebar shopping cart desktop panel */}
          <CartSidebar
            carrinho={carrinho}
            deliveryFee={deliveryFee}
            deliveryType={deliveryType}
            onDecrease={(key) => changeCartQtyByKey(key, -1)}
            onIncrease={(key) => changeCartQtyByKey(key, 1)}
            onAdvance={() => setReviewOrderModalOpen(true)}
            onSubmit={executeCheckoutSubmit}
            isCheckoutView={view === "checkout"}
          />
        </div>
      </main>

      {/* MINIMALIST VISUALLY APPEALING FOOTER */}
      {view === "menu" && (
        <footer className="border-t border-stone-100 bg-white py-12 px-4 mt-12 transition-all">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-stone-500 text-xs">
            {/* Left elements: copyright, address, brand */}
            <div className="text-center md:text-left space-y-1">
              <p className="font-extrabold text-neutral-900 tracking-wide uppercase font-mono text-[10px]">
                {config.storeName}
              </p>
              <p className="text-stone-400">
                Cardápio Digital de Alta Fidelidade © {new Date().getFullYear()} — Todos os direitos reservados.
              </p>
              <p className="text-stone-400 text-[10px]">
                Endereço: {config.storeAddress}
              </p>
            </div>

            {/* Right actions links: admin access & manual pwa trigger */}
            <div className="flex flex-wrap justify-center gap-6 font-semibold">
              <button
                onClick={() => setShowPwaInstallModal(true)}
                className="hover:text-neutral-950 transition cursor-pointer flex items-center gap-1.5 text-[11px]"
              >
                <Download className="w-3.5 h-3.5 text-[#FF3D00]" /> Instalar Aplicativo
              </button>
              <button
                onClick={() => {
                  if (adminAuthenticated) {
                    setView("admin");
                  } else {
                    setAdminAuthModalOpen(true);
                  }
                }}
                className="hover:text-neutral-950 transition cursor-pointer flex items-center gap-1.5 text-[11px]"
              >
                <Lock className="w-3.5 h-3.5 text-[#FF3D00]" /> Painel Administrativo
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* FOOTER BASKET POPUP SHEET (Celular view, visible only on menu screen) */}
      {cartItemCount > 0 && view === "menu" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 shadow-2xl z-40 lg:hidden">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3">
              <div className="bg-stone-50 text-neutral-950 p-3 rounded-2xl relative border border-stone-200">
                <ShoppingCart className="w-5 h-5 text-[#FF3D00]" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF3D00] text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartItemCount}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Subtotal</span>
                <span className="text-base font-black text-neutral-950">{formatBRL(cartTotalAmount)}</span>
              </div>
            </div>
            <button
              onClick={() => setReviewOrderModalOpen(true)}
              className="flex-1 bg-black hover:bg-neutral-800 text-white font-black py-3.5 px-5 rounded-2xl shadow-lg transition flex items-center justify-center gap-1.5 text-xs cursor-pointer active:scale-95 text-center uppercase tracking-wider"
            >
              Comprar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Premium Product detail layout modal sheet */}
      {activeProductDetail && (
        <div
          onClick={() => {
            setActiveProductDetail(null);
            setProductDetailNotes("");
            setProductDetailQty(1);
            setSelectedAddons({});
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => {
            setActiveProductDetail(null);
            setProductDetailNotes("");
            setProductDetailQty(1);
            setSelectedAddons({});
          })}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden cursor-default"
          >
            {/* Header / Banner Image */}
            <div className="relative w-full h-64 sm:h-76 md:h-80 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0 border-b border-stone-100">
              <img
                src={activeProductDetail.img && activeProductDetail.img.trim() !== "" ? activeProductDetail.img : `https://placehold.co/600x400/f1f5f9/94a3b8?text=${encodeURIComponent(activeProductDetail.nome)}`}
                className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
                alt={activeProductDetail.nome}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/600x400/f1f5f9/94a3b8?text=${encodeURIComponent(activeProductDetail.nome)}`;
                }}
              />
              {/* Close Button floating */}
              <button
                onClick={() => {
                  setActiveProductDetail(null);
                  setProductDetailNotes("");
                  setProductDetailQty(1);
                  setSelectedAddons({});
                }}
                className="absolute top-5 right-5 bg-white/90 backdrop-blur hover:bg-white text-stone-700 p-2.5 rounded-full cursor-pointer transition shadow-lg z-10 border border-stone-200/50"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Category Badge */}
              <span className="absolute bottom-4 left-5 bg-stone-900/85 backdrop-blur text-white font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow">
                {activeProductDetail.categoria}
              </span>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-thin text-left text-stone-900 font-sans">
              <div>
                <h3 className="font-black text-neutral-950 text-xl md:text-2xl tracking-tight">
                  {activeProductDetail.nome}
                </h3>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {activeProductDetail.precoOriginal && activeProductDetail.precoOriginal > activeProductDetail.preco ? (
                    <>
                      <span className="text-[#FF3D00] font-black text-base md:text-lg">
                        {formatBRL(activeProductDetail.preco)}
                      </span>
                      <span className="text-stone-400 text-xs line-through">
                        {formatBRL(activeProductDetail.precoOriginal)}
                      </span>
                      <span className="bg-[#FFECE5] text-[#FF3D00] text-[10px] font-extrabold px-2 py-0.5 rounded-lg">
                        {Math.round(((activeProductDetail.precoOriginal - activeProductDetail.preco) / activeProductDetail.precoOriginal) * 100)}% de Desconto 🔥
                      </span>
                    </>
                  ) : (
                    <span className="text-[#FF3D00] font-black text-base md:text-lg">
                      {formatBRL(activeProductDetail.preco)}
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-stone-500 leading-relaxed mt-3.5 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  {activeProductDetail.descricao}
                </p>
              </div>

              {/* Addons Selection List inside details modal! */}
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3D00] font-mono">
                    Adicionais Opcionais
                  </span>
                  <span className="text-[11px] text-stone-400 mt-0.5 font-sans">
                    Selecione os adicionais para turbinar seu lanche:
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                  {(() => {
                    const availableAddons = adicionais
                      .filter((addon) => addon.ativo)
                      .filter((addon) => {
                        if (
                          !activeProductDetail.adicionaisPermitidos ||
                          activeProductDetail.adicionaisPermitidos.length === 0
                        ) {
                          return true;
                        }
                        return activeProductDetail.adicionaisPermitidos.includes(addon.id);
                      });

                    if (availableAddons.length === 0) {
                      return (
                        <p className="text-xs text-stone-400 italic py-2">
                          Nenhum ingrediente adicional disponível para este item.
                        </p>
                      );
                    }

                    return availableAddons.map((a) => {
                      const localQty = selectedAddons[a.id] || 0;
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition text-left"
                        >
                          <div className="min-w-0 pr-3">
                            <p className="font-extrabold text-xs text-neutral-950 truncate leading-tight">
                              {a.nome}
                            </p>
                            <p className="text-[10.5px] text-[#FF3D00] font-black mt-1">
                              + {formatBRL(a.preco)}
                            </p>
                          </div>
                          <div className="flex items-center bg-white rounded-full p-1 border shadow-sm">
                            <button
                              onClick={() => {
                                setSelectedAddons((prev) => ({
                                  ...prev,
                                  [a.id]: Math.max(0, (prev[a.id] || 0) - 1),
                                }));
                              }}
                              className="w-7 h-7 rounded-full bg-stone-50 flex items-center justify-center font-bold text-xs hover:bg-stone-100 transition cursor-pointer active:scale-90"
                            >
                              -
                            </button>
                            <span className="text-xs font-black w-8 text-center">{localQty}</span>
                            <button
                              onClick={() => {
                                setSelectedAddons((prev) => ({
                                  ...prev,
                                  [a.id]: (prev[a.id] || 0) + 1,
                                }));
                              }}
                              className="w-7 h-7 rounded-full bg-[#FF3D00] text-white flex items-center justify-center font-bold text-xs hover:bg-[#E03600] transition cursor-pointer active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Notes Field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-stone-400 font-mono">
                  Alguma observação? (Opcional)
                </label>
                <textarea
                  value={productDetailNotes}
                  onChange={(e) => setProductDetailNotes(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-2xl p-4 text-xs focus:outline-none focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] h-20 placeholder-stone-400 font-sans transition resize-none"
                  placeholder="Ex: Pão bem selado, sem cebola, cheddar ao ponto..."
                />
              </div>
            </div>

            {/* Modal sticky footer panel */}
            <div className="p-6 md:p-8 bg-stone-50 border-t border-stone-150 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-stone-400 font-mono block sm:hidden">Qtd:</span>
                <div className="flex items-center bg-white rounded-full p-1 border shadow-sm w-full justify-between sm:justify-start">
                  <button
                    onClick={() => setProductDetailQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 hover:bg-stone-100 transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-black w-10 text-center">{productDetailQty}</span>
                  <button
                    onClick={() => setProductDetailQty((q) => q + 1)}
                    className="w-8 h-8 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 hover:bg-[#E03600] transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto font-sans">
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-widest font-mono">Preço Total</span>
                  <span className="text-xl font-black text-[#FF3D00] tracking-tight">
                    {(() => {
                      const basePrice = activeProductDetail.preco;
                      const addonsPrice = adicionais.reduce((sum, a) => sum + (selectedAddons[a.id] || 0) * a.preco, 0);
                      return formatBRL((basePrice + addonsPrice) * productDetailQty);
                    })()}
                  </span>
                </div>
                <button
                  onClick={handleAddProductWithNotes}
                  className="bg-[#FF3D00] hover:bg-[#E03600] text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-widest transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md w-full sm:w-auto min-w-[170px]"
                >
                  Adicionar ao Carrinho 🍔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive additions suggestions Upsell layout popup */}
      {upsellModalOpen && (
        <div
          onClick={() => setUpsellModalOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setUpsellModalOpen(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="text-center space-y-4 font-sans text-stone-900">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 text-[#FF3D00] flex items-center justify-center mb-1">
                <Sparkles className="w-6 h-6 text-[#FF3D00]" />
              </div>
              <p className="text-sm font-extrabold text-[#FF3D00] uppercase tracking-wide">Turbine o seu Pedido!</p>
              <p className="text-xs text-stone-400 leading-relaxed leading-snug">
                Deseja adicionar ingredientes adicionais para deixar seu burger ainda mais saboroso?
              </p>

              {/* Addons loop selections list */}
              <div className="space-y-3.5 py-2 max-h-[40vh] overflow-y-auto no-scrollbar scroll-smooth">
                {adicionais
                  .filter((addon) => addon.ativo)
                  .map((a) => {
                    const localQty = upsellQuantities[a.id] || 0;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 shadow-sm text-left"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-extrabold text-xs text-neutral-950 truncate leading-tight">{a.nome}</p>
                          <p className="text-[10px] text-[#FF3D00] font-black mt-1">+ {formatBRL(a.preco)}</p>
                        </div>
                        <div className="flex items-center bg-white rounded-full p-1 border">
                          <button
                            onClick={() => {
                              setUpsellQuantities((prev) => ({
                                ...prev,
                                [a.id]: Math.max(0, (prev[a.id] || 0) - 1),
                              }));
                            }}
                            className="w-7 h-7 rounded-full bg-stone-50 flex items-center justify-center font-black text-xs hover:bg-stone-100 transition cursor-pointer active:scale-90"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold w-8 text-center">{localQty}</span>
                          <button
                            onClick={() => {
                              setUpsellQuantities((prev) => ({
                                ...prev,
                                [a.id]: (prev[a.id] || 0) + 1,
                              }));
                            }}
                            className="w-7 h-7 rounded-full bg-[#FF3D00] text-white flex items-center justify-center font-black text-xs hover:bg-[#E03600] transition cursor-pointer active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal footer controls */}
              <div className="pt-2 border-t border-stone-100 flex justify-between items-center gap-3">
                <button
                  onClick={() => {
                    setUpsellModalOpen(false);
                    setUpsellQuantities({});
                    setView("checkout");
                  }}
                  className="px-4 py-2 font-bold text-xs text-stone-500 hover:text-stone-700 cursor-pointer font-sans"
                >
                  Pular e Avançar
                </button>
                <button
                  onClick={handleUpsellSelectionSubmit}
                  className="bg-[#FF3D00] hover:bg-[#E03600] text-white px-5 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition shadow-md cursor-pointer flex items-center gap-1.5 font-sans"
                >
                  <Check className="w-3.5 h-3.5" /> Adicionar e Ir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Authentication Overlay */}
      {adminAuthModalOpen && (
        <div
          onClick={() => setAdminAuthModalOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setAdminAuthModalOpen(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 text-stone-900 cursor-default"
          >
            <h3 className="text-base font-bold text-neutral-950 mb-2 font-mono">Controle de Gerência</h3>
            <p className="text-xs text-stone-400 mb-4 text-left">Informe a chave do painel da hamburgueria:</p>
            <input
              type="text"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminVerify()}
              onFocus={() => {
                if (adminPasswordInput && adminPasswordInput !== "") {
                  setAdminPasswordInput("");
                }
              }}
              onClick={() => {
                if (adminPasswordInput && adminPasswordInput !== "") {
                  setAdminPasswordInput("");
                }
              }}
              className="w-full bg-stone-50 border p-3.5 rounded-xl text-center font-extrabold tracking-widest focus:outline-none focus:border-[#FF3D00]"
              placeholder="••••••••"
              autoComplete="off"
              data-lpignore="true"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-5 pb-1">
              <button
                onClick={() => {
                  setAdminAuthModalOpen(false);
                  setAdminPasswordInput("");
                  window.location.hash = "";
                }}
                className="px-4 py-2 font-bold text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdminVerify}
                className="bg-[#FF3D00] hover:bg-[#E03600] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {clientLoginOpen && (
        <div
          onClick={() => setClientLoginOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setClientLoginOpen(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 text-stone-900 cursor-default"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 text-[#FF3D00] flex items-center justify-center mb-1">
              <Smartphone className="w-6 h-6 text-[#FF3D00]" />
            </div>
            <p className="text-sm font-bold text-center text-neutral-950">Acesso do Cliente</p>
            <p className="text-xs text-stone-400 leading-relaxed text-center mt-1">
              Informe o seu celular para entrar e carregar as suas preferências de entrega.
            </p>
            <div className="relative pt-3">
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submitClientLogin()}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-3 text-center text-sm font-extrabold focus:outline-none focus:border-[#FF3D00] transition"
                placeholder="DDD + Número WhatsApp"
                autoFocus
              />
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-400 font-medium mb-3">Primeira vez na Enki?</p>
              <button
                onClick={() => {
                  setClientLoginOpen(false);
                  setRegPhone("");
                  setRegName("");
                  setRegCep("");
                  setRegStreet("");
                  setRegNumber("");
                  setRegNeighborhood("");
                  setRegReferencia("");
                  setClientRegisterOpen(true);
                }}
                className="w-full bg-stone-100 hover:bg-stone-200 text-neutral-950 font-bold py-3 rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                Criar Nova Conta
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setClientLoginOpen(false)}
                className="px-4 py-2 font-bold text-xs text-stone-400 hover:text-stone-650 cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={submitClientLogin}
                className="bg-[#FF3D00] hover:bg-[#E03600] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {clientRegisterOpen && (
        <div
          onClick={() => setClientRegisterOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setClientRegisterOpen(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-100 text-stone-900 max-h-[90vh] overflow-y-auto no-scrollbar cursor-default"
          >
            <h3 className="text-sm font-bold text-neutral-950 mb-1 font-mono text-left">Cadastrar Perfil</h3>
            <p className="text-xs text-stone-400 leading-relaxed text-left mb-4">
              Crie o seu perfil para guardar o seu endereço e encurtar o tempo de entrega nos próximos pedidos.
            </p>

            <div className="space-y-3.5 text-left font-sans">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                  placeholder="Ex: 11999999999"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                  placeholder="Seu nome"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={regCep}
                    onChange={async (e) => {
                      const formatted = formatCEP(e.target.value);
                      setRegCep(formatted);
                      const clean = formatted.replace(/\D/g, "");
                      if (clean.length === 8) {
                        const addr = await fetchAddressByCEP(clean);
                        if (addr && !addr.erro) {
                          setRegStreet(addr.rua);
                          setRegNeighborhood(addr.bairro);
                        }
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                    placeholder="00000-000"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const clean = regCep.replace(/\D/g, "");
                    if (clean.length === 8) {
                      showToast("Buscando dados do CEP...", "success");
                      const addr = await fetchAddressByCEP(clean);
                      if (addr && !addr.erro) {
                        setRegStreet(addr.rua);
                        setRegNeighborhood(addr.bairro);
                        showToast("Dados do CEP importados!", "success");
                      }
                    } else {
                      showToast("Insira o CEP de 8 dígitos.", "error");
                    }
                  }}
                  className="bg-black hover:bg-neutral-800 text-white font-bold text-[10px] h-[34px] rounded-xl transition cursor-pointer flex items-center justify-center"
                >
                  Buscar CEP
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Rua / Avenida
                </label>
                <input
                  type="text"
                  value={regStreet}
                  onChange={(e) => setRegStreet(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                    placeholder="Nº"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={regNeighborhood}
                    onChange={(e) => setRegNeighborhood(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Referência (Opcional)
                </label>
                <input
                  type="text"
                  value={regReferencia}
                  onChange={(e) => setRegReferencia(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF3D00]"
                  placeholder="EX: Apt 32, Bloco C..."
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setClientRegisterOpen(false)}
                className="px-4 py-2 font-bold text-xs text-stone-400 hover:text-stone-650 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={submitClientRegister}
                className="bg-[#FF3D00] hover:bg-[#E03600] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Salvar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Review Order Pre-Checkout Modal */}
      {reviewOrderModalOpen && (
        <div
          onClick={() => setReviewOrderModalOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setReviewOrderModalOpen(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-stone-100 relative text-left text-neutral-900 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] overflow-hidden cursor-default"
          >
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-stone-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-neutral-950 uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#FF3D00]" /> Revisar Seu Pedido
                </h3>
                <p className="text-[11px] text-stone-500 mt-1">
                  Por favor, confira os itens e quantidades antes de prosseguir.
                </p>
              </div>
              <button
                onClick={() => setReviewOrderModalOpen(false)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-2 rounded-full cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Cart Items */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 scrollbar-thin">
              {cartItemsArray.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-6">Seu carrinho está vazio.</p>
              ) : (
                cartItemsArray.map((item) => {
                  const singlePrice = getCartItemSinglePrice(item);
                  const totalPrice = getCartItemTotalPrice(item);
                  return (
                    <div
                      key={item.cartKey}
                      className="p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-250 transition flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Info */}
                        <div className="flex gap-3">
                          <img
                            src={item.img && item.img.trim() !== "" ? item.img : `https://placehold.co/100x100/f1f5f9/94a3b8?text=${encodeURIComponent(item.nome)}`}
                            alt={item.nome}
                            className="w-12 h-12 rounded-xl object-contain border bg-white shrink-0 p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/100x100/f1f5f9/94a3b8?text=${encodeURIComponent(item.nome)}`;
                            }}
                          />
                          <div>
                            <span className="font-extrabold text-[#FF3D00] text-xs font-mono mr-1">
                              {item.qtd}x
                            </span>
                            <span className="font-black text-neutral-955 text-xs">{item.nome}</span>
                            <p className="text-[10px] text-stone-400 font-medium">
                              Unitário: {formatBRL(singlePrice)}
                            </p>
                          </div>
                        </div>

                        {/* Quantity Controls & Row Price */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-xs font-black text-neutral-950">
                            {formatBRL(totalPrice)}
                          </span>
                          <div className="flex items-center bg-white rounded-full p-0.5 border shadow-sm">
                            <button
                              onClick={() => changeCartQtyByKey(item.cartKey, -1)}
                              className="w-6 h-6 rounded-full bg-stone-50 flex items-center justify-center font-bold text-xs hover:bg-stone-100 transition cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-black w-6 text-center">{item.qtd}</span>
                            <button
                              onClick={() => changeCartQtyByKey(item.cartKey, 1)}
                              className="w-6 h-6 rounded-full bg-[#FF3D00] text-white flex items-center justify-center font-bold text-xs hover:bg-[#E03600] transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Addons summary */}
                      {item.adicionais && item.adicionais.length > 0 && (
                        <div className="text-[10px] text-stone-500 pl-3 py-1 bg-stone-100/40 rounded-xl space-y-0.5 border-l-2 border-stone-250 font-sans">
                          {item.adicionais.map((a) => (
                            <div key={a.id} className="flex justify-between items-center text-stone-500 pr-2">
                              <span>+ {a.qtd}x Adicional {a.nome}</span>
                              <span className="font-semibold">{formatBRL(a.preco * a.qtd * item.qtd)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Obs summary */}
                      {item.observacoes && (
                        <div className="text-[10.5px] text-[#E03600] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100/40 font-medium w-fit">
                          📝 Obs: {item.observacoes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Subtotal & Action buttons */}
            <div className="border-t border-stone-100 pt-4 shrink-0 font-sans">
              <div className="flex justify-between items-center mb-5 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <span className="text-xs font-black text-stone-500 uppercase tracking-wider font-mono">
                  Subtotal dos Itens:
                </span>
                <span className="text-lg font-black text-[#FF3D00] tracking-tight">
                  {formatBRL(cartTotalAmount)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setReviewOrderModalOpen(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-750 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition cursor-pointer text-center"
                >
                  ◀ Editar / Continuar Comprando
                </button>
                <button
                  onClick={() => {
                    setReviewOrderModalOpen(false);
                    setView("checkout");
                  }}
                  disabled={cartItemsArray.length === 0}
                  className="flex-1 bg-[#FF3D00] hover:bg-[#E03600] disabled:bg-stone-200 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition cursor-pointer text-center shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1"
                >
                  Avançar para o Pagamento ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Help Modal */}
      {showPwaInstallModal && (
        <div
          onClick={() => setShowPwaInstallModal(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={createTouchEndHandler(() => setShowPwaInstallModal(false))}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-100 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 relative text-left text-neutral-900 animate-in zoom-in-95 duration-200 cursor-default"
          >
            <button
              onClick={() => setShowPwaInstallModal(false)}
              className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-full cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-neutral-950 mb-1 flex items-center gap-2 uppercase tracking-wide font-mono">
              <Smartphone className="w-5 h-5 text-[#FF3D00]" /> Instalar no Celular / PC
            </h3>
            <p className="text-[11px] text-stone-500 leading-relaxed mb-4">
              Instale o nosso aplicativo oficial de cardápio instantâneo para acessar com apenas um toque no seu computador ou celular. Super leve e não ocupa memória!
            </p>

            <div className="space-y-4 font-sans text-xs">
              {/* Dica do navegador */}
              <div className="bg-orange-50 border border-orange-100/50 rounded-xl p-3 text-[10.5px] text-orange-900 leading-relaxed">
                <strong>💡 Método Automático:</strong> Se estiver no <strong>Chrome, Edge ou Celular Android</strong>, basta aceitar o pop-up de instalação do seu próprio navegador.
              </div>

              {/* iOS instructions */}
              <div className="border border-stone-200/60 hover:border-[#FF3D00]/50 rounded-2xl p-4 bg-stone-50/50 transition">
                <span className="font-bold text-neutral-955 text-xs flex items-center gap-1.5 mb-1.5">
                  🟢 No iPhone (Safari / iOS):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 leading-relaxed text-[11px]">
                  <li>Abra o link usando o navegador <strong>Safari</strong>.</li>
                  <li>Clique no botão de <strong>Compartilhar</strong> (quadrado com seta pra cima).</li>
                  <li>Role e escolha <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Confirme clicando em <strong>"Adicionar"</strong> no topo!</li>
                </ol>
              </div>

              {/* Android manual instructions */}
              <div className="border border-stone-200/60 hover:border-[#FF3D00]/50 rounded-2xl p-4 bg-stone-50/50 transition">
                <span className="font-bold text-neutral-955 text-xs flex items-center gap-1.5 mb-1">
                  🔵 No Android / PC (Chrome):
                </span>
                <p className="text-stone-600 leading-relaxed text-[11px] mb-2 font-sans">
                  No celular (Android), clique no menu de 3 pontinhos do navegador e selecione "Instalar aplicativo". No PC, clique no ícone de instalação (um monitor com uma seta) no lado direito da barra de endereços.
                </p>
                <button
                  onClick={async () => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === "accepted") {
                        setDeferredPrompt(null);
                        setShowPwaInstallModal(false);
                        showToast("Aplicativo instalado com sucesso!", "success");
                      }
                    } else {
                      showToast("Você já instalou, ou o seu navegador requer instalação pelo menu de opções.", "error");
                    }
                  }}
                  className="w-full bg-black mt-3 hover:bg-neutral-800 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  Instalar Agora
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowPwaInstallModal(false)}
              className="w-full mt-5 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold py-3 rounded-xl text-xs cursor-pointer transition text-center font-mono uppercase tracking-wider text-[10px]"
            >
              Fechar Guia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
