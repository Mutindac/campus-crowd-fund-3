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

    console.log(`📊 Found ${campaigns.length} campaigns in database`);

    // Transform to match frontend Campaign interface
    const formattedCampaigns = campaigns.map(campaign => {
      const progress = campaign.goalKES > 0 
        ? (campaign.totalDonationsKES / campaign.goalKES) * 100 
        : 0;
      const daysRemaining = Math.max(0, Math.ceil((campaign.deadline - Math.floor(Date.now() / 1000)) / 86400));

      return {
        campaignId: campaign.campaignId,
        creator: campaign.creator?.walletAddress || campaign.creatorId?.toString() || '0x0000000000000000000000000000000000000000',
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

    console.log(`✅ Returning ${formattedCampaigns.length} formatted campaigns`);

    res.json({ 
      success: true, 
      data: { campaigns: formattedCampaigns } 
    });
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id);
    console.log(`📡 Fetching campaign ID: ${campaignId}`);
    
    if (isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid campaign ID' },
      });
    }
    
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
      console.log(`❌ Campaign ${campaignId} not found`);
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
    }
    
    console.log(`✅ Found campaign: ${campaign.title}`);

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
      creator: campaign.creator?.walletAddress || '0x0000000000000000000000000000000000000000',
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
    const { title, description, goalKES, deadline, milestones } = req.body;
    const userId = req.user.id;

    console.log('📝 Creating campaign:', { title, userId, milestonesCount: milestones?.length });

    // Validation
    if (!title || !description || !goalKES || !deadline || !milestones || !Array.isArray(milestones)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: title, description, goalKES, deadline, milestones'
        }
      });
    }

    if (milestones.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one milestone is required'
        }
      });
    }

    // Calculate conversion (using fallback rate for now)
    const conversionRate = parseInt(process.env.FALLBACK_KES_PER_AVAX) || 146500;
    const goalAVAX = (parseFloat(goalKES) / conversionRate).toFixed(12);

    // Calculate total milestone amounts
    const totalMilestoneKES = milestones.reduce((sum, m) => sum + parseFloat(m.amountKES || 0), 0);
    
    // Validate milestone total matches goal (allow 1 KES difference for rounding)
    if (Math.abs(totalMilestoneKES - parseFloat(goalKES)) > 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Milestone total (${totalMilestoneKES}) must equal campaign goal (${goalKES})`
        }
      });
    }

    // Get the next campaignId (find max and add 1, or start at 0)
    const maxCampaign = await prisma.campaign.findFirst({
      orderBy: { campaignId: 'desc' },
      select: { campaignId: true }
    });
    const nextCampaignId = maxCampaign ? maxCampaign.campaignId + 1 : 0;

    console.log(`📊 Next campaign ID: ${nextCampaignId}`);

    // Create campaign in database with milestones
    const campaign = await prisma.campaign.create({
      data: {
        campaignId: nextCampaignId,
        creatorId: userId,
        title: title.trim(),
        description: description.trim(),
        goalKES: parseInt(goalKES),
        goalAVAX,
        conversionRate,
        conversionTimestamp: Math.floor(Date.now() / 1000),
        deadline: parseInt(deadline),
        milestonesCount: milestones.length,
        milestones: {
          create: milestones.map((milestone, index) => ({
            index,
            description: milestone.description.trim(),
            amountKES: parseInt(milestone.amountKES),
            amountAVAX: (parseFloat(milestone.amountKES) / conversionRate).toFixed(12),
          }))
        }
      },
      include: {
        creator: {
          select: {
            name: true,
            walletAddress: true,
          }
        }
      }
    });

    console.log(`✅ Campaign created: ${campaign.title} (ID: ${campaign.campaignId})`);

    res.status(201).json({
      success: true,
      data: {
        campaignId: campaign.campaignId,
        message: 'Campaign created successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    next(error);
  }
});

router.post('/:id/donate', authenticate, async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { donor, amountKES } = req.body;

    console.log(`💰 Donation received: ${amountKES} KES to campaign ${campaignId} from ${donor}`);

    // Validation
    if (!donor || !amountKES) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: donor, amountKES'
        }
      });
    }

    if (isNaN(campaignId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid campaign ID'
        }
      });
    }

    const amount = parseFloat(amountKES);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Donation amount must be greater than 0'
        }
      });
    }

    // Find campaign
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId },
      include: {
        donations: true
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found'
        }
      });
    }

    // Calculate conversion
    const conversionRate = campaign.conversionRate;
    const amountAVAX = (amount / conversionRate).toFixed(12);

    // Check if this is a new donor (check if this donor has donated before)
    const existingDonations = campaign.donations.filter(d => d.donor.toLowerCase() === donor.toLowerCase());
    const isNewDonor = existingDonations.length === 0;
    const newDonorCount = isNewDonor ? campaign.donorCount + 1 : campaign.donorCount;

    // Update campaign totals
    const newTotalKES = campaign.totalDonationsKES + parseInt(amount);
    const newTotalAVAX = (parseFloat(campaign.totalDonationsAVAX) + parseFloat(amountAVAX)).toFixed(12);
    const goalReached = newTotalKES >= campaign.goalKES;

    // Create donation record
    const donation = await prisma.donation.create({
      data: {
        campaignId: campaign.id,
        donor,
        amountKES: parseInt(amount),
        amountAVAX,
        timestamp: Math.floor(Date.now() / 1000),
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}` // Placeholder - replace with real tx hash
      }
    });

    // Update campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        totalDonationsKES: newTotalKES,
        totalDonationsAVAX: newTotalAVAX,
        donorCount: newDonorCount,
        goalReached
      }
    });

    console.log(`✅ Donation saved: ${amountKES} KES (${amountAVAX} AVAX) to campaign ${campaignId}`);
    console.log(`📊 Campaign progress: ${newTotalKES}/${campaign.goalKES} KES (${((newTotalKES / campaign.goalKES) * 100).toFixed(2)}%)`);

    res.json({
      success: true,
      data: {
        transactionHash: donation.transactionHash,
        donor,
        amountKES: parseInt(amount),
        amountAVAX,
        campaignId,
        totalDonationsAVAX: newTotalAVAX,
        totalDonationsKES: newTotalKES,
        newProgress: (newTotalKES / campaign.goalKES) * 100,
        goalReached
      }
    });
  } catch (error) {
    console.error('❌ Error processing donation:', error);
    next(error);
  }
});

export default router;

