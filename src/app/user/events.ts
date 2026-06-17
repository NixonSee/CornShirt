//It's a dummy event data, must replace this with data from your events and ticket_types tables.
export type FilterOption = "latest" | "coming-soon" | "ending-soon";

export type ConcertPass = {
  name: string;
  description: string;
  priceEth: number;
  soldOut?: boolean;
};

export type ConcertDrop = {
  slug: string;
  title: string;
  status: string;
  statusClass: string;
  date: string;
  location: string;
  action: string;
  favorite: boolean;
  imagePosition: string;
  latestRank: number;
  comingSoonRank: number;
  endingSoonRank: number;
  heroTitle: string;
  fullDate: string;
  venue: string;
  description: string;
  lineup: {
    role: string;
    name: string;
    detail: string;
  }[];
  contractAddress: string;
  network: string;
  passes: ConcertPass[];
};

export const filterOptions: { label: string; value: FilterOption }[] = [
  { label: "Latest", value: "latest" },
  { label: "Coming Soon", value: "coming-soon" },
  { label: "Ending Soon", value: "ending-soon" },
];

export const drops: ConcertDrop[] = [
  {
    slug: "neon-velocity-fest",
    title: "Neon Velocity Fest",
    status: "Verified Drop",
    statusClass: "bg-slate-950 text-white",
    date: "Nov 24",
    location: "MetaCity",
    action: "Reserve Seat",
    favorite: true,
    imagePosition: "object-center",
    latestRank: 5,
    comingSoonRank: 2,
    endingSoonRank: 4,
    heroTitle: "Neon Velocity Festival 2024",
    fullDate: "Nov 24, 2026 - 22:00 UTC",
    venue: "MetaCity Sector 4, Kuala Lumpur",
    description:
      "Step into a high-frequency concert built for verified access. Neon Velocity Fest pairs immersive stage visuals with blockchain-backed tickets, collectible access passes, and secure secondary-market ownership.",
    lineup: [
      { role: "Headliner", name: "Cipher_X", detail: "Techno-Core Specialist" },
      { role: "Support", name: "Glitch.Mind", detail: "Experimental Audio" },
      { role: "Visuals", name: "VOID_", detail: "Generative Light AI" },
    ],
    contractAddress: "0x74f5...ff00",
    network: "Ethereum Mainnet",
    passes: [
      { name: "General Admission", description: "Standard floor access and concert entry.", priceEth: 0.05 },
      { name: "VIP Backstage", description: "Priority entry, VIP lounge, and NFT commemorative.", priceEth: 0.12 },
      { name: "Early Bird", description: "Special rate for early supporters.", priceEth: 0.035, soldOut: true },
    ],
  },
  {
    slug: "crypto-console-2024",
    title: "Crypto Console 2024",
    status: "Auction Live",
    statusClass: "bg-lime-300 text-slate-950",
    date: "2h 14m Left",
    location: "VIP Tier",
    action: "Reserve Seat",
    favorite: false,
    imagePosition: "object-[34%_52%]",
    latestRank: 6,
    comingSoonRank: 6,
    endingSoonRank: 1,
    heroTitle: "Crypto Console 2024",
    fullDate: "Oct 24, 2026 - 22:00 UTC",
    venue: "Neo-Shibuya Sector 7, Tokyo",
    description:
      "A decentralized audio-visual concert where blockchain culture meets the beat. Crypto Console brings world-class synth artists, verified ticket minting, and exclusive marketplace access into one high-voltage night.",
    lineup: [
      { role: "Headliner", name: "Cipher_X", detail: "Techno-Core Specialist" },
      { role: "Support", name: "Glitch.Mind", detail: "Experimental Audio" },
      { role: "Visuals", name: "VOID_", detail: "Generative Art AI" },
    ],
    contractAddress: "0x92a1...c01e",
    network: "Ethereum Mainnet",
    passes: [
      { name: "General Admission", description: "Standard floor access and festival entry.", priceEth: 0.05 },
      { name: "VIP Backstage", description: "Priority entry, VIP lounge, and NFT commemorative.", priceEth: 0.12 },
      { name: "Early Bird", description: "Special rate for early supporters.", priceEth: 0.035, soldOut: true },
    ],
  },
  {
    slug: "zenith-arena-open",
    title: "Zenith Arena Open",
    status: "Sold Out Soon",
    statusClass: "bg-slate-950 text-white",
    date: "Dec 12",
    location: "Sector 7",
    action: "Reserve Seat",
    favorite: false,
    imagePosition: "object-[78%_50%]",
    latestRank: 4,
    comingSoonRank: 3,
    endingSoonRank: 3,
    heroTitle: "Zenith Arena Open",
    fullDate: "Dec 12, 2026 - 20:30 UTC",
    venue: "Sector 7 Arena, Singapore",
    description:
      "A stadium-scale concert drop with verified seat ownership, luminous stage design, and instant pass confirmation. Zenith Arena Open is built for collectors who want their concert access secured on-chain.",
    lineup: [
      { role: "Headliner", name: "Nova Rae", detail: "Future Pop" },
      { role: "Support", name: "Pulseform", detail: "Live Modular Synth" },
      { role: "Visuals", name: "LightGrid", detail: "Laser Systems" },
    ],
    contractAddress: "0xf11a...92ef",
    network: "Polygon",
    passes: [
      { name: "Arena Seat", description: "Reserved bowl seating and event entry.", priceEth: 0.042 },
      { name: "Floor Access", description: "Standing floor access near the stage.", priceEth: 0.088 },
      { name: "Collector Pass", description: "Premium view and commemorative NFT.", priceEth: 0.14 },
    ],
  },
  {
    slug: "aurora-chain-nights",
    title: "Aurora Chain Nights",
    status: "Verified Drop",
    statusClass: "bg-slate-950 text-white",
    date: "Dec 18",
    location: "Skyline Hall",
    action: "Reserve Seat",
    favorite: false,
    imagePosition: "object-[48%_38%]",
    latestRank: 3,
    comingSoonRank: 4,
    endingSoonRank: 5,
    heroTitle: "Aurora Chain Nights",
    fullDate: "Dec 18, 2026 - 21:00 UTC",
    venue: "Skyline Hall, Seoul",
    description:
      "A night of panoramic visuals, verified entry, and collectible concert credentials. Aurora Chain Nights blends melodic bass, holographic staging, and transparent ticket ownership.",
    lineup: [
      { role: "Headliner", name: "Luma Vale", detail: "Melodic Bass" },
      { role: "Support", name: "Orbital Kid", detail: "Progressive House" },
      { role: "Visuals", name: "Northlight", detail: "Holographic Stage" },
    ],
    contractAddress: "0x38d2...aa71",
    network: "Ethereum Mainnet",
    passes: [
      { name: "General Admission", description: "Standard hall access.", priceEth: 0.046 },
      { name: "Balcony VIP", description: "Balcony view and express entry.", priceEth: 0.095 },
      { name: "Early Bird", description: "Limited early access price.", priceEth: 0.03, soldOut: true },
    ],
  },
  {
    slug: "genesis-sound-pass",
    title: "Genesis Sound Pass",
    status: "Verified Drop",
    statusClass: "bg-slate-950 text-white",
    date: "Jan 08",
    location: "Stage B",
    action: "Reserve Seat",
    favorite: false,
    imagePosition: "object-[18%_56%]",
    latestRank: 2,
    comingSoonRank: 5,
    endingSoonRank: 6,
    heroTitle: "Genesis Sound Pass",
    fullDate: "Jan 08, 2027 - 19:45 UTC",
    venue: "Stage B, Bangkok",
    description:
      "The first Genesis Sound Pass concert drop unlocks a compact, high-energy live show with collectible entry credentials and contract-level transparency for every pass minted.",
    lineup: [
      { role: "Headliner", name: "MonoArc", detail: "Live Electronica" },
      { role: "Support", name: "Kairo", detail: "Alt Dance" },
      { role: "Visuals", name: "PixelForge", detail: "Reactive LED" },
    ],
    contractAddress: "0x802c...13bd",
    network: "Base",
    passes: [
      { name: "Entry Pass", description: "Standard access and digital ticket.", priceEth: 0.033 },
      { name: "Soundcheck", description: "Early access and soundcheck entry.", priceEth: 0.079 },
      { name: "Crew Mint", description: "Backstage collectible package.", priceEth: 0.11 },
    ],
  },
  {
    slug: "mainnet-sunrise-live",
    title: "Mainnet Sunrise Live",
    status: "Auction Live",
    statusClass: "bg-lime-300 text-slate-950",
    date: "Jan 21",
    location: "Open Air",
    action: "Reserve Seat",
    favorite: false,
    imagePosition: "object-[64%_44%]",
    latestRank: 1,
    comingSoonRank: 1,
    endingSoonRank: 2,
    heroTitle: "Mainnet Sunrise Live",
    fullDate: "Jan 21, 2027 - 06:00 UTC",
    venue: "Open Air Grounds, Bali",
    description:
      "A sunrise concert for the mainnet faithful, with live electronic sets, open-air visuals, and secured pass minting. Every ticket doubles as proof of attendance after the show.",
    lineup: [
      { role: "Headliner", name: "Sol Drift", detail: "Sunrise Tech" },
      { role: "Support", name: "EchoMint", detail: "Ambient House" },
      { role: "Visuals", name: "DawnOS", detail: "Solar Projection" },
    ],
    contractAddress: "0xa67b...d420",
    network: "Ethereum Mainnet",
    passes: [
      { name: "Open Air Entry", description: "Standard sunrise concert access.", priceEth: 0.052 },
      { name: "Front Rail", description: "Priority viewing zone and NFT print.", priceEth: 0.13 },
      { name: "Early Bird", description: "Discounted sunrise access.", priceEth: 0.037, soldOut: true },
    ],
  },
];

export function getDropBySlug(slug: string) {
  return drops.find((drop) => drop.slug === slug);
}
