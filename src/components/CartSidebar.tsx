/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShoppingBag, ArrowRight, Check } from "lucide-react";
import { CartItem } from "../types";
import { formatBRL, getCartItemTotalPrice } from "../utils";

interface CartSidebarProps {
  carrinho: Record<string, CartItem>;
  deliveryFee: number | null;
  deliveryType?: "entrega" | "retirada";
  onIncrease: (cartKey: string) => void;
  onDecrease: (cartKey: string) => void;
  onAdvance: () => void;
  onSubmit: () => void;
  isCheckoutView: boolean;
  isClosed?: boolean;
  deliveryDistance?: number | null;
  maxDeliveryKm?: number;
}

export function CartSidebar({
  carrinho,
  deliveryFee,
  deliveryType = "entrega",
  onIncrease,
  onDecrease,
  onAdvance,
  onSubmit,
  isCheckoutView,
  isClosed = false,
  deliveryDistance = null,
  maxDeliveryKm = 0,
}: CartSidebarProps) {
  const items = Object.values(carrinho);
  const count = items.reduce((acc, item) => acc + item.qtd, 0);
  const subtotal = items.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
  const actualFreight = deliveryType === "retirada" ? 0 : (deliveryFee || 0);
  const grandTotal = subtotal + actualFreight;

  return (
    <div className="hidden lg:block lg:col-span-4 sticky top-28 bg-white border border-stone-100 rounded-[2rem] p-4 sm:p-5 shadow-sm space-y-6 select-none">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-base font-black text-neutral-950 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#FF3D00]" /> Seu Pedido
        </h3>
        <span className="bg-[#FF3D00] text-white font-black text-xs px-2.5 py-1 rounded-full">
          {count} Itens
        </span>
      </div>

      {count === 0 ? (
        <div className="text-center py-8 space-y-4">
          <img loading="lazy" src="/icon_enki.png" alt="Enki Burger Icon" className="w-24 h-24 mx-auto object-contain opacity-80 mix-blend-multiply" />
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">
            Adicione hambúrgueres para iniciar.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-stone-100 max-h-[40vh] overflow-y-auto no-scrollbar space-y-3">
            {items.map((item) => (
              <div key={item.cartKey} className="flex flex-col py-3 border-b border-stone-100 last:border-none">
                <div className="flex justify-between items-center text-stone-900">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-extrabold text-[#FF3D00]">{item.qtd}x</span>
                    <span className="text-neutral-950 font-bold ml-1.5 block md:inline truncate">
                      {item.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-950 whitespace-nowrap">
                      {formatBRL(getCartItemTotalPrice(item))}
                    </span>
                    <div className="flex items-center bg-stone-50 rounded-full border">
                      <button
                        onClick={() => onDecrease(item.cartKey)}
                        className="w-5 h-5 bg-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm hover:bg-stone-100 transition active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-bold w-5 text-center">{item.qtd}</span>
                      <button
                        onClick={() => onIncrease(item.cartKey)}
                        className="w-5 h-5 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm hover:bg-[#E03600] transition active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {item.adicionais && item.adicionais.length > 0 && (
                  <div className="text-[10px] text-stone-500 mt-1 pl-2.5 space-y-0.5 border-l-2 border-stone-150 font-sans">
                    {item.adicionais.map((addon) => (
                      <div key={addon.id} className="flex justify-between items-center text-stone-500">
                        <span>+ {addon.qtd}x {addon.nome}</span>
                        <span>{formatBRL(addon.preco * addon.qtd * item.qtd)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {item.observacoes && (
                  <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 font-medium inline-block w-fit">
                    Obs: {item.observacoes}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Subtotal dos itens</span>
              <span className="font-bold text-neutral-950">{formatBRL(subtotal)}</span>
            </div>
             <div className="flex justify-between text-xs text-stone-500">
              <span>Taxa de Entrega</span>
              <span className="font-bold text-neutral-950">
                {deliveryType === "retirada"
                  ? "Grátis (Retirada)"
                  : (deliveryDistance !== null && maxDeliveryKm > 0 && deliveryDistance > maxDeliveryKm)
                    ? <span className="text-red-600 font-bold">Fora da área de entrega</span>
                    : (deliveryFee !== null ? formatBRL(deliveryFee) : "Consulte...")}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-black text-neutral-950 pt-2 border-t">
              <span>Total</span>
              <span className="text-xl text-[#FF3D00]">{formatBRL(grandTotal)}</span>
            </div>

            {!isCheckoutView ? (
              <button
                onClick={onAdvance}
                className="w-full bg-black hover:bg-neutral-800 text-white font-black py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
              >
                Avançar para Pagamento <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                {isClosed && (
                  <div className="text-red-600 bg-red-50 border border-red-200 text-xs font-bold py-2.5 px-3 rounded-xl text-center mb-2 font-sans">
                    Loja fechada. Não é possível realizar novos pedidos no momento.
                  </div>
                )}
                <button
                  onClick={onSubmit}
                  disabled={isClosed || (deliveryType === "entrega" && deliveryDistance !== null && maxDeliveryKm > 0 && deliveryDistance > maxDeliveryKm)}
                  className={`w-full font-black py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg ${
                    isClosed
                      ? "bg-neutral-200 text-stone-400 cursor-not-allowed border border-stone-300"
                      : (deliveryType === "entrega" && deliveryDistance !== null && maxDeliveryKm > 0 && deliveryDistance > maxDeliveryKm)
                        ? "bg-neutral-800 text-stone-500 cursor-not-allowed opacity-40 border border-neutral-700"
                        : "bg-green-600 hover:bg-green-700 text-white cursor-pointer animate-pulse"
                  }`}
                >
                  {deliveryType === "entrega" && deliveryDistance !== null && maxDeliveryKm > 0 && deliveryDistance > maxDeliveryKm ? (
                    <span>Fora da área de entrega</span>
                  ) : (
                    <>
                      Pagar <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
