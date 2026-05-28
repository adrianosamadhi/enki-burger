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
}: CartSidebarProps) {
  const items = Object.values(carrinho);
  const count = items.reduce((acc, item) => acc + item.qtd, 0);
  const subtotal = items.reduce((acc, item) => acc + getCartItemTotalPrice(item), 0);
  const actualFreight = deliveryType === "retirada" ? 0 : (deliveryFee || 0);
  const grandTotal = subtotal + actualFreight;

  return (
    <div className="hidden lg:block lg:col-span-4 sticky top-28 bg-white border border-stone-100 rounded-[2rem] p-6 shadow-sm space-y-6 select-none">
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
          <svg className="w-28 h-28 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 65,55 C 65,31 79,24 100,24 C 121,24 135,31 135,55 Z"
              stroke="#FF3D00"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M 62,64 C 71,61 76,68 83,64 C 90,61 97,68 104,64 C 111,61 118,68 125,64 C 132,61 138,64 138,64" stroke="#FF3D00" strokeWidth="4.5" strokeLinecap="round" />
            <path
              d="M 68,73 L 91,73 L 100,83 L 109,73 L 132,73 C 136,73 136,83 132,83 L 68,83 C 64,83 64,73 68,73 Z"
              stroke="#000000"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 68,88 L 132,88 C 136,88 136,98 132,98 L 68,98 C 64,98 64,88 68,88 Z"
              stroke="#000000"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 73,115 L 55,115 C 49,115 49,124 55,124 L 69,124 M 55,124 C 49,124 49,133 55,133 L 73,133"
              stroke="#FF3D00"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 85,133 L 85,115 L 106,133 L 106,115"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M 118,133 L 118,115 M 139,115 L 120,124 L 139,133" stroke="#000000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 151,115 L 151,133" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
            <path d="M 42,158 L 54,158" stroke="#FF3D00" strokeWidth="3.5" strokeLinecap="round" />
            <text
              x="100"
              y="163"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="900"
              fontSize="14"
              letterSpacing="7"
              fill="#000000"
              textAnchor="middle"
            >
              BURGER
            </text>
            <path d="M 146,158 L 158,158" stroke="#FF3D00" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
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
                {deliveryType === "retirada" ? "Grátis (Retirada)" : (deliveryFee !== null ? formatBRL(deliveryFee) : "Consulte...")}
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
              <button
                onClick={onSubmit}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg cursor-pointer animate-pulse"
              >
                Pagar <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
