import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AUCTION_ITEMS } from '../data/auctions';
import { LocalBid } from '../data/auctions';

interface AuctionState {
  bids: LocalBid[];
  placeAuctionBid: (auctionId: string, amount: number) => LocalBid;
  reset: () => void;
}

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set, get) => ({
      bids: [],
      placeAuctionBid: (auctionId, amount) => {
        const auction = AUCTION_ITEMS.find((item) => item.id === auctionId);
        if (!auction) throw new Error('That auction is no longer available.');
        if (amount < auction.lowestBid) throw new Error(`Your bid must be at least ₦${auction.lowestBid.toLocaleString()}.`);
        const bid: LocalBid = {
          id: `bid_${Date.now()}`,
          auctionId,
          amount,
          status: amount >= auction.highestBid ? 'leading' : 'outbid',
          createdAt: new Date().toISOString(),
        };
        const bids = get().bids.map((entry) =>
          entry.auctionId === auctionId && entry.status === 'leading' ? { ...entry, status: 'outbid' as const } : entry
        );
        set({ bids: [bid, ...bids] });
        return bid;
      },
      reset: () => set({ bids: [] }),
    }),
    {
      name: 'crowdstock-auctions',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
