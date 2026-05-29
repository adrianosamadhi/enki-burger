/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, CookingPot } from "lucide-react";
import { StoreConfig, ClientProfile } from "../types";
import { isStoreOpen } from "../utils";

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
              src={config.storeLogoUrl.trim()}
              className="h-13 sm:h-[52px] md:h-[56px] w-auto object-contain transition-all"
              alt={config.storeName}
            />
          ) : config.storeName.toLowerCase().includes("enki") ? (
            <svg className="h-[58px] sm:h-[64px] md:h-[68px] w-auto transition-all" viewBox="0 0 240 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 15,30 C 15,16 23,12 35,12 C 47,12 55,16 55,30 Z"
                stroke="#FF3D00"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 13,35 C 18,33 21,37 25,35 C 29,33 33,37 37,35 C 41,33 45,37 49,35 C 53,33 57,35 57,35"
                stroke="#FF3D00"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M 17,40 L 30,40 L 35,46 L 40,40 L 53,40 C 55.5,40 55.5,46 53,46 L 17,46 C 14.5,46 14.5,40 17,40 Z"
                stroke="#000000"
                strokeWidth="2.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 17,49 L 53,49 C 55.5,49 55.5,55 53,55 L 17,55 C 14.5,55 14.5,49 17,49 Z"
                stroke="#000000"
                strokeWidth="2.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 98,22 L 78,22 C 70,22 70,33.5 78,33.5 L 94,33.5 M 78,33.5 C 70,33.5 70,45 78,45 L 98,45"
                stroke="#FF3D00"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 112,45 L 112,22 L 138,45 L 138,22"
                stroke="#000000"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 152,45 L 152,22 M 178,22 L 154,33.5 L 178,45"
                stroke="#000000"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M 192,22 L 192,45" stroke="#000000" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M 75,59 L 90,59" stroke="#FF3D00" strokeWidth="2.5" strokeLinecap="round" />
              <text
                x="128.5"
                y="63"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontWeight="800"
                fontSize="12"
                letterSpacing="5"
                fill="#000000"
                textAnchor="middle"
              >
                BURGER
              </text>
              <path d="M 167,59 L 182,59" stroke="#FF3D00" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
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
