import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// GET routes are public (no authentication required)
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    // Transform to match frontend Campaign interface
    const formattedCampaigns = campaigns.map(campaign => {
      const progress = campaign.goalKES > 0 
        ? (campaign.totalDonationsKES / campaign.goalKES) * 100 
        : 0;
      const daysRemaining = Math.max(0, Math.ceil((campaign.deadline - Math.floor(Date.now() / 1000)) / 86400));

      return {
        campaignId: campaign.campaignId,
        creator: campaign.creator.walletAddress,
        title: campaign.title,
        description: campaign.description,
        goalKES: campaign.goalKES,
        goalAVAX: campaign.goalAVAX,
        totalDonationsAVAX: campaign.totalDonationsAVAX,
        totalDonationsKES: campaign.totalDonationsKES,
        conversionRate: campaign.conversionRate,
        conversionTimestamp: campaign.conversionTimestamp,
        deadline: campaign.deadline,
        goalReached: campaign.goalReached,
        finalized: campaign.finalized,
        donorCount: campaign.donorCount,
        milestonesCount: campaign.milestonesCount,
        progress: Math.round(progress * 100) / 100,
        daysRemaining,
      };
    });

    res.json({ 
      success: true, 
      data: { campaigns: formattedCampaigns } 
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId },
      include: {
        creator: {
          select: {
            name: true,
            walletAddress: true,
          },
        },
        milestones: {
          orderBy: { index: 'asc' },
        },
        donations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
    }

    // Transform milestones
    const formattedMilestones = campaign.milestones.map(m => ({
      index: m.index,
      description: m.description,
      amountKES: m.amountKES,
      amountAVAX: m.amountAVAX,
      released: m.released,
      votesFor: m.votesFor,
      votesAgainst: m.votesAgainst,
      evidenceURI: m.evidenceURI || '',
      proposedAt: m.proposedAt,
      voteProgress: {
        totalVotes: m.votesFor + m.votesAgainst,
        quorumReached: (m.votesFor + m.votesAgainst) > 0,
        approvalPercent: (m.votesFor + m.votesAgainst) > 0 
          ? (m.votesFor / (m.votesFor + m.votesAgainst)) * 100 
          : 0,
        canFinalize: m.votesFor > m.votesAgainst && !m.released,
      },
    }));

    // Transform donations
    const formattedDonations = campaign.donations.map(d => ({
      donor: d.donor,
      amountAVAX: d.amountAVAX,
      amountKES: d.amountKES,
      timestamp: d.timestamp,
      transactionHash: d.transactionHash,
    }));

    // Transform campaign
    const progress = campaign.goalKES > 0 
      ? (campaign.totalDonationsKES / campaign.goalKES) * 100 
      : 0;
    const daysRemaining = Math.max(0, Math.ceil((campaign.deadline - Math.floor(Date.now() / 1000)) / 86400));

    const formattedCampaign = {
      campaignId: campaign.campaignId,
      creator: campaign.creator.walletAddress,
      title: campaign.title,
      description: campaign.description,
      goalKES: campaign.goalKES,
      goalAVAX: campaign.goalAVAX,
      totalDonationsAVAX: campaign.totalDonationsAVAX,
      totalDonationsKES: campaign.totalDonationsKES,
      conversionRate: campaign.conversionRate,
      conversionTimestamp: campaign.conversionTimestamp,
      deadline: campaign.deadline,
      goalReached: campaign.goalReached,
      finalized: campaign.finalized,
      donorCount: campaign.donorCount,
      milestonesCount: campaign.milestonesCount,
      progress: Math.round(progress * 100) / 100,
      daysRemaining,
    };

    res.json({
      success: true,
      data: {
        campaign: formattedCampaign,
        milestones: formattedMilestones,
        donations: formattedDonations,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST routes require authentication
router.post('/', authenticate, async (req, res, next) => {
  try {
    // TODO: Implement create campaign with smart contract interaction
    // For now, return a placeholder
    res.json({ 
      success: true, 
      data: { 
        campaignId: 0,
        message: 'Campaign creation endpoint - implement smart contract interaction'
      } 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/donate', authenticate, async (req, res, next) => {
  try {
    // TODO: Implement donate with smart contract interaction
    res.json({ 
      success: true, 
      data: { 
        transactionHash: '0x...',
        message: 'Donation endpoint - implement smart contract interaction'
      } 
    });
  } catch (error) {
    next(error);
  }
});

export default router;

