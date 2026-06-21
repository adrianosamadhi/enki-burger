/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Truck,
  User,
  CreditCard,
  QrCode,
  Smartphone,
  ShieldCheck,
  Calculator,
  Check,
  AlertTriangle,
  Copy,
  ShoppingBag,
} from "lucide-react";
import { CartItem, StoreConfig, ClientProfile } from "../types";
import { formatBRL, formatCEP, fetchAddressByCEP, getCartItemTotalPrice, isStoreOpen } from "../utils";

interface CheckoutViewProps {
  carrinho: Record<string, CartItem>;
  config: StoreConfig;
  clientProfile: ClientProfile | null;
  deliveryFee: number | null;
  deliveryDistance: number | null;
  deliveryType: "entrega" | "retirada";
  onDeliveryTypeChange: (type: "entrega" | "retirada") => void;
  onCalculateRoute: (street: string, number: string, neighborhood: string, cep: string) => Promise<void>;
  onSetManualDistance?: (km: number) => void;
  onSaveProfile: (
    nome: string,
    telefone: string,
    rua: string,
    numero: string,
    bairro: string,
    cep: string,
    referencia: string
  ) => void;
  onFinalizeOrder: (
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
    deliveryType?: "entrega" | "retirada"
  ) => void;
  onBackToMenu: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
  onShowModal: (title: string, body: React.ReactNode, actions: React.ReactNode) => void;
  onCloseModal: () => void;
}

const getApiUrl = (suffix: string): string => {
  return suffix;
};

