/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoreConfig, CartItem } from "./types";

// Safe Storage failback for private browser sessions or sandboxed environments
const ramStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return ramStorage[key] || null;
    }
  },
  setItem(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      ramStorage[key] = val;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete ramStorage[key];
    }
  },
};

export function getCartItemSinglePrice(item: CartItem): number {
  const addonsTotal = item.adicionais ? item.adicionais.reduce((sum, a) => sum + a.preco * a.qtd, 0) : 0;
  return item.preco + addonsTotal;
}

export function getCartItemTotalPrice(item: CartItem): number {
  return getCartItemSinglePrice(item) * item.qtd;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length > 5) {
    return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`;
  }
  return clean;
}

// Centralized image optimization base URL (Prepare for Cloudflare Worker proxy if needed)
export const SUPABASE_IMAGE_BASE_URL = "https://proxy-imagens-cardapio.adrianosamadhi.workers.dev";

export function getOptimizedImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  
  if (url.includes("placehold.co")) return url;
  if (!url.startsWith("http")) return url;

  try {
    const originalHost = "https://amylompetctxeaeyioig.supabase.co";
    if (url.startsWith(originalHost)) {
      return url.replace(originalHost, SUPABASE_IMAGE_BASE_URL);
    }
  } catch (e) {
    // Return original url if any error parsing
  }
  
  return url;
}

// ViaCEP helper to fetch street information from a postal code
export async function fetchAddressByCEP(cep: string): Promise<{
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  erro?: boolean;
} | null> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) {
      return { rua: "", bairro: "", cidade: "", estado: "", erro: true };
    }
    return {
      rua: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || "",
    };
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}

// OSMR driving distance calculator
export async function calculateDynamicFreight(
  street: string,
  number: string,
  neighborhood: string,
  cep: string,
  config: StoreConfig
): Promise<{ distanceKm: number; deliveryFee: number | null } | null> {
  const originLat = parseFloat(config.storeLat) || -23.564551;
  const originLon = parseFloat(config.storeLon) || -46.652150;
  
  // Format target address for OpenStreetMap lookup, concatenating "São Paulo, SP" to secure local precision
  const cleanCep = cep.replace(/\D/g, "");
  const queryAddress = `${street}, ${number}, ${neighborhood ? neighborhood + ', ' : ''}São Paulo, SP, ${cleanCep ? cleanCep + ', ' : ''}Brasil`;

  try {
    // Stage 1: Geocode destination using Nominatim with "São Paulo, SP" prefix
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      queryAddress
    )}&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "MenuDigitalApp/2.0" },
    });
    const geoData = await geoRes.json();

    let destLat: number;
    let destLon: number;

    if (geoData && geoData.length > 0) {
      destLat = parseFloat(geoData[0].lat);
      destLon = parseFloat(geoData[0].lon);
    } else {
      // Fallback 1: Try street + "São Paulo, SP" + CEP strictly (bypassing number or custom neighborhood typos)
      const fallbackQuery = `${street}, São Paulo, SP, ${cleanCep ? cleanCep + ', ' : ''}Brasil`;
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        fallbackQuery
      )}&limit=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { "User-Agent": "MenuDigitalApp/2.0" },
      });
      const fallbackData = await fallbackRes.json();
      
      if (fallbackData && fallbackData.length > 0) {
        destLat = parseFloat(fallbackData[0].lat);
        destLon = parseFloat(fallbackData[0].lon);
      } else {
        // Fallback 2: Geocode strictly by postal code and "São Paulo, SP"
        const cepQuery = `${cleanCep}, São Paulo, SP, Brasil`;
        const cepUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cepQuery
        )}&limit=1`;
        const cepRes = await fetch(cepUrl, {
          headers: { "User-Agent": "MenuDigitalApp/2.0" },
        });
        const cepData = await cepRes.json();
        if (cepData && cepData.length > 0) {
          destLat = parseFloat(cepData[0].lat);
          destLon = parseFloat(cepData[0].lon);
        } else {
          throw new Error("Localização do destinatário não encontrada");
        }
      }
    }

    // Stage 2: Retrieve real driving route and distance using OSRM Routing Engine. Order: longitude,latitude
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;
    const routeRes = await fetch(routeUrl);
    const routeData = await routeRes.json();

    let distanceKm = 0;
    if (routeData && routeData.routes && routeData.routes.length > 0) {
      const distanceMeters = routeData.routes[0].distance;
      distanceKm = distanceMeters / 1000;
    } else {
      // Direct distance fallback if OSRM is unreachable
      distanceKm = calculateDirectDistance(originLat, originLon, destLat, destLon);
    }

    // Check if distance exceeds configured maximum limit
    if (config.maxDeliveryKm && config.maxDeliveryKm > 0 && distanceKm > config.maxDeliveryKm) {
      return { distanceKm, deliveryFee: null };
    }

    // Dynamic fee calculation based on thresholds (iFood rules)
    const basePrice = config.ifoodBase;
    const kmPrice = config.ifoodKm;
    const deliveryFee =
      distanceKm <= 3 ? basePrice : basePrice + (distanceKm - 3) * kmPrice;

    return { distanceKm, deliveryFee };
  } catch (err) {
    console.error("Erro ao calcular logística de rota real:", err);
    // Return a pragmatic procedural calculation fallback based on address details to keep UX flowing
    const mockDistance = Math.max(
      1.5,
      ((street.length + parseInt(number || "1", 10)) % 7) + Math.random() * 0.8
    );
    
    // Check limit on fallback mock distance as well
    if (config.maxDeliveryKm && config.maxDeliveryKm > 0 && mockDistance > config.maxDeliveryKm) {
      return { distanceKm: mockDistance, deliveryFee: null };
    }

    const deliveryFee =
      mockDistance <= 3 ? config.ifoodBase : config.ifoodBase + (mockDistance - 3) * config.ifoodKm;
    return { distanceKm: mockDistance, deliveryFee };
  }
}

