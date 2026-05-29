/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  categoria: string;
  nome: string;
  descricao: string;
  preco: number;
  img: string;
  adicionaisPermitidos?: string[];
}

export interface Addon {
  id: string;
  nome: string;
  preco: number;
  ativo: boolean;
}

export interface CartItem {
  cartKey: string; // can be id alone or custom combination, e.g. "id_someobs"
  id: string;
  nome: string;
  preco: number;
  qtd: number;
  observacoes: string;
  img?: string;
  isAddon?: boolean;
  adicionais?: { id: string; nome: string; preco: number; qtd: number }[];
}

export interface StoreConfig {
  whatsapp: string;
  supabaseUrl: string;
  supabaseKey: string;
  ifoodBase: number;
  ifoodKm: number;
  mpPubKey: string;
  mpAccessToken?: string;
  storeName: string;
  storeLogoUrl: string;
  storeAddress: string;
  storeLat: string;
  storeLon: string;
  businessHours?: any;
  productOrder?: string[];
}

export interface ClientProfile {
  telefone: string;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  referencia?: string;
}

export interface Order {
  id: string;
  dataHora: string;
  nome: string;
  telefone: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  resumoItensString: string;
  total: number;
  subtotal: number;
  frete: number;
  pagamento: string;
  gatewayId: string;
  gatewayStatus: string;
  detalhesEstruturados: CartItem[];
}
