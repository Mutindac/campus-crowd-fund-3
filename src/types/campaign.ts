export interface Milestone {
  index: number;
  description: string;
  amountKES: number;
  amountAVAX: string;
  released: boolean;
  votesFor: number;
  votesAgainst: number;
  evidenceURI: string;
  proposedAt: number;
  voteProgress?: {
    totalVotes: number;
    quorumReached: boolean;
    approvalPercent: number;
    canFinalize: boolean;
  };
}

export interface Campaign {
  campaignId: number;
  creator: string;
  title: string;
  description: string;
  goalKES: number;
  goalAVAX: string;
  totalDonationsAVAX: string;
  totalDonationsKES: number;
  conversionRate: number;
  conversionTimestamp: number;
  deadline: number;
  goalReached: boolean;
  finalized: boolean;
  donorCount: number;
  milestonesCount: number;
  progress?: number;
  daysRemaining?: number;
}

export interface Donation {
  donor: string;
  amountAVAX: string;
  amountKES: number;
  timestamp: number;
  transactionHash: string;
}

export interface PriceData {
  KES_per_AVAX: number;
  AVAX_per_KES: number;
  timestamp: number;
  sources: {
    AVAX_USD: string;
    USD_KES: string;
  };
  AVAX_USD_price: number;
  USD_KES_rate: number;
}