// Geo mathematical Haversine direct distance
function calculateDirectDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth ratio in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Store coordinates Nominatim updates matching Admin Settings
export async function geocodeStoreAddress(address: string): Promise<{ lat: string; lon: string } | null> {
  if (address.length < 6) return null;
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}&limit=1`;
    const res = await fetch(geoUrl, {
      headers: { "User-Agent": "MenuDigitalApp/2.0" },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon };
    }
  } catch (e) {
    console.error("Erro na geocodificação da loja:", e);
  }
  return null;
}

export function isStoreOpen(businessHours?: any): boolean {
  if (!businessHours) return true; // Default to open
  
  try {
    // Get current date/time in America/Sao_Paulo timezone
    const nowStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const localDate = new Date(nowStr);
    
    const day = localDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = localDate.getHours();
    const currentMinute = localDate.getMinutes();
    const currentTimeVal = currentHour * 60 + currentMinute;
    
    const rawConfig = typeof businessHours === "string" ? JSON.parse(businessHours) : businessHours;
    const dayConfig = rawConfig[day] || rawConfig[String(day)];
    
    if (!dayConfig) return true;
    if (dayConfig.closed) return false;
    
    const [startH, startM] = dayConfig.open.split(":").map(Number);
    const [endH, endM] = dayConfig.close.split(":").map(Number);
    
    const startTimeVal = startH * 60 + startM;
    let endTimeVal = endH * 60 + endM;
    
    // Handle overnight schedules (e.g. 18:00 to 02:00)
    if (endTimeVal < startTimeVal) {
      if (currentTimeVal >= startTimeVal || currentTimeVal <= endTimeVal) {
        return true;
      }
      return false;
    } else {
      // Normal daytime schedule (e.g. 18:00 to 23:30)
      return currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal;
    }
  } catch (e) {
    console.error("Error checking store status:", e);
    return true; // Fallback to open
  }
}
