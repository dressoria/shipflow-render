export const benefits = [
  {
    title: "Labels in minutes",
    description:
      "Create domestic shipping labels for ecommerce orders without retyping addresses or switching carrier portals.",
    icon: "Zap",
  },
  {
    title: "Multi-carrier rates",
    description:
      "Compare USPS, UPS, FedEx, and DHL by price, service level, and delivery speed before you buy.",
    icon: "BarChart3",
  },
  {
    title: "Wallet controls",
    description:
      "Track balance, label costs, and shipping activity from one operational workspace.",
    icon: "Wallet",
  },
  {
    title: "Customer tracking",
    description:
      "Centralize package status and share clear tracking updates with buyers.",
    icon: "MapPinned",
  },
];

export const steps = [
  "Create your account and add prepaid shipping balance.",
  "Quote rates across carriers and choose the best service for each order.",
  "Generate the label, schedule pickup or drop off, and share tracking.",
];

export const couriers = [
  {
    name: "USPS",
    coverage: "U.S. nationwide",
    status: "Connected",
    initials: "US",
  },
  {
    name: "UPS",
    coverage: "Ground and express",
    status: "Connected",
    initials: "UP",
  },
  {
    name: "FedEx",
    coverage: "Home, Ground, Express",
    status: "Connected",
    initials: "FX",
  },
  {
    name: "DHL",
    coverage: "Domestic and international",
    status: "Coming soon",
    initials: "DH",
  },
];

export const faqs = [
  {
    question: "Do I need a carrier account?",
    answer:
      "No. SendiFlash connects to carrier networks on your behalf. You just enter package details and we show available rates — no carrier accounts or contracts needed.",
  },
  {
    question: "Can I compare rates before paying?",
    answer:
      "Yes. You always see rate options across carriers before creating a label. Review price, delivery speed, and carrier details before you confirm.",
  },
  {
    question: "How are fees shown?",
    answer:
      "Your total includes the shipping rate, a small service fee, and a standard payment processing fee. All fees are itemized and shown before you confirm your purchase.",
  },
  {
    question: "Can I see my label history?",
    answer:
      "Yes. All labels and shipments are saved to your account dashboard, including tracking status and label download history.",
  },
  {
    question: "Is payment secure?",
    answer:
      "Yes. SendiFlash uses secure payment processing with industry-standard encryption. Your card details are never stored on our servers.",
  },
];

export const shipments = [
  {
    id: "SF-24018",
    customer: "Avery Johnson",
    route: "New York, NY -> Chicago, IL",
    courier: "UPS",
    status: "En tránsito",
    price: 8.9,
  },
  {
    id: "SF-24017",
    customer: "Lakeside Outfitters",
    route: "Los Angeles, CA -> Austin, TX",
    courier: "FedEx",
    status: "Entregado",
    price: 12.4,
  },
  {
    id: "SF-24016",
    customer: "Mason Lee",
    route: "Miami, FL -> Seattle, WA",
    courier: "USPS",
    status: "Pendiente",
    price: 7.8,
  },
];

export const testimonials = [
  {
    quote:
      "ShipFlow feels like a grown-up shipping desk, but it is simple enough for our warehouse team.",
    name: "Nora P.",
    role: "D2C founder",
  },
  {
    quote:
      "We can explain shipping costs before checkout support tickets happen. That saves time every day.",
    name: "Marcus T.",
    role: "Ecommerce operations",
  },
  {
    quote:
      "Tracking and wallet activity in one view makes customer support much cleaner.",
    name: "Elena R.",
    role: "Logistics coordinator",
  },
];

export const metrics = [
  { label: "Labels simulated", value: "18.4k", detail: "workflow tested" },
  { label: "Time saved", value: "7h", detail: "per week" },
  { label: "Carrier options", value: "4", detail: "U.S. network" },
  { label: "UI uptime", value: "99.9%", detail: "stable prototype" },
];

export const balanceMovements = [
  { concept: "Wallet top-up", date: "12 May 2026", amount: 75 },
  { concept: "Label SF-24018", date: "12 May 2026", amount: -8.9 },
  { concept: "Label SF-24017", date: "11 May 2026", amount: -12.4 },
];
