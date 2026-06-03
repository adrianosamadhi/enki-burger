/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Product } from "../types";
import { formatBRL } from "../utils";

interface ProductCardProps {
  key?: string;
  product: Product;
  layoutMode: "list" | "grid";
  quantity: number;
  onSelect: () => void;
  onIncrease: (e: any) => void;
  onDecrease: (e: any) => void;
}

export function ProductCard({
  product,
  layoutMode,
  quantity,
  onSelect,
  onIncrease,
  onDecrease,
}: ProductCardProps) {
  const isPaused = product.isActive === false;

  const handleClick = () => {
    if (!isPaused) onSelect();
  }

  const handleInc = (e: any) => {
    if (!isPaused) onIncrease(e);
  }

  const handleDec = (e: any) => {
    if (!isPaused) onDecrease(e);
  }

  if (layoutMode === "grid") {
    return (
      <div
        onClick={handleClick}
        className={`bg-white rounded-[2rem] border flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-300 group ${
          isPaused ? "opacity-60 grayscale-[0.5] cursor-not-allowed border-stone-200" : "border-stone-100 hover:shadow-lg hover:border-stone-200 hover:-translate-y-1 cursor-pointer"
        }`}
      >
        <div className="relative overflow-hidden w-full h-40 sm:h-48 md:h-52 bg-stone-100 flex items-center justify-center">
          <img
            src={product.img && product.img.trim() !== "" ? product.img : `https://placehold.co/300x200/f1f5f9/94a3b8?text=${encodeURIComponent(product.nome)}`}
            className={`w-full h-full object-cover transition-transform duration-500 ${!isPaused && "group-hover:scale-110"}`}
            alt={product.nome}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/300x200/f1f5f9/94a3b8?text=${encodeURIComponent(product.nome)}`;
            }}
          />
          {product.precoOriginal && product.precoOriginal > product.preco && !isPaused && (
            <span className="absolute top-3 left-3 bg-[#FF3D00] text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-sm z-10 animate-pulse">
              PROMOÇÃO 🔥
            </span>
          )}
          {isPaused && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-stone-800 text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-lg shadow-sm">
                Indisponível
              </span>
            </div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h3 className={`font-extrabold text-sm sm:text-base transition-colors line-clamp-1 ${isPaused ? "text-stone-500" : "text-neutral-950 group-hover:text-[#FF3D00]"}`}>
              {product.nome}
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxedHeight">
              {product.descricao}
            </p>
          </div>
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1">
            {product.precoOriginal && product.precoOriginal > product.preco ? (
              <div className="flex flex-col">
                <span className={`${isPaused ? "text-stone-500" : "text-[#FF3D00]"} font-black text-sm sm:text-base whitespace-nowrap leading-none`}>
                  {formatBRL(product.preco)}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-stone-400 text-[10px] sm:text-[11px] line-through leading-none">
                    {formatBRL(product.precoOriginal)}
                  </span>
                  {!isPaused && (
                    <span className="bg-[#FFECE5] text-[#FF3D00] text-[9px] font-extrabold px-1 py-0.5 rounded leading-none shrink-0">
                      {Math.round(((product.precoOriginal - product.preco) / product.precoOriginal) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className={`${isPaused ? "text-stone-500" : "text-[#FF3D00]"} font-black text-sm sm:text-base whitespace-nowrap`}>
                {formatBRL(product.preco)}
              </span>
            )}
            
            {!isPaused ? (
              <div
                className="flex items-center bg-stone-50 rounded-full p-1 border"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDec}
                  className="w-6 h-6 bg-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-stone-100 transition active:scale-90"
                >
                  -
                </button>
                <span className="text-xs font-bold w-6 text-center">{quantity}</span>
                <button
                  onClick={handleInc}
                  className="w-6 h-6 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-[#E03600] transition active:scale-90"
                >
                  +
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-stone-400 border border-stone-200 px-2 py-1 rounded-full bg-stone-50">Esgotado</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List Mode layout
  return (
    <div
      onClick={handleClick}
      className={`bg-white p-4 rounded-3xl border flex gap-4 items-center transition-all duration-300 ${
        isPaused ? "opacity-60 grayscale-[0.5] cursor-not-allowed border-stone-200" : "border-stone-100 shadow-sm hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="relative shrink-0 overflow-hidden rounded-2xl w-24 h-24">
        <img
          src={product.img && product.img.trim() !== "" ? product.img : `https://placehold.co/150x150/f1f5f9/94a3b8?text=${encodeURIComponent(product.nome)}`}
          className="w-full h-full object-cover"
          alt={product.nome}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/150x150/f1f5f9/94a3b8?text=${encodeURIComponent(product.nome)}`;
          }}
        />
        {product.precoOriginal && product.precoOriginal > product.preco && !isPaused && (
          <span className="absolute -top-1.5 -left-1.5 bg-[#FF3D00] text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-sm z-10 animate-pulse">
            PROMO 🔥
          </span>
        )}
        {isPaused && (
          <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-stone-800 text-white font-black uppercase text-[8px] tracking-widest px-2 py-1 rounded shadow-sm">
              Esgotado
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-extrabold text-base truncate ${isPaused ? "text-stone-500" : "text-neutral-950"}`}>{product.nome}</h3>
        <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxedHeight">
          {product.descricao}
        </p>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-50">
          {product.precoOriginal && product.precoOriginal > product.preco ? (
            <div className="flex flex-col">
              <span className={`${isPaused ? "text-stone-500" : "text-[#FF3D00]"} font-black text-sm sm:text-base whitespace-nowrap leading-none`}>
                {formatBRL(product.preco)}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-stone-400 text-[10px] sm:text-[11px] line-through leading-none">
                  {formatBRL(product.precoOriginal)}
                </span>
                {!isPaused && (
                  <span className="bg-[#FFECE5] text-[#FF3D00] text-[9px] font-extrabold px-1 py-0.5 rounded leading-none shrink-0">
                    {Math.round(((product.precoOriginal - product.preco) / product.precoOriginal) * 100)}%
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className={`${isPaused ? "text-stone-500" : "text-[#FF3D00]"} font-black text-sm sm:text-base`}>
              {formatBRL(product.preco)}
            </span>
          )}
          
          {!isPaused ? (
            <div
              className="flex items-center bg-stone-50 rounded-full p-1 border"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDec}
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-stone-100 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xs font-bold w-6 text-center">{quantity}</span>
              <button
                onClick={handleInc}
                className="w-6 h-6 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-[#E03600] transition active:scale-90"
              >
                +
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-stone-400 border border-stone-200 px-2 py-1 rounded-full bg-stone-50">Esgotado</span>
          )}
        </div>
      </div>
    </div>
  );
}