export function CheckoutView({
  carrinho,
  config,
  clientProfile,
  deliveryFee,
  deliveryDistance,
  deliveryType,
  onDeliveryTypeChange,
  onCalculateRoute,
  onSetManualDistance,
  onSaveProfile,
  onFinalizeOrder,
  onBackToMenu,
  showToast,
  onShowModal,
  onCloseModal,
}: CheckoutViewProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [reference, setReference] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Cartão" | "Maquininha" | "">("");
  const [cardType, setCardType] = useState<"Débito" | "Crédito" | "">("");
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  // Auto fill details if user profile exists and auto-calculate delivery fee
  useEffect(() => {
    if (clientProfile && !hasAutoFilled) {
      setPhone(clientProfile.telefone);
      setName(clientProfile.nome);
      if (clientProfile.cep) setCep(clientProfile.cep);
      if (clientProfile.rua) setStreet(clientProfile.rua);
      if (clientProfile.numero) setNumber(clientProfile.numero);
      if (clientProfile.bairro) setNeighborhood(clientProfile.bairro);
      setReference(clientProfile.referencia || "");
      setHasAutoFilled(true);

      // Auto-calculate delivery fee if address is complete, deliveryType is "entrega" and deliveryFee is not yet calculated
      if (
        clientProfile.rua &&
        clientProfile.numero &&
        deliveryType === "entrega" &&
        deliveryFee === null
      ) {
        setCalculatingRoute(true);
        onCalculateRoute(
          clientProfile.rua,
          clientProfile.numero,
          clientProfile.bairro || "",
          clientProfile.cep || ""
        ).finally(() => {
          setCalculatingRoute(false);
        });
      }
    }
  }, [clientProfile, hasAutoFilled, deliveryType, deliveryFee, onCalculateRoute]);

  useEffect(() => {
    const handler = () => {
      executeCheckoutSubmit();
    };
    window.addEventListener("sidebar-checkout-submit", handler);
    return () => window.removeEventListener("sidebar-checkout-submit", handler);
  }, [name, phone, cep, street, number, neighborhood, reference, paymentMethod, cardType, deliveryFee, carrinho, config, deliveryType, deliveryDistance]);

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCep(formatted);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      handleCEPLookup(clean);
    }
  };

  const handleCEPLookup = async (cleanCep: string) => {
    showToast("Buscando dados do CEP...", "success");
    const address = await fetchAddressByCEP(cleanCep);
    if (address && !address.erro) {
      setStreet(address.rua);
      setNeighborhood(address.bairro);
      showToast("Endereço preenchido!", "success");
    } else {
      showToast("CEP não encontrado. Digite manualmente.", "error");
    }
  };

  const handleRouteCalc = async () => {
    if (!street || !number) {
      showToast("Preencha a Rua e o Número para calcular o frete.", "error");
      return;
    }
    setCalculatingRoute(true);
    await onCalculateRoute(street, number, neighborhood, cep);
    setCalculatingRoute(false);
  };

  const executeCheckoutSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      showToast("Preencha o Nome Completo e o WhatsApp.", "error");
      return;
    }

    if (deliveryType === "entrega") {
      if (!street.trim() || !number.trim()) {
        showToast("Insira o Endereço com Rua e Número válidos para entrega.", "error");
        return;
      }
      if (deliveryFee === null) {
        showToast("Por favor, calcule a taxa de entrega antes de continuar.", "error");
        return;
      }
      if (config.maxDeliveryKm && config.maxDeliveryKm > 0 && deliveryDistance !== null && deliveryDistance > config.maxDeliveryKm) {
        showToast(`Limite de distância excedido. Oferecemos entrega apenas para um raio de até ${config.maxDeliveryKm}km. Por favor, marque 'Retirada na Loja'.`, "error");
        return;
      }
    }

    if (!paymentMethod) {
      showToast("Selecione uma Forma de Pagamento.", "error");
      return;
    }
    if (paymentMethod === "Cartão" && !cardType) {
      showToast("Escolha se irá pagar em Débito ou Crédito.", "error");
      return;
    }

    const items = Object.values(carrinho);
    const subtotal = items.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
    const total = subtotal + (deliveryType === "retirada" ? 0 : (deliveryFee || 0));

    // Optimistically save profile so they don't lose data if payment is rejected
    onSaveProfile(name, phone, street, number, neighborhood, cep, reference);

    // Mercado Pago Client-Side REST API for Pix payments
    if (paymentMethod === "Pix") {
      showToast("Integrando com Mercado Pago...", "success");
      
      try {
        const mpAccessToken = config.mpAccessToken;

        let pId;
        let pixKey;
        let isSimulation = false;
        
        try {
          try {
            const mpRes = await fetch(getApiUrl("/api/checkout/mp"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                paymentMethod: "Pix",
                total: Number(total),
                name,
                phone,
                email: "compras@enkiburger.com.br",
                storeName: config.storeName || "Enki Burger",
                mpAccessToken: config.mpAccessToken
              })
            });

            if (mpRes.ok) {
              const data = await mpRes.json();
              pId = data.paymentId;
              pixKey = data.pixKey;
              isSimulation = data.isSimulation;
            } else {
              throw new Error("Server proxy failure status");
            }
          } catch (serverErr) {
            console.warn("Server proxy failed, calling Mercado Pago API directly from browser:", serverErr);
            
            const mpAccessToken = config.mpAccessToken;
            if (!mpAccessToken?.trim()) {
              throw new Error("Token do Mercado Pago ausente. Configure na página do administrador.");
            }
            
            const names = name.trim().split(" ");
            const directRes = await fetch("https://api.mercadopago.com/v1/payments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${mpAccessToken}`,
                "X-Idempotency-Key": "enki-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
              },
              body: JSON.stringify({
                transaction_amount: Number(Number(total).toFixed(2)),
                description: `Compra - ${config.storeName || "Enki Burger"}`,
                payment_method_id: "pix",
                payer: {
                  email: "compras@enkiburger.com.br",
                  first_name: names[0] || "Cliente",
                  last_name: names.slice(1).join(" ") || "Enki"
                }
              })
            });

            if (!directRes.ok) {
              let errInfoText = "";
              try {
                const errData = await directRes.json();
                errInfoText = errData.message || errData.error || JSON.stringify(errData);
              } catch (jsonErr) {
                errInfoText = "Falha ao analisar a resposta de erro do MP.";
              }
              console.error("Mercado Pago API Pix Error:", errInfoText);
              throw new Error(errInfoText || "Credenciais inválidas ou erro MP");
            }

            const data = await directRes.json();
            pId = data.id;
            pixKey = data.point_of_interaction?.transaction_data?.qr_code;
          }
        } catch (networkErr: any) {
          console.warn("Server checkout fail:", networkErr.message || networkErr);
          throw new Error(networkErr.message || "Falha na comunicação com o Servidor (Token Inválido).");
        }

        const handleCopyKey = () => {
          navigator.clipboard.writeText(pixKey);
          showToast("Código Copiado!", "success");
        };

        const body = (
          <div className="space-y-4 text-center py-2 text-stone-900 select-none">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 block">
              PAGAMENTO PIX MERCADO PAGO
            </span>
            <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
              Leia o código QR no app do seu banco ou copie a chave Pix abaixo.
            </p>
            
            <div className="bg-stone-50 p-4 rounded-xl inline-block border border-stone-200/50">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixKey)}`} 
                className="w-36 h-36 mx-auto rounded-lg shadow-sm" 
                alt="QR Code Pix"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative mt-2">
              <textarea
                readOnly
                value={pixKey}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-[10px] font-mono h-16 focus:outline-none focus:border-blue-500 text-stone-600 resize-none overflow-hidden"
                id="pix-textarea-detail"
              />
              <button
                onClick={handleCopyKey}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Código
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-[11px] font-bold text-stone-600 animate-pulse">
                Aguardando confirmação do pagamento...
              </p>
            </div>
          </div>
        );

        let pollingInterval: any;
        let isPolling = true;

        const stopPolling = () => {
          isPolling = false;
          if (pollingInterval) clearTimeout(pollingInterval);
        };

            const checkStatus = async () => {
              if (!isPolling) return;

              let mpAccessToken = config.mpAccessToken?.trim();
              
              if (mpAccessToken) {
                 try {
                     const mpApiUrl = `https://api.mercadopago.com/v1/payments/${pId}`;
                     const s = await fetch(mpApiUrl, {
                         headers: { "Authorization": `Bearer ${mpAccessToken}` }
                     });
                     
                     if (s.ok) {
                         const sj = await s.json();
                         if (sj.status === "approved" || sj.status === "authorized") {
                             showToast("Pagamento Pix recebido com sucesso!", "success");
                             onCloseModal();
                             onFinalizeOrder(name, phone, street, number, neighborhood, cep, reference, "Pix", "", pId, "Aprovado", deliveryType);
                             stopPolling();
                             return;
                         } 
                     }
                 } catch (directErr) {
                     try {
                         const mpApiUrl = getApiUrl(`/api/checkout/mp/status/${pId}?token=${encodeURIComponent(mpAccessToken)}`);
                         const s = await fetch(mpApiUrl);
                         const sj = await s.json();
                         if (sj.status === "approved" || sj.status === "authorized") {
                             showToast("Pagamento Pix recebido com sucesso!", "success");
                             onCloseModal();
                             onFinalizeOrder(name, phone, street, number, neighborhood, cep, reference, "Pix", "", pId, "Aprovado", deliveryType);
                             stopPolling();
                             return;
                         } 
                     } catch (e) {
                         // Ignorar silenciosamente e tentar de novo no próximo poll
                     }
                 }
              }

              if (isPolling) {
                  pollingInterval = setTimeout(checkStatus, 5000);
              }
            };

        // Start polling after 5 seconds
        pollingInterval = setTimeout(checkStatus, 5000);

        const actions = (
          <React.Fragment>
            <button
              onClick={() => {
                stopPolling();
                onCloseModal();
              }}
              className="px-4 py-3 font-bold text-xs text-stone-500 hover:text-stone-700 bg-stone-100/50 hover:bg-stone-100 rounded-xl transition-colors font-sans w-full"
            >
              Cancelar Pedido
            </button>
          </React.Fragment>
        );

        onShowModal("Pagar com Pix", body, actions);

      } catch (err: any) {
        showToast(err.message || "Falha na conexão com servidor do Mercado Pago.", "error");
      }

    } else if (paymentMethod === "Cartão") {
      showToast("Iniciando checkout de cartão...", "success");
      
      try {
        const mpAccessToken = config.mpAccessToken;

        let pId;
        let initPoint = "";
        let isSimulation = false;
        
        try {
          try {
            const mpRes = await fetch(getApiUrl("/api/checkout/mp"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                paymentMethod: "Cartão",
                total: Number(total),
                name,
                phone,
                email: "compras@enkiburger.com.br",
                storeName: config.storeName || "Enki Burger",
                mpAccessToken: config.mpAccessToken
              })
            });

            if (mpRes.ok) {
              const data = await mpRes.json();
              pId = data.paymentId;
              initPoint = data.initPoint;
              isSimulation = data.isSimulation;
            } else {
              throw new Error("Server proxy failure status");
            }
          } catch (serverErr) {
            console.warn("Server proxy failed, calling Mercado Pago API directly from browser for preferences:", serverErr);
            
            const mpAccessToken = config.mpAccessToken;
            if (!mpAccessToken?.trim()) {
              throw new Error("Token do Mercado Pago ausente. Configure na página do administrador.");
            }
            
            const directRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${mpAccessToken}`
              },
              body: JSON.stringify({
                items: [
                  {
                    title: `Compra - ${config.storeName || "Enki Burger"}`,
                    description: "Pedido online",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: Number(Number(total).toFixed(2))
                  }
                ],
                payer: {
                  email: "compras@enkiburger.com.br",
                  name: name
                }
              })
            });

            if (!directRes.ok) {
              let errInfoText = "";
              try {
                const errData = await directRes.json();
                errInfoText = errData.message || errData.error || JSON.stringify(errData);
              } catch (jsonErr) {
                errInfoText = "Failed to parse error response from MP.";
              }
              console.error("Mercado Pago API Preference Error:", errInfoText);
              throw new Error(errInfoText || "Erro ao gerar link de pagamento.");
            }

            const data = await directRes.json();
            pId = data.id;
            initPoint = data.init_point;
            isSimulation = false;
          }
        } catch (networkErr: any) {
          console.warn("Server checkout preferences fail:", networkErr.message || networkErr);
          throw new Error(networkErr.message || "Falha na comunicação com o Servidor (Token Inválido).");
        }

        // Real Mercado Pago Hosted Preference Checkout! (Direct and secure routing to credit card, pix, ticket, etc.)
        const body = (
            <div className="space-y-4 text-center py-2 text-stone-900 select-none font-sans">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-650 flex items-center justify-center mb-1">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-600 block">LINK SEGURO DE CHECKOUT GERADO</span>
              <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
                Clique no botão abaixo para preencher os dados de cartão no ambiente criptografado e 100% seguro do Mercado Pago.
              </p>
              
              <a 
                href={initPoint}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md font-sans"
              >
                Ir para o Mercado Pago
              </a>

              <button
                onClick={() => {
                  onCloseModal();
                  onFinalizeOrder(
                    name, phone, street, number, neighborhood, cep, reference, `Mercado Pago Checkout`, "Crédito", pId, "Aprovado", deliveryType
                  );
                }}
                className="w-full mt-3 bg-[#FF3D00] hover:bg-[#E03600] text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md font-sans"
              >
                Já realizei o pagamento (Enviar Pedido)
              </button>
            </div>
          );

          onShowModal("Segurança Mercado Pago", body, null);

      } catch (err: any) {
        showToast(err.message || "Erro de conexão com o Mercado Pago.", "error");
      }

    } else if (paymentMethod === "Maquininha" || paymentMethod === "Maquininha na Entrega") {
      onFinalizeOrder(
        name,
        phone,
        street,
        number,
        neighborhood,
        cep,
        reference,
        deliveryType === "retirada" ? "Pagar na Retirada (Balcão)" : "Maquininha na Entrega",
        "",
        "PAY-ON-DELIVERY",
        "Pendente",
        deliveryType
      );
    }
  };

  const items = Object.values(carrinho);
  const subtotal = items.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
  const grandTotal = subtotal + (deliveryFee || 0);

  return (
    <div className="space-y-6">
      <button
        onClick={onBackToMenu}
        className="flex items-center gap-1.5 text-stone-500 font-bold text-xs hover:text-neutral-950 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Cardápio
      </button>

      {!isStoreOpen(config.businessHours) && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 text-left flex gap-3.5 items-start shadow-sm">
          <AlertTriangle className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-amber-800">Fechado no Momento</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              O estabelecimento encontra-se fora do horário de atendimento neste momento. Você ainda pode concluir e enviar seu pedido, mas observe que ele poderá ser visualizado ou preparado apenas no próximo período do expediente.
            </p>
          </div>
        </div>
      )}

      {/* Cart Summary for Mobile view */}
      <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 shadow-sm lg:hidden select-none">
        <h3 className="text-sm font-bold text-neutral-950 mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#FF3D00]" /> Itens Selecionados
        </h3>
        <div id="checkout-items-list" className="divide-y divide-stone-100 text-sm">
          {items.map((item) => (
            <div key={item.cartKey} className="flex flex-col py-2.5 border-b border-stone-100 last:border-none">
              <div className="flex justify-between items-center text-stone-900">
                <div>
                  <span className="font-extrabold text-[#FF3D00]">{item.qtd}x</span>
                  <span className="font-bold ml-1.5">{item.nome}</span>
                </div>
                <span className="font-extrabold">{formatBRL(getCartItemTotalPrice(item))}</span>
              </div>
              {item.adicionais && item.adicionais.length > 0 && (
                <div className="text-[10px] text-stone-500 mt-1 pl-2 space-y-0.5 border-l-2 border-stone-150 font-sans">
                  {item.adicionais.map((addon) => (
                    <div key={addon.id} className="flex justify-between items-center text-stone-500">
                      <span>+ {addon.qtd}x {addon.nome}</span>
                      <span>{formatBRL(addon.preco * addon.qtd * item.qtd)}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.observacoes && (
                <span className="text-[11px] text-orange-600 bg-orange-50 px-2 py-1 rounded-lg mt-1 font-medium inline-block w-fit">
                  📝 Obs: {item.observacoes}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Client Information Form */}
      <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 shadow-sm space-y-3 text-left">
        <div className="flex justify-between items-center pb-2 border-b border-stone-50">
          <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2 font-mono">
            <User className="w-4 h-4 text-[#FF3D00]" /> Seus Dados de Contato
          </h3>
          {clientProfile && (
            <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
              ✓ Perfil Sincronizado
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              WhatsApp / Celular
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00] transition"
              placeholder="Ex: 11999999999"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00] transition"
              placeholder="Digite seu nome"
            />
          </div>
        </div>
      </div>

      {/* Delivery / Pickup Method Selector */}
      <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 shadow-sm space-y-3 text-left select-none">
        <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2 font-mono">
          <Truck className="w-4 h-4 text-[#FF3D00]" /> Método de Entrega
        </h3>
        <p className="text-xs text-stone-500 leading-normal font-sans">
          Como você deseja receber o seu pedido? Entregamos até <strong>3km</strong> ou você pode retirar conosco!
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onDeliveryTypeChange("entrega")}
            className={`border-2 rounded-xl p-2.5 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
              deliveryType === "entrega"
                ? "border-[#FF3D00] bg-red-50/10 text-[#FF3D00]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="text-[11px] font-bold font-sans">Entrega no Endereço</span>
          </button>

          <button
            onClick={() => onDeliveryTypeChange("retirada")}
            className={`border-2 rounded-xl p-2.5 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
              deliveryType === "retirada"
                ? "border-[#FF3D00] bg-red-50/10 text-[#FF3D00]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[11px] font-bold font-sans">Retirar na Loja</span>
          </button>
        </div>
      </div>

      {/* Address Calculation Details or Pickup Information */}
      {deliveryType === "entrega" ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 shadow-sm space-y-3 text-left">
          <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2 font-mono">
            <Truck className="w-4 h-4 text-[#FF3D00]" /> CEP e Endereço de Entrega
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={cep}
                  onChange={handleCEPChange}
                  className="w-full bg-stone-50 border border-stone-200/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                  placeholder="00000-000"
                />
              </div>
              <button
                onClick={() => handleCEPLookup(cep)}
                className="bg-black hover:bg-neutral-800 text-white font-bold text-xs h-[46px] rounded-xl transition shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Buscar Endereço
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Rua / Avenida
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                  placeholder="Nº"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Complemento / Referência
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                  placeholder="Apto, bloco, portão..."
                />
              </div>
            </div>

            {config.maxDeliveryKm && config.maxDeliveryKm > 0 && deliveryDistance !== null && deliveryDistance > config.maxDeliveryKm && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 flex items-start gap-2.5 my-2 animate-in fade-in duration-200 leading-relaxed text-left">
                <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-sm">⚠️ Fora do raio de entrega (Máximo {config.maxDeliveryKm} km)</span>
                  <p className="text-stone-600 mt-1">
                    Infelizmente, só realizamos entregas em um raio de até <strong>{config.maxDeliveryKm.toFixed(1)} km</strong> da nossa estabelecimento.
                  </p>
                  <p className="text-stone-600 mt-1">
                    O seu endereço atual está a <strong>{deliveryDistance.toFixed(1)} km</strong> de distância.
                  </p>
                  <p className="text-[#FF3D00] font-black mt-2">
                    Por favor, mude a sua modalidade de frete para "Retirar na Loja" para poder concluir seu pedido sem entrega!
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleRouteCalc}
              disabled={calculatingRoute}
              className="w-full bg-neutral-900 border border-stone-800 hover:bg-neutral-800 text-white font-bold text-sm py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {calculatingRoute ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Calculator className="w-4 h-4 text-[#FF3D00]" />
              )}
              Calcular Taxa de Entrega (OSRM iFood Router)
            </button>

            {onSetManualDistance && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Ou informar distância manual (KM)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 2.5"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        onSetManualDistance(val);
                      }
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF3D00]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 text-left space-y-2 select-none animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <ShoppingBag className="w-5 h-5 text-emerald-650 shrink-0 animate-bounce" />
            <span className="text-sm font-bold font-mono">Você escolheu Retirar na Loja (Balcão)</span>
          </div>
          <div className="text-xs text-emerald-700 leading-relaxed font-sans space-y-1">
            <p>Prepare-se para nos fazer uma visita e retirar o seu hambúrguer quentinhi!</p>
            <p className="pt-1 text-emerald-900 font-extrabold">📍 Endereço de Retirada:</p>
            <p className="text-neutral-950 font-bold bg-white px-3 py-2.5 rounded-xl border border-emerald-100 mt-0.5 shadow-sm leading-normal">
              {config.storeAddress}
            </p>
          </div>
        </div>
      )}

      {/* Payment Picker Container */}
      <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 shadow-sm space-y-3 text-left">
        <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2 font-mono">
          <CreditCard className="w-4 h-4 text-[#FF3D00]" /> Escolha como deseja pagar
        </h3>
        <div className="grid grid-cols-3 gap-2 select-none">
          <button
            onClick={() => {
              setPaymentMethod("Pix");
              setCardType("");
            }}
            className={`border-2 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
              paymentMethod === "Pix"
                ? "border-[#FF3D00] bg-red-50/10 text-[#FF3D00]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[11px] font-bold">Pix</span>
          </button>

          <button
            onClick={() => setPaymentMethod("Cartão")}
            className={`border-2 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
              paymentMethod === "Cartão"
                ? "border-[#FF3D00] bg-red-50/10 text-[#FF3D00]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[11px] font-bold">Cartão</span>
          </button>

          <button
            onClick={() => {
              setPaymentMethod("Maquininha");
              setCardType("");
            }}
            className={`border-2 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
              paymentMethod === "Maquininha"
                ? "border-[#FF3D00] bg-red-50/10 text-[#FF3D00]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[11px] font-bold">Maquininha</span>
          </button>
        </div>

        {/* Card choice options */}
        {paymentMethod === "Cartão" && (
          <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in duration-200 select-none">
            <button
              onClick={() => setCardType("Débito")}
              className={`py-3 rounded-xl text-sm font-bold border transition active:scale-95 cursor-pointer ${
                cardType === "Débito"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : "bg-stone-50 border-stone-200 text-stone-600"
              }`}
            >
              Débito
            </button>
            <button
              onClick={() => setCardType("Crédito")}
              className={`py-3 rounded-xl text-sm font-bold border transition active:scale-95 cursor-pointer ${
                cardType === "Crédito"
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : "bg-stone-50 border-stone-200 text-stone-600"
              }`}
            >
              Crédito
            </button>
          </div>
        )}

        {/* Gate banner notice */}
        {(paymentMethod === "Pix" || paymentMethod === "Cartão") && (
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 text-xs text-blue-800 flex items-start gap-2.5 mt-2 animate-in fade-in duration-200">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">Integração Mercado Pago Ativa</span>
              <p className="text-stone-500 mt-1 leading-relaxed">
                O faturamento online será processado em ambiente criptografado de segurança.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bill summary layout */}
      <div className="bg-neutral-950 text-white rounded-2xl p-3 sm:p-4 space-y-2 shadow-xl relative overflow-hidden border border-white/5 select-none text-left">
        <div className="flex justify-between text-xs text-stone-400">
          <span>Subtotal:</span>
          <span className="font-semibold text-stone-200">{formatBRL(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-stone-400 items-center">
          <span className="flex items-center gap-1">
            Taxa de Entrega:
            {deliveryType === "entrega" && deliveryDistance !== null && (
              <span className="bg-[#FF3D00]/20 text-[#FF3D00] font-extrabold px-1.5 py-0.5 rounded text-[9px]">
                {deliveryDistance.toFixed(1)} km
              </span>
            )}
          </span>
          <span className="font-semibold text-stone-200">
            {deliveryType === "retirada" ? "Grátis (Retirada)" : (deliveryFee !== null ? formatBRL(deliveryFee) : "Calcule o frete...")}
          </span>
        </div>
        <hr className="border-white/10 my-1" />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Total do Pedido
          </span>
          <span className="text-2xl font-black text-[#FF3D00]">
            {formatBRL(deliveryType === "retirada" ? subtotal : grandTotal)}
          </span>
        </div>
      </div>

      {/* Mobile Submit Trigger Button */}
      <div className="lg:hidden pt-2">
        <button
          onClick={executeCheckoutSubmit}
          disabled={deliveryType === "entrega" && deliveryDistance !== null && deliveryDistance > 3}
          className={`w-full font-black py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg cursor-pointer ${
            deliveryType === "entrega" && deliveryDistance !== null && deliveryDistance > 3
              ? "bg-neutral-800 text-stone-500 cursor-not-allowed opacity-40 border border-neutral-700"
              : "bg-[#FF3D00] hover:bg-[#E03600] text-white"
          }`}
        >
          {deliveryType === "entrega" && deliveryDistance !== null && deliveryDistance > 3 ? (
            <span>Entrega Indisponível (Fora do Alcance de 3km)</span>
          ) : (
            <>
              Confirmar e Pagar <Check className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
