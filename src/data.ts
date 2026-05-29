/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Addon, StoreConfig } from "./types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p1",
    categoria: "burgers",
    nome: "Enki Premium Duplo",
    descricao: "Dois blends smash de 100g grelhados na manteiga, cheddar fatiado derretido, cebola caramelizada e molho artesanal Enki no pão brioche selado.",
    preco: 32.90,
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80",
  },
  {
    id: "p2",
    categoria: "burgers",
    nome: "Enki Cheese Clássico",
    descricao: "Pão brioche fofinho, blend 150g de carne bovina selecionada e o legítimo queijo prato derretido suavemente na chapa.",
    preco: 24.90,
    img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80",
  },
  {
    id: "p3",
    categoria: "burgers",
    nome: "Double Bacon Blast",
    descricao: "Grelhado na brasa, bacon de costela crocante em fatias generosas, barbecue artesanal e maionese defumada do chef.",
    preco: 38.90,
    img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80",
  },
  {
    id: "p4",
    categoria: "porcoes",
    nome: "Batata Suprema Cheddar & Bacon",
    descricao: "Batata frita palito crocante por fora e macia por dentro com cheddar cremoso e fatias crocantes de bacon.",
    preco: 22.00,
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80",
  },
  {
    id: "p5",
    categoria: "bebidas",
    nome: "Coca-Cola Original Lata",
    descricao: "Lata trincando de gelada 350ml.",
    preco: 6.50,
    img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80",
  },
];

export const DEFAULT_ADDONS: Addon[] = [
  { id: "a1", nome: "Blend de Carne Extra 100g", preco: 9.90, ativo: true },
  { id: "a2", nome: "Fatia de Queijo Extra", preco: 4.50, ativo: true },
  { id: "a3", nome: "Bacon Crocante Extra", preco: 6.00, ativo: true },
  { id: "a4", nome: "Cebola Caramelizada", preco: 3.50, ativo: true },
];

export const DEFAULT_BUSINESS_HOURS = {
  0: { open: "18:00", close: "23:00", closed: false }, // Domingo
  1: { open: "18:00", close: "23:00", closed: false }, // Segunda
  2: { open: "18:00", close: "23:00", closed: false }, // Terça
  3: { open: "18:00", close: "23:30", closed: false }, // Quarta
  4: { open: "18:00", close: "23:30", closed: false }, // Quinta
  5: { open: "18:00", close: "23:59", closed: false }, // Sexta
  6: { open: "18:00", close: "23:59", closed: false }, // Sábado
};

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  whatsapp: "5511975372504",
  supabaseUrl: "https://amylompetctxeaeyioig.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWxvbXBldGN0eGVhZXlpb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc1ODAsImV4cCI6MjA5NTQ4MzU4MH0.KhQEC-EcfMQXiJ0KBg0nHM-1U1etJUHjIy524cVpKU4",
  ifoodBase: 7.90,
  ifoodKm: 1.80,
  mpPubKey: "",
  storeName: "Enki Burger",
  storeLogoUrl: "",
  storeAddress: "R. Luis de Oliveira Bulhões, 564",
  storeLat: "-23.4477784",
  storeLon: "-46.6076214",
  businessHours: DEFAULT_BUSINESS_HOURS,
  notificationWebhook: "",
};
