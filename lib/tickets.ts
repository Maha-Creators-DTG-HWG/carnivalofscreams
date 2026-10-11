export type PassStatus = "on-sale" | "sold-out" | "upcoming";

export type Pass = {
  id: string;
  kicker: string;
  name: string;
  price: string;
  description: string;
  status: PassStatus;
};

export const PASSES: Pass[] = [
  {
    id: "blind-1-day",
    kicker: "1 Day Pass",
    name: "Blind Ticket",
    price: "Rp75.000",
    description: "Your first access to The Arrival starts now.",
    status: "sold-out",
  },
  {
    id: "early-bird-1-day",
    kicker: "1 Day Pass",
    name: "Early Bird",
    price: "Rp99.000",
    description: "Secure yours before they disappear into the unknown.",
    status: "sold-out",
  },
  {
    id: "presale-1",
    kicker: "1 Day Pass",
    name: "Presale 1",
    price: "Rp129.000",
    description: "Prepare your circle to explore the other side!",
    status: "sold-out",
  },
  {
    id: "presale-2",
    kicker: "GET PRESALE 2",
    name: "Presale 2",
    price: "Rp149.000",
    description: "The next wave is open. Bring your circle through.",
    status: "on-sale",
  },
  // {
  //   id: "general-admission",
  //   kicker: "1 Day Pass",
  //   name: "General Admission",
  //   price: "Rp199.000",
  //   description: "The full price. Last pass to open.",
  //   status: "upcoming",
  // },
];

/** Currently available pass, used for nav deep-links into the tickets section. */
export const ACTIVE_PASS =
  PASSES.find((pass) => pass.status === "on-sale") ?? PASSES[0];
