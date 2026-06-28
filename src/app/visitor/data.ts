export type EventStatus = "ACTIVE" | "SELLING FAST";

export type TicketType = {
  id: string;
  name: string;
  price: number;
  remaining: number;
  purchaseLimit: number;
  transferAllowed: boolean;
};

export type Event = {
  id: string;
  title: string;
  artist: string;
  city: string;
  category: string;
  date: string;
  price: number;
  status: EventStatus;
  description: string;
  image: string;
  accent: string;
  ticketTypes: readonly TicketType[];
};

function createTicketTypes(
  eventId: string,
  basePrice: number,
): readonly TicketType[] {
  return [
    {
      id: `${eventId}-general`,
      name: "General Admission",
      price: basePrice,
      remaining: 120,
      purchaseLimit: 4,
      transferAllowed: true,
    },
    {
      id: `${eventId}-vip`,
      name: "VIP Experience",
      price: basePrice + 45,
      remaining: 30,
      purchaseLimit: 2,
      transferAllowed: true,
    },
  ];
}

export const categories = [
  "All",
  "Rock",
  "Electronic",
  "Indie",
  "Soul",
  "Pop",
] as const;

export const events: readonly Event[] = [
  {
    id: "neon-corn-festival",
    title: "Neon Corn Festival",
    artist: "The Cob Lights",
    city: "Kuala Lumpur",
    category: "Electronic",
    date: "Jul 18, 2026",
    price: 42,
    status: "ACTIVE",
    description:
      "A neon-soaked electronic showcase where every ticket is verifiable and truly yours.",
    image: "/Artist poster 1.png",
    accent: "amber",
    ticketTypes: createTicketTypes("neon-corn-festival", 42),
  },
  {
    id: "harvest-beats-night",
    title: "Harvest Beats Night",
    artist: "Golden Husk",
    city: "Penang",
    category: "Pop",
    date: "Sep 12, 2026",
    price: 66,
    status: "ACTIVE",
    description:
      "Golden-hour pop, bright hooks, and a crowd-ready night in the heart of Penang.",
    image: "/Artist poster 2.png",
    accent: "gold",
    ticketTypes: createTicketTypes("harvest-beats-night", 66),
  },
  {
    id: "dicken-live-arena",
    title: "DICKEN Live Arena",
    artist: "Chain Pulse",
    city: "Kuala Lumpur",
    category: "Rock",
    date: "Aug 3, 2026",
    price: 70,
    status: "SELLING FAST",
    description:
      "A full-volume arena performance backed by fast, secure DICKEN ticket checkout.",
    image: "/Background Image.png",
    accent: "red",
    ticketTypes: createTicketTypes("dicken-live-arena", 70),
  },
  {
    id: "indie-kernel-sessions",
    title: "Indie Kernel Sessions",
    artist: "Soft Grain",
    city: "Johor Bahru",
    category: "Indie",
    date: "Oct 4, 2026",
    price: 38,
    status: "ACTIVE",
    description:
      "An intimate evening of warm guitars, new voices, and collectible concert memories.",
    image: "/Background Image.png",
    accent: "violet",
    ticketTypes: createTicketTypes("indie-kernel-sessions", 38),
  },
  {
    id: "soul-silo-evening",
    title: "Soul Silo Evening",
    artist: "Amber Choir",
    city: "Ipoh",
    category: "Soul",
    date: "Nov 8, 2026",
    price: 54,
    status: "ACTIVE",
    description:
      "Rich vocals and late-night soul in a close-up setting made for true music lovers.",
    image: "/Background Image.png",
    accent: "teal",
    ticketTypes: createTicketTypes("soul-silo-evening", 54),
  },
];

export function filterEvents(
  source: readonly Event[],
  query: string,
  category: string,
): Event[] {
  const normalizedQuery = query.trim().toLowerCase();

  return source.filter((event) => {
    const haystack = [
      event.title,
      event.artist,
      event.city,
      event.category,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = haystack.includes(normalizedQuery);
    const matchesCategory =
      category === "All" || event.category === category;

    return matchesQuery && matchesCategory;
  });
}

export function getEventById(eventId: string): Event | undefined {
  return events.find((event) => event.id === eventId);
}
