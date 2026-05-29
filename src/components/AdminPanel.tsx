/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Trash2,
  LogOut,
  Plus,
  Save,
  Cpu,
  Smartphone,
  MapPin,
  FileText,
  DollarSign,
  Settings,
  Grid,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Order, Product, Addon, StoreConfig } from "../types";
import { formatBRL, geocodeStoreAddress } from "../utils";
import { DEFAULT_BUSINESS_HOURS } from "../data";

interface AdminPanelProps {
  config: StoreConfig;
  onSaveConfig: (updated: StoreConfig) => void;
  ordersHistory: Order[];
  onClearHistory: () => void;
  produtos: Product[];
  onSaveProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  adicionais: Addon[];
  onSaveAddon: (a: Addon) => void;
  onDeleteAddon: (id: string) => void;
  supabaseStatus: "disconnected" | "connected" | "error";
  onLogout: () => void;
  onPrintOrder: (orderId: string) => void;
  showToast: (msg: string, type: "success" | "error") => void;
  onShowModal: (title: string, body: React.ReactNode, actions: React.ReactNode) => void;
  onCloseModal: () => void;
  autoPrintActive?: boolean;
  setAutoPrintActive?: (val: boolean) => void;
  soundAlertActive?: boolean;
  setSoundAlertActive?: (val: boolean) => void;
}

