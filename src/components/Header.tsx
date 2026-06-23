/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, CookingPot } from "lucide-react";
import { StoreConfig, ClientProfile } from "../types";
import { isStoreOpen, getOptimizedImageUrl } from "../utils";

interface HeaderProps {
  config: StoreConfig;
  clientProfile: ClientProfile | null;
  onProfileClick: () => void;
  onLogoClick: () => void;
}

export function Header({ config, clientProfile, onProfileClick, onLogoClick }: HeaderProps) {
  const isOpen = isStoreOpen(config.businessHours);

  return (
    <header className="bg-white text-neutral-950 sticky top-0 z-30 border-b border-stone-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* White-Label Logo Render */}
        <div className="flex items-center cursor-pointer select-none" onClick={onLogoClick} id="header-logo">
          {config.storeLogoUrl && config.storeLogoUrl.trim() !== "" ? (
            <img
              loading="lazy"
              src={getOptimizedImageUrl(config.storeLogoUrl.trim())}
              className="h-13 sm:h-[52px] md:h-[56px] w-auto object-contain transition-all"
              alt={config.storeName}
            />
          ) : config.storeName.toLowerCase().includes("enki") ? (
            <div className="flex items-center gap-2">
              <img loading="lazy" src="/icon_enki.png" className="h-[48px] sm:h-[55px] w-auto object-contain drop-shadow-sm" alt="Enki Burger Icon" />
              <h1 className="font-extrabold text-xl tracking-tight text-neutral-900 flex flex-col leading-none uppercase ml-1">
                <span>{config.storeName}</span>
                <span className="text-[10px] text-[#FF3D00] tracking-widest font-black mt-0.5">
                  Cardápio Digital
                </span>
              </h1>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#FF3D00] text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-500/20">
                <CookingPot className="w-5.5 h-5.5" />
              </div>
              <h1 className="font-extrabold text-lg tracking-tight text-neutral-900 flex flex-col leading-none uppercase">
                <span>{config.storeName}</span>
                <span className="text-[9px] text-[#FF3D00] tracking-widest font-black mt-0.5">
                  Cardápio Digital
                </span>
              </h1>
            </div>
          )}
        </div>

        {/* Operating status badge and User Action */}
        <div className="flex items-center gap-3">
          {isOpen ? (
            <span className="hidden md:flex bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider items-center gap-1.5 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aberto para pedidos
            </span>
          ) : (
            <span className="hidden md:flex bg-rose-50 text-rose-600 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider items-center gap-1.5 border border-rose-100">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Fechado no momento
            </span>
          )}

          <button
            id="btn-client-profile"
            onClick={onProfileClick}
            className="bg-stone-50 hover:bg-stone-100 text-neutral-950 border border-stone-200/60 px-4 py-2.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-95"
          >
            <User className="w-5 h-5 text-[#FF3D00]" />
            <span className="text-xs font-bold text-stone-600 truncate max-w-[120px]">
              {clientProfile ? clientProfile.nome.split(" ")[0] : "Entrar / Cadastrar"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
