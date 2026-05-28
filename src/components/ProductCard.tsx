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
  if (layoutMode === "grid") {
    return (
      <div
        onClick={onSelect}
        className="bg-white rounded-[2rem] border border-stone-100 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg hover:border-stone-200 transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
      >
        <div className="relative overflow-hidden w-full h-40 sm:h-48 md:h-52 bg-stone-100">
          <img
            src={product.img}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            alt={product.nome}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/300x200/f1f5f9/94a3b8?text=${encodeURIComponent(
                product.nome
              )}`;
            }}
          />
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-extrabold text-neutral-950 text-sm sm:text-base group-hover:text-[#FF3D00] transition-colors line-clamp-1">
              {product.nome}
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxedHeight">
              {product.descricao}
            </p>
          </div>
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1">
            <span className="text-[#FF3D00] font-black text-sm sm:text-base whitespace-nowrap">
              {formatBRL(product.preco)}
            </span>
            <div
              className="flex items-center bg-stone-50 rounded-full p-1 border"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onDecrease}
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-stone-100 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xs font-bold w-6 text-center">{quantity}</span>
              <button
                onClick={onIncrease}
                className="w-6 h-6 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-[#E03600] transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List Mode layout
  return (
    <div
      onClick={onSelect}
      className="bg-white p-4 rounded-3xl border border-stone-100 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
    >
      <img
        src={product.img}
        className="w-24 h-24 rounded-2xl object-cover shrink-0"
        alt={product.nome}
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://placehold.co/150x150/f1f5f9/94a3b8?text=${encodeURIComponent(
            product.nome
          )}`;
        }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-neutral-950 text-base truncate">{product.nome}</h3>
        <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxedHeight">
          {product.descricao}
        </p>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-50">
          <span className="text-[#FF3D00] font-black text-sm sm:text-base">
            {formatBRL(product.preco)}
          </span>
          <div
            className="flex items-center bg-stone-50 rounded-full p-1 border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDecrease}
              className="w-6 h-6 bg-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-stone-100 transition active:scale-90"
            >
              -
            </button>
            <span className="text-xs font-bold w-6 text-center">{quantity}</span>
            <button
              onClick={onIncrease}
              className="w-6 h-6 bg-[#FF3D00] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm hover:bg-[#E03600] transition active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
