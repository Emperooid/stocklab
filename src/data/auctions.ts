export interface AuctionItem {
  id: string;
  title: string;
  category: string;
  image: string;
  highestBid: number;
  lowestBid: number;
  currentMarketPrice: number;
  quantity: number;
  bidders: number;
  closesAt: string;
  closesIn: string;
  caption: string;
  features: string[];
}

export interface AuctionWinner {
  id: string;
  name: string;
  product: string;
  image: string;
  discount: string;
  date: string;
}

export interface LocalBid {
  id: string;
  auctionId: string;
  amount: number;
  status: 'leading' | 'outbid' | 'won' | 'closed';
  createdAt: string;
}

export const AUCTION_ITEMS: AuctionItem[] = [
  {
    id: 'samsung-a16',
    title: 'Samsung Galaxy A16',
    category: 'Phones & Accessories',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900',
    highestBid: 180000,
    lowestBid: 120000,
    currentMarketPrice: 165000,
    quantity: 3,
    bidders: 12,
    closesAt: '10:50 AM',
    closesIn: '00:48:23',
    caption: 'Flagship performance for work, entertainment, and everyday use.',
    features: ['Fast delivery', 'Warranty included', 'Verified product'],
  },
  {
    id: 'air-fryer',
    title: 'Air Fryer 5.5L',
    category: 'Home Appliances',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900',
    highestBid: 75000,
    lowestBid: 50000,
    currentMarketPrice: 68000,
    quantity: 8,
    bidders: 8,
    closesAt: '11:50 AM',
    closesIn: '01:48:23',
    caption: 'Crispy meals with less oil and less effort.',
    features: ['5.5L capacity', 'Easy clean', 'Fast delivery'],
  },
  {
    id: 'hp-laptop',
    title: 'HP Laptop 15.6"',
    category: 'Laptops & Computers',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900',
    highestBid: 260000,
    lowestBid: 190000,
    currentMarketPrice: 245000,
    quantity: 4,
    bidders: 15,
    closesAt: '12:50 PM',
    closesIn: '02:48:23',
    caption: 'A dependable screen for work, study, and entertainment.',
    features: ['15.6 inch display', 'Delivery included', 'Verified product'],
  },
  {
    id: 'rice-cooker',
    title: 'Rice Cooker 5L',
    category: 'Home Appliances',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900',
    highestBid: 40000,
    lowestBid: 28000,
    currentMarketPrice: 36000,
    quantity: 6,
    bidders: 6,
    closesAt: '1:50 PM',
    closesIn: '03:48:23',
    caption: 'Simple, reliable cooking for everyday meals.',
    features: ['5L capacity', 'Keep warm', 'Fast delivery'],
  },
  {
    id: 'smart-tv',
    title: 'Smart TV 43"',
    category: 'Laptops & Computers',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900',
    highestBid: 320000,
    lowestBid: 240000,
    currentMarketPrice: 295000,
    quantity: 3,
    bidders: 14,
    closesAt: '2:50 PM',
    closesIn: '04:48:23',
    caption: 'Bring your favourite entertainment home.',
    features: ['43 inch display', 'Warranty included', 'Delivery included'],
  },
  {
    id: 'power-bank',
    title: 'Power Bank 10000mAh',
    category: 'Phones & Accessories',
    image: 'https://images.unsplash.com/photo-1609592424842-7d3d4b8f3f6c?w=900',
    highestBid: 25000,
    lowestBid: 16000,
    currentMarketPrice: 22000,
    quantity: 15,
    bidders: 7,
    closesAt: '4:50 PM',
    closesIn: '06:48:23',
    caption: 'Reliable power for your everyday devices.',
    features: ['10,000mAh', 'Fast charging', 'Fast delivery'],
  },
];

export const AUCTION_CATEGORIES = ['All', 'Phones', 'Appliances', 'Laptops', 'Fashion'];

export const AUCTION_WINNERS: AuctionWinner[] = [
  {
    id: 'grace-tv',
    name: 'Grace O. Adeyemi',
    product: 'Hisense 43" Smart TV',
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900',
    discount: '50% discount',
    date: 'Sep 20, 2026',
  },
  {
    id: 'tunde-phone',
    name: 'Tunde Yusuf',
    product: 'Redmi Note 13',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900',
    discount: '45% discount',
    date: 'Sep 18, 2026',
  },
  {
    id: 'bukola-airfryer',
    name: 'Bukola A. Fashola',
    product: 'Philips Airfryer',
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900',
    discount: '60% discount',
    date: 'Sep 16, 2026',
  },
];