interface ProductModalFormProps {
  product: Product | null;
  adicionais: Addon[];
  existingCategories: string[];
  onSave: (updatedProduct: Product) => void;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

export function ProductModalForm({
  product,
  adicionais,
  existingCategories,
  onSave,
  onClose,
  showToast,
}: ProductModalFormProps) {
  const [name, setName] = useState(product ? product.nome : "");
  const [price, setPrice] = useState(product ? product.preco : 0);
  
  const initialCat = product ? product.categoria : existingCategories.length > 0 ? existingCategories[0] : "Burgers Artesanais";
  const catIsExisting = existingCategories.includes(initialCat);
  const [categorySelect, setCategorySelect] = useState(catIsExisting ? initialCat : "Nova Categoria...");
  const [categoryInput, setCategoryInput] = useState(catIsExisting ? "" : initialCat);

  const [desc, setDesc] = useState(product ? product.descricao : "");
  const [img, setImg] = useState(product ? product.img : "");
  const [selectedAddons, setSelectedAddons] = useState<string[]>(
    product && product.adicionaisPermitidos ? product.adicionaisPermitidos : []
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("A imagem deve ter no máximo 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImg(base64);
        showToast("Imagem carregada com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0) {
      showToast("Preencha o nome e um preço válido.", "error");
      return;
    }
    const finalCategory = categorySelect === "Nova Categoria..." ? categoryInput.trim() : categorySelect;
    if (!finalCategory) {
      showToast("Preencha ou selecione uma categoria.", "error");
      return;
    }
    
    onSave({
      id: product ? product.id : "p_" + Date.now(),
      nome: name,
      preco: Number(price),
      descricao: desc,
      categoria: finalCategory,
      img: img || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
      adicionaisPermitidos: selectedAddons,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left text-stone-900 font-sans">
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Nome do Hambúrguer/Item
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]"
          placeholder="Ex: Cheddar Blast Duplo"
        />
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Preço de Venda (R$)
        </label>
        <input
          type="number"
          step="0.01"
          required
          value={price || ""}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]"
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Categoria
        </label>
        <select
          value={categorySelect}
          onChange={(e) => setCategorySelect(e.target.value)}
          className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none bg-white focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] mb-2"
        >
          {existingCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          <option value="Nova Categoria...">+ Nova Categoria...</option>
        </select>
        
        {categorySelect === "Nova Categoria..." && (
          <input
            type="text"
            required
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            placeholder="Digite o nome da nova categoria"
            className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none bg-white focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] animate-in slide-in-from-top-1 opacity-0 fade-in duration-200"
            style={{ animationFillMode: "forwards" }}
          />
        )}
      </div>
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Descrição / Ingredientes
        </label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none h-16 resize-none focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]"
          placeholder="Ex: Pão brioche, blend 150g, muito cheddar..."
        />
      </div>
      
      {/* Upload image and preview */}
      <div className="border-t border-stone-100 pt-3">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Imagem do Produto
        </label>
        <div className="space-y-3">
          <input
            type="text"
            value={img}
            onChange={(e) => setImg(e.target.value)}
            className="w-full border border-stone-200/80 p-3 text-[10.5px] rounded-xl focus:outline-none focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]"
            placeholder="Link da imagem (ou faça upload abaixo)..."
          />
          <div className="flex items-center gap-3">
            <label className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition select-none border border-stone-200/60 inline-flex items-center gap-1.5 active:scale-95">
              <Plus className="w-4.5 h-4.5 text-[#FF3D00]" /> Upload de Imagem (do Dispositivo)
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {img && img.startsWith("data:") && (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium border border-emerald-100">
                Arquivo Carregado ✔
              </span>
            )}
          </div>
          {img && (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border bg-stone-50 group shadow-sm">
              <img src={img} className="w-full h-full object-cover" alt="Preview" />
              <button
                type="button"
                onClick={() => setImg("")}
                className="absolute inset-0 bg-neutral-900/60 text-white font-bold text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
              >
                Remover
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Addons Selection checklist */}
      <div className="border-t border-stone-100 pt-3">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Adicionais permitidos para este item (deixe nenhum marcado para listar todos por padrão):
        </label>
        {adicionais.length === 0 ? (
          <p className="text-[11px] text-stone-400 italic">Nenhum ingrediente extra cadastrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-100">
            {adicionais.map((addon) => {
              const isChecked = selectedAddons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all select-none border text-[11px] ${
                    isChecked
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white hover:bg-stone-100 text-stone-700 border-stone-200/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedAddons(selectedAddons.filter((id) => id !== addon.id));
                      } else {
                        setSelectedAddons([...selectedAddons, addon.id]);
                      }
                    }}
                    className="rounded text-[#FF3D00] focus:ring-[#FF3D00] border-stone-300 w-3.5 h-3.5 cursor-pointer accent-[#FF3D00]"
                  />
                  <div className="truncate flex-1 font-bold leading-tight">
                    <span>{addon.nome}</span>
                    <span className="block text-[9.5px] opacity-80 font-normal mt-0.5">
                      +{formatBRL(addon.preco)}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="flex gap-3 pt-3 border-t border-stone-100 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-[#FF3D00] hover:bg-[#E03600] text-white px-6 py-3 rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition"
        >
          Salvar Produto
        </button>
      </div>
    </form>
  );
}

export function AdminPanel({
  config,
  onSaveConfig,
  ordersHistory,
  onClearHistory,
  produtos,
  onSaveProduct,
  onDeleteProduct,
  adicionais,
  onSaveAddon,
  onDeleteAddon,
  supabaseStatus,
  onLogout,
  onPrintOrder,
  showToast,
  onShowModal,
  onCloseModal,
  autoPrintActive = false,
  setAutoPrintActive,
  soundAlertActive = true,
  setSoundAlertActive,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"pedidos" | "produtos" | "config">("pedidos");
  const [productSubTab, setProductSubTab] = useState<"items" | "addons">("items");

  // Config bindings
  const [cfgStoreName, setCfgStoreName] = useState(config.storeName);
  const [cfgStoreLogoUrl, setCfgStoreLogoUrl] = useState(config.storeLogoUrl);
  const [cfgWhatsapp, setCfgWhatsapp] = useState(config.whatsapp);
  const [cfgStoreAddress, setCfgStoreAddress] = useState(config.storeAddress);
  const [cfgStoreLat, setCfgStoreLat] = useState(config.storeLat);
  const [cfgStoreLon, setCfgStoreLon] = useState(config.storeLon);
  const [cfgSupabaseUrl, setCfgSupabaseUrl] = useState(config.supabaseUrl);
  const [cfgSupabaseKey, setCfgSupabaseKey] = useState(config.supabaseKey ? "••••••••••••••••" : "");
  const [cfgIfoodBase, setCfgIfoodBase] = useState(config.ifoodBase);
  const [cfgIfoodKm, setCfgIfoodKm] = useState(config.ifoodKm);
  const [cfgMpPubKey, setCfgMpPubKey] = useState(config.mpPubKey || "");
  const [cfgMpAccessToken, setCfgMpAccessToken] = useState(config.mpAccessToken ? "••••••••••••••••" : "");
  const [cfgNotificationWebhook, setCfgNotificationWebhook] = useState(config.notificationWebhook || "");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [cfgBusinessHours, setCfgBusinessHours] = useState(() => {
    if (config.businessHours) {
      return typeof config.businessHours === "string" 
        ? JSON.parse(config.businessHours) 
        : config.businessHours;
    }
    return DEFAULT_BUSINESS_HOURS;
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("O logotipo deve ter no máximo 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setCfgStoreLogoUrl(base64);
        showToast("Logotipo carregado com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto geocoding tool
  const runOnDemandGeocoding = async (silent = false) => {
    if (!cfgStoreAddress || cfgStoreAddress.trim().length < 6) {
      if (!silent) {
        showToast("Escreva um endereço físico válido primeiro para buscar as coordenadas.", "error");
      }
      return null;
    }
    setIsGeocoding(true);
    if (!silent) {
      showToast("Buscando coordenadas GPS para o endereço...", "success");
    }
    const coords = await geocodeStoreAddress(cfgStoreAddress);
    setIsGeocoding(false);
    if (coords) {
      setCfgStoreLat(coords.lat);
      setCfgStoreLon(coords.lon);
      if (!silent) {
        showToast("Coordenadas GPS localizadas e preenchidas automaticamente!", "success");
      }
      return coords;
    } else {
      if (!silent) {
        showToast("Localização GPS não encontrada. Refine o endereço ou digite manualmente se souber.", "error");
      }
      return null;
    }
  };

  const handleSaveSettings = async () => {
    let lat = cfgStoreLat;
    let lon = cfgStoreLon;

    // Auto geodesic calculation if settings address is altered or coordinates are empty
    const needsGeocoding =
      (cfgStoreAddress !== config.storeAddress && cfgStoreAddress.length > 6) ||
      (!cfgStoreLat || !cfgStoreLon || cfgStoreLat === "0" || cfgStoreLon === "0" || cfgStoreLat === "" || cfgStoreLon === "");

    if (needsGeocoding && cfgStoreAddress.length > 6) {
      const coords = await geocodeStoreAddress(cfgStoreAddress);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
        setCfgStoreLat(lat);
        setCfgStoreLon(lon);
      }
    }

    const finalSupabaseKey = (cfgSupabaseKey && cfgSupabaseKey !== "••••••••••••••••")
      ? cfgSupabaseKey
      : (config.supabaseKey || "");

    const finalMpAccessToken = (cfgMpAccessToken && cfgMpAccessToken !== "••••••••••••••••")
      ? cfgMpAccessToken
      : (config.mpAccessToken || "");

    onSaveConfig({
      storeName: cfgStoreName || "Cardápio Digital",
      storeLogoUrl: cfgStoreLogoUrl,
      whatsapp: cfgWhatsapp,
      storeAddress: cfgStoreAddress,
      storeLat: lat || "-23.564551",
      storeLon: lon || "-46.652150",
      supabaseUrl: cfgSupabaseUrl,
      supabaseKey: finalSupabaseKey,
      ifoodBase: Number(cfgIfoodBase) || 7.9,
      ifoodKm: Number(cfgIfoodKm) || 1.8,
      mpPubKey: cfgMpPubKey,
      mpAccessToken: finalMpAccessToken,
      businessHours: cfgBusinessHours,
      notificationWebhook: cfgNotificationWebhook,
    });
    showToast("Configurações gravadas com sucesso!", "success");
  };

  const handleMoveProduct = (index: number, direction: "up" | "down" | "left" | "right") => {
    const list = [...produtos];
    let targetIndex = index;

    if (direction === "left") {
      targetIndex = index - 1;
    } else if (direction === "right") {
      targetIndex = index + 1;
    } else if (direction === "up") {
      targetIndex = index - 2;
    } else if (direction === "down") {
      targetIndex = index + 2;
    }
    
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    
    const newOrder = list.map((p) => p.id);
    
    onSaveConfig({
      ...config,
      productOrder: newOrder,
    });
    showToast("Ordem do cardápio atualizada!", "success");
  };

  const handleOpenProductModal = (p: Product | null) => {
    const categories = Array.from(new Set(produtos.map(prod => prod.categoria))).filter(Boolean);
    const body = (
      <ProductModalForm
        product={p}
        adicionais={adicionais}
        existingCategories={categories}
        onSave={(updatedProduct) => {
          onSaveProduct(updatedProduct);
          onCloseModal();
        }}
        onClose={onCloseModal}
        showToast={showToast}
      />
    );

    onShowModal(p ? "Editar Hambúrguer" : "Novo Produto / Categoria", body, null);
  };

  const handleOpenAddonModal = (a: Addon | null) => {
    let name = a ? a.nome : "";
    let price = a ? a.preco : 0;
    let active = a ? a.ativo : true;

    const submitForm = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || price < 0) {
        showToast("Preencha o nome do ingrediente extra.", "error");
        return;
      }
      onSaveAddon({
        id: a ? a.id : "a_" + Date.now(),
        nome: name,
        preco: Number(price),
        ativo: active,
      });
      onCloseModal();
      showToast(a ? "Adicional editado!" : "Ingrediente adicional criado!", "success");
    };

    const body = (
      <form onSubmit={submitForm} className="space-y-4 text-left text-stone-900 font-sans">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
            Nome do Ingrediente Extra
          </label>
          <input
            type="text"
            required
            defaultValue={name}
            onChange={(e) => (name = e.target.value)}
            className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none"
            placeholder="Ex: Blend Extra de 150g"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
            Preço Adicional (R$)
          </label>
          <input
            type="number"
            step="0.01"
            required
            defaultValue={price || ""}
            onChange={(e) => (price = Number(e.target.value))}
            className="w-full border border-stone-200/80 p-3 text-xs rounded-xl focus:outline-none"
            placeholder="0.00"
          />
        </div>
        <div className="flex items-center justify-between pt-1 select-none">
          <span className="text-xs font-bold text-stone-700">Disponível no menu de adicionais?</span>
          <button
            type="button"
            onClick={(e) => {
              active = !active;
              const btn = e.currentTarget;
              btn.innerText = active ? "Disponível (Ativo)" : "Oculto (Inativo)";
              btn.className = `px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                active
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-stone-50 border-stone-200 text-stone-400"
              }`;
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
              active
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : "bg-stone-50 border-stone-200 text-stone-400"
            }`}
          >
            {active ? "Disponível (Ativo)" : "Oculto (Inativo)"}
          </button>
        </div>
        <button
          type="submit"
          className="w-full mt-1 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center cursor-pointer"
        >
          Salvar Extra
        </button>
      </form>
    );

    const actions = (
      <button
        onClick={onCloseModal}
        className="px-4 py-2 font-bold text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
      >
        Fechar
      </button>
    );

    onShowModal(a ? "Editar Ingrediente Extra" : "Novo Adicional (Sugestão Upsell)", body, actions);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      <div className="flex justify-between items-center bg-white p-4 sm:p-5 rounded-3xl border border-stone-100">
        <span className="text-sm font-black text-[#FF3D00] uppercase tracking-wide">PAINEL GESTÃO</span>
        <div className="flex gap-3 items-center">
          <button
            onClick={onClearHistory}
            className="text-xs text-stone-400 hover:text-red-500 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar Histórico
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-stone-400 hover:text-[#FF3D00] font-bold transition flex items-center gap-1 border-l border-stone-200 pl-3 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      <div className="flex border-b border-stone-200 bg-stone-100 p-1.5 rounded-2xl select-none">
        <button
          onClick={() => setActiveTab("pedidos")}
          className={`flex-1 py-3 text-xs font-bold text-center rounded-xl transition cursor-pointer ${
            activeTab === "pedidos"
              ? "bg-white text-neutral-950 shadow-sm border border-stone-200/50"
              : "text-stone-500 hover:text-neutral-950"
          }`}
        >
          📋 Pedidos Recebidos
        </button>
        <button
          onClick={() => setActiveTab("produtos")}
          className={`flex-1 py-3 text-xs font-bold text-center rounded-xl transition cursor-pointer ${
            activeTab === "produtos"
              ? "bg-white text-neutral-950 shadow-sm border border-stone-200/50"
              : "text-stone-500 hover:text-neutral-950"
          }`}
        >
          🍔 Cardápio
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 py-3 text-xs font-bold text-center rounded-xl transition cursor-pointer ${
            activeTab === "config"
              ? "bg-white text-neutral-950 shadow-sm border border-stone-200/50"
              : "text-stone-500 hover:text-neutral-950"
          }`}
        >
          ⚙️ Configurações
        </button>
      </div>

      {/* Tab 1: Orders Queue */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          {/* Automation Control Panel */}
          <div className="bg-[#FF3D00]/5 border border-[#FF3D00]/15 rounded-[2rem] p-5 flex flex-col sm:flex-row gap-4 justify-between items-center text-left select-none">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF3D00]/10 p-2.5 rounded-2xl text-[#FF3D00] shrink-0">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Automação de Recebimento</h4>
                <p className="text-[11px] text-stone-500 leading-normal mt-0.5">Ative sinais sonoros e envie cupons diretamente para a impressora assim que entrarem no sistema.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSoundAlertActive?.(!soundAlertActive)}
                className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  soundAlertActive
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <span>{soundAlertActive ? "🔔 Som Ligado" : "🔕 Som Mudo"}</span>
              </button>
              <button
                type="button"
                onClick={() => setAutoPrintActive?.(!autoPrintActive)}
                className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-black border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  autoPrintActive
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <span>{autoPrintActive ? "🖨️ Auto-Imprimir" : "🔇 Manual"}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-stone-400 text-left">
            * Se a aba estiver aberta e conectada à nuvem, os pedidos serão listados de forma síncrona.
          </p>
          {ordersHistory.length === 0 ? (
            <div className="text-center py-16 bg-white border border-stone-100 rounded-[2rem]">
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">
                Nenhum pedido recente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ordersHistory.map((o) => (
                <div
                  key={o.id}
                  className="bg-white p-5 rounded-3xl border text-left space-y-3 text-stone-900 shadow-sm"
                >
                  <div className="flex justify-between font-bold text-xs">
                    <span className="text-[#FF3D00] font-mono">{o.id}</span>
                    <span className="text-stone-400 font-normal">{o.dataHora}</span>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">{o.nome}</p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">{o.telefone}</p>
                  </div>
                  <div className="bg-stone-50/50 border border-stone-100 p-3 rounded-2xl text-xs text-stone-600 font-sans whitespace-pre-line leading-relaxed">
                    {o.resumoItensString}
                  </div>
                  <div className="border-t border-stone-100 pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-stone-400 block">Total</span>
                      <span className="text-base font-black text-[#FF3D00]">{formatBRL(o.total)}</span>
                    </div>
                    <span
                      className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border capitalize ${
                        o.gatewayStatus === "Aprovado"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : "bg-amber-50 border-amber-100 text-amber-700"
                      }`}
                    >
                      {o.gatewayStatus === "Aprovado" ? "Pago Online" : "Aguardando"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onPrintOrder(o.id);
                      showToast(`Cupom ${o.id} enviado para impressão!`, "success");
                    }}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#FF3D00]" /> Imprimir Cupom Térmico (80mm)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Products Catalog Editor */}
      {activeTab === "produtos" && (
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-stone-100 pb-2">
            <button
              onClick={() => setProductSubTab("items")}
              className={`text-xs font-bold pb-2 transition-all cursor-pointer ${
                productSubTab === "items"
                  ? "text-[#FF3D00] border-b-2 border-[#FF3D00]"
                  : "text-stone-400 hover:text-neutral-950"
              }`}
            >
              🍔 Hamburgueres / Itens do Cardápio
            </button>
            <button
              onClick={() => setProductSubTab("addons")}
              className={`text-xs font-bold pb-2 transition-all cursor-pointer ${
                productSubTab === "addons"
                  ? "text-[#FF3D00] border-b-2 border-[#FF3D00]"
                  : "text-stone-400 hover:text-neutral-950"
              }`}
            >
              ➕ Adicionais Integrados (Upsell)
            </button>
          </div>

          {productSubTab === "items" ? (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-100 p-5 shadow-sm flex justify-between items-center">
                <div className="text-left font-sans">
                  <h2 className="text-base font-bold text-neutral-950">Seu Cardápio Comercial</h2>
                  <p className="text-xs text-stone-400">Insira, modifique e remova itens do seu menu.</p>
                </div>
                <button
                  onClick={() => handleOpenProductModal(null)}
                  className="bg-[#FF3D00] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#E03600] transition flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4" /> Novo Produto / Categoria
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produtos.map((p, idx) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border flex justify-between items-center text-left text-stone-900 shadow-sm transition-all duration-300"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      {/* Controls for item arrangement */}
                      <div className="grid grid-cols-3 gap-0.5 border-r border-stone-150 pr-3 mr-3 shrink-0 select-none">
                        {/* Row 1 */}
                        <div></div>
                        <button
                          type="button"
                          disabled={idx - 2 < 0}
                          onClick={() => handleMoveProduct(idx, "up")}
                          className={`p-0.5 rounded transition flex items-center justify-center ${
                            idx - 2 < 0
                              ? "text-stone-200 cursor-not-allowed"
                              : "text-stone-400 hover:bg-stone-50 hover:text-[#FF3D00] cursor-pointer"
                          }`}
                          title="Subir uma linha (Vertical)"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <div></div>

                        {/* Row 2 */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveProduct(idx, "left")}
                          className={`p-0.5 rounded transition flex items-center justify-center ${
                            idx === 0
                              ? "text-stone-200 cursor-not-allowed"
                              : "text-stone-400 hover:bg-stone-50 hover:text-[#FF3D00] cursor-pointer"
                          }`}
                          title="Mover para esquerda"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center justify-center text-[10px] font-bold text-stone-500 font-mono min-w-[18px]">
                          {idx + 1}
                        </div>
                        <button
                          type="button"
                          disabled={idx === produtos.length - 1}
                          onClick={() => handleMoveProduct(idx, "right")}
                          className={`p-0.5 rounded transition flex items-center justify-center ${
                            idx === produtos.length - 1
                              ? "text-stone-200 cursor-not-allowed"
                              : "text-stone-400 hover:bg-stone-50 hover:text-[#FF3D00] cursor-pointer"
                          }`}
                          title="Mover para direita"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Row 3 */}
                        <div></div>
                        <button
                          type="button"
                          disabled={idx + 2 >= produtos.length}
                          onClick={() => handleMoveProduct(idx, "down")}
                          className={`p-0.5 rounded transition flex items-center justify-center ${
                            idx + 2 >= produtos.length
                              ? "text-stone-200 cursor-not-allowed"
                              : "text-stone-400 hover:bg-stone-50 hover:text-[#FF3D00] cursor-pointer"
                          }`}
                          title="Descer uma linha (Vertical)"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <div></div>
                      </div>

                      <div className="truncate pr-2">
                        <p className="text-xs font-bold truncate text-stone-800">{p.nome}</p>
                        <p className="text-[10px] text-[#FF3D00] font-bold mt-1.5 flex items-center gap-2">
                          <span>{formatBRL(p.preco)}</span>
                          <span className="text-[8px] uppercase tracking-wider text-stone-400 font-extrabold font-mono bg-stone-50 px-1.5 py-0.5 rounded border border-stone-150/40">
                            {p.categoria}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenProductModal(p)}
                        className="bg-stone-50 hover:bg-stone-100 border p-2 rounded-lg text-[10px] font-bold cursor-pointer transition text-stone-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          onDeleteProduct(p.id);
                          showToast("Produto removido!", "success");
                        }}
                        className="bg-red-50 hover:bg-red-100 border border-red-100 p-2 rounded-lg text-[10px] font-bold cursor-pointer transition text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-100 p-5 shadow-sm flex justify-between items-center">
                <div className="text-left font-sans">
                  <h2 className="text-base font-bold text-neutral-950">Seção Extra de Ingredientes</h2>
                  <p className="text-xs text-stone-400">Gerencie complementos apresentados antes do pagamento.</p>
                </div>
                <button
                  onClick={() => handleOpenAddonModal(null)}
                  className="bg-[#FF3D00] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-[#E03600] transition flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Plus className="w-4 h-4" /> Novo Adicional
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adicionais.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white p-4 rounded-2xl border flex justify-between items-center text-left text-stone-900 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        {a.nome}
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border ${
                            a.ativo
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-stone-100 text-stone-400"
                          }`}
                        >
                          {a.ativo ? "Disponível" : "Oculto"}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#FF3D00] font-bold mt-1">{formatBRL(a.preco)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenAddonModal(a)}
                        className="bg-stone-50 hover:bg-stone-100 border p-2 rounded-lg text-[10px] font-bold cursor-pointer transition text-stone-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          onDeleteAddon(a.id);
                          showToast("Adicional removido!", "success");
                        }}
                        className="bg-red-50 hover:bg-red-100 border border-red-100 p-2 rounded-lg text-[10px] font-bold cursor-pointer transition text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Configuration options */}
      {activeTab === "config" && (
        <div className="bg-white rounded-3xl border border-stone-100 p-4 sm:p-5 shadow-sm space-y-5 text-left">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="text-sm font-bold flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-[#FF3D00]" /> Configurações de Integração
            </h3>
            <span
              className={`text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-stone-100 select-none ${
                supabaseStatus === "connected"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-amber-50 text-amber-500 border-amber-100"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
              {supabaseStatus === "connected" ? "● Conectado (Supabase)" : "● Offline (Local Ativo)"}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Nome do Estabelecimento (White-Label)
              </label>
              <input
                type="text"
                value={cfgStoreName}
                onChange={(e) => setCfgStoreName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                URL ou Imagem do Logotipo da Loja (Transparente / PNG / SVG)
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={cfgStoreLogoUrl}
                  onChange={(e) => setCfgStoreLogoUrl(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  placeholder="Ex: https://linkdaimagem.com/logo.png (ou faça upload abaixo)"
                />
                <div className="flex items-center gap-3">
                  <label className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition select-none border border-stone-200/60 inline-flex items-center gap-1.5 active:scale-95">
                    <Plus className="w-4 h-4 text-[#FF3D00]" /> Upload do Logotipo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {cfgStoreLogoUrl && cfgStoreLogoUrl.startsWith("data:") && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-medium border border-emerald-100">
                      Logotipo Carregado ✔
                    </span>
                  )}
                </div>
                {cfgStoreLogoUrl && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border bg-stone-50 group shadow-sm flex items-center justify-center p-2">
                    <img src={cfgStoreLogoUrl} className="max-w-full max-h-full object-contain" alt="Logo Preview" />
                    <button
                      type="button"
                      onClick={() => setCfgStoreLogoUrl("")}
                      className="absolute inset-0 bg-neutral-900/60 text-white font-bold text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                WhatsApp Geral da Loja (Para recebimento de pedidos)
              </label>
              <input
                type="text"
                value={cfgWhatsapp}
                onChange={(e) => setCfgWhatsapp(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div className="bg-[#FF3D00]/5 border border-[#FF3D00]/15 rounded-2xl p-4 space-y-2.5 text-left">
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-600">
                🌐 URL de Webhook para Notificação Automática (Opcional)
              </label>
              <input
                type="text"
                value={cfgNotificationWebhook}
                onChange={(e) => setCfgNotificationWebhook(e.target.value)}
                placeholder="Ex: https://api.callmebot.com/whatsapp.php?phone=...&text=... ou Make/n8n"
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-xs focus:outline-none placeholder-stone-400"
              />
              <p className="text-[10px] leading-relaxed text-stone-500">
                <strong>Notificação Hands-Free:</strong> Se adicionado, o sistema enviará uma requisição POST automática para esta URL o segundo que o cliente pagar. Você pode usar ferramentas como n8n, Make/Integromat, Evolution API, Z-API ou o serviço gratuito <strong>CallMeBot</strong> para disparar alertas do pedido diretamente para seu celular sem que o cliente precise clicar em nada!
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1">
                Endereço Físico (Ponto de Origem da Entrega)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={cfgStoreAddress}
                  onChange={(e) => setCfgStoreAddress(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  placeholder="Ex: Avenida Paulista, 1000 - São Paulo, SP, Brasil"
                />
                <button
                  type="button"
                  disabled={isGeocoding}
                  onClick={() => runOnDemandGeocoding(false)}
                  className="bg-orange-50 hover:bg-orange-100 text-[#FF3D00] border border-orange-100 px-3 py-2 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none shadow-sm active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF3D00]" />
                  {isGeocoding ? "Buscando no satélite..." : "Configurar Latitude e Longitude Automaticamente pelo Endereço"}
                </button>
              </div>
            </div>

            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/60 text-stone-700 space-y-1.5">
              <span className="font-extrabold text-[10px] uppercase text-[#FF3D00] tracking-wider block font-mono">⚡ Preenchimento Inteligente e Automático</span>
              <p className="text-[11px] leading-relaxed text-stone-600">
                Você <strong>não precisa</strong> preencher os números de latitude e longitude abaixo manualmente! Ao escrever o endereço acima e clicar no botão, ou simplesmente salvar os ajustes, nossa inteligência localiza as coordenadas automaticamente no mapa e preenche para você.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1 flex items-center justify-between">
                  <span>Latitude Origem</span>
                  <span className="text-[9px] text-stone-400 lowercase font-normal italic">(Gerado autom.)</span>
                </label>
                <input
                  type="text"
                  value={cfgStoreLat}
                  onChange={(e) => setCfgStoreLat(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 text-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  placeholder="Ex: -23.564551"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-1 flex items-center justify-between">
                  <span>Longitude Origem</span>
                  <span className="text-[9px] text-stone-400 lowercase font-normal italic">(Gerado autom.)</span>
                </label>
                <input
                  type="text"
                  value={cfgStoreLon}
                  onChange={(e) => setCfgStoreLon(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-200 text-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  placeholder="Ex: -46.652150"
                />
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 mt-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2 block">
                Logística de Entrega (Thresholds iFood)
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Taxa de Saída (Até 3km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgIfoodBase}
                    onChange={(e) => setCfgIfoodBase(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Valor por km adicional</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgIfoodKm}
                    onChange={(e) => setCfgIfoodKm(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2 block font-mono">
                Banco de Dados no Supabase (Opcional)
              </span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Supabase API URL</label>
                  <input
                    type="text"
                    value={cfgSupabaseUrl}
                    onChange={(e) => setCfgSupabaseUrl(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                    placeholder="https://xxxxx.supabase.co"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Anon Public Key</label>
                  <input
                    type="text"
                    name="sb_anon_key_dummy"
                    id="sb_anon_key_dummy"
                    value={cfgSupabaseKey}
                    onFocus={() => {
                      if (cfgSupabaseKey === "••••••••••••••••") {
                        setCfgSupabaseKey("");
                      }
                    }}
                    onBlur={() => {
                      if (!cfgSupabaseKey && config.supabaseKey) {
                        setCfgSupabaseKey("••••••••••••••••");
                      }
                    }}
                    onChange={(e) => setCfgSupabaseKey(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                    placeholder="Cole a Anon Public Key se quiser alterar..."
                    autoComplete="off"
                    data-lpignore="true"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2 block font-mono">
                Pagamentos com Mercado Pago (Pix e Cartão)
              </span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Chave Pública do Mercado Pago (Public Key)</label>
                  <input
                    type="text"
                    value={cfgMpPubKey}
                    onChange={(e) => setCfgMpPubKey(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                    placeholder="Ex: APP_USR-... ou sb_publishable_..."
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Token de Acesso do Mercado Pago (Access Token)</label>
                  <input
                    type="text"
                    name="mp_access_token_dummy"
                    id="mp_access_token_dummy"
                    value={cfgMpAccessToken}
                    onFocus={() => {
                      if (cfgMpAccessToken === "••••••••••••••••") {
                        setCfgMpAccessToken("");
                      }
                    }}
                    onBlur={() => {
                      if (!cfgMpAccessToken && config.mpAccessToken) {
                        setCfgMpAccessToken("••••••••••••••••");
                      }
                    }}
                    onChange={(e) => setCfgMpAccessToken(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                    placeholder="Cole o Access Token se quiser alterar..."
                    autoComplete="off"
                    data-lpignore="true"
                  />
                </div>
              </div>
            </div>

            {/* Weekly Business Hours */}
            <div className="border-t border-stone-100 pt-4">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400 mb-2 block font-mono">
                🕒 Horário de Atendimento Semanal
              </span>
              <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
                Configure os dias em que a hamburgueria está aberta e os respectivos horários de atendimento. Pedidos fora destes horários serão informados no checkout.
              </p>
              
              <div className="space-y-3">
                {[
                  { name: "Domingo", index: 0 },
                  { name: "Segunda-feira", index: 1 },
                  { name: "Terça-feira", index: 2 },
                  { name: "Quarta-feira", index: 3 },
                  { name: "Quinta-feira", index: 4 },
                  { name: "Sexta-feira", index: 5 },
                  { name: "Sábado", index: 6 },
                ].map((d) => {
                  const dayConfig = cfgBusinessHours[d.index] || { open: "18:00", close: "23:00", closed: false };
                  
                  return (
                    <div key={d.index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-150/60 shadow-sm transition hover:border-stone-250">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${dayConfig.closed ? "bg-stone-300" : "bg-emerald-500 animate-pulse"}`}></div>
                        <span className="text-xs font-extrabold text-stone-700 w-24">{d.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...cfgBusinessHours };
                            updated[d.index] = { ...dayConfig, closed: !dayConfig.closed };
                            setCfgBusinessHours(updated);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer select-none ${
                            dayConfig.closed
                              ? "bg-stone-200 text-stone-505 border border-stone-300"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}
                        >
                          {dayConfig.closed ? "🔒 Fechado" : "🟢 Aberto"}
                        </button>
                        
                        {!dayConfig.closed && (
                          <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                            <input
                              type="time"
                              value={dayConfig.open || "18:00"}
                              onChange={(e) => {
                                const updated = { ...cfgBusinessHours };
                                updated[d.index] = { ...dayConfig, open: e.target.value };
                                setCfgBusinessHours(updated);
                              }}
                              className="bg-white border border-stone-200 rounded-xl px-2 py-1.5 text-xs text-stone-700 focus:outline-none font-medium shadow-sm"
                            />
                            <span className="font-mono text-[9px] text-stone-400">às</span>
                            <input
                              type="time"
                              value={dayConfig.close || "23:00"}
                              onChange={(e) => {
                                const updated = { ...cfgBusinessHours };
                                updated[d.index] = { ...dayConfig, close: e.target.value };
                                setCfgBusinessHours(updated);
                              }}
                              className="bg-white border border-stone-200 rounded-xl px-2 py-1.5 text-xs text-stone-700 focus:outline-none font-medium shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full mt-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none font-mono"
          >
            <Save className="w-4 h-4 text-[#FF3D00]" /> Gravar Ajustes de Gerência
          </button>
        </div>
      )}
    </div>
  );
}
