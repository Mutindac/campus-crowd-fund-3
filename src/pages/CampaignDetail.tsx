import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MilestoneCard } from '@/components/MilestoneCard';
import { Campaign, Milestone, Donation } from '@/types/campaign';
import { api } from '@/lib/api';
import {
  formatKES,
  formatAVAX,
  formatAddress,
  formatDate,
  formatRelativeTime,
  calculateDaysRemaining
} from '@/lib/formatters';
import {
  ArrowLeft,
  Clock,
  Users,
  Target,
  Share2,
  AlertCircle,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaign(parseInt(id));
    }
  }, [id]);

  const loadCampaign = async (campaignId: number) => {
    try {
      setLoading(true);
      const data = await api.getCampaign(campaignId);
      setCampaign(data.campaign);
      setMilestones(data.milestones);
      setDonations(data.donations);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!campaign || !donationAmount) return;

    try {
      setDonating(true);
      const amount = parseFloat(donationAmount);
      
      if (amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Demo: simulate wallet address
      const demoWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      
      await api.donate(campaign.campaignId, demoWallet, amount);
      
      toast.success('Donation successful!', {
        description: `You donated ${formatKES(amount)}`
      });
      
      setDonationAmount('');
      loadCampaign(campaign.campaignId);
    } catch (error) {
      console.error('Donation failed:', error);
      toast.error('Donation failed');
    } finally {
      setDonating(false);
    }
  };

  const handleVote = async (milestoneIndex: number, approve: boolean) => {
    if (!campaign) return;

    try {
      const demoWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      await api.voteOnMilestone(campaign.campaignId, milestoneIndex, demoWallet, approve);
      
      toast.success(approve ? 'Voted to approve' : 'Voted to reject');
      loadCampaign(campaign.campaignId);
    } catch (error) {
      console.error('Vote failed:', error);
      toast.error('Vote failed');
    }
  };

  const handleFinalize = async (milestoneIndex: number) => {
    if (!campaign) return;

    try {
      const demoWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      await api.finalizeMilestone(campaign.campaignId, milestoneIndex, demoWallet);
      
      toast.success('Milestone finalized!', {
        description: 'Funds have been released to the creator'
      });
      loadCampaign(campaign.campaignId);
    } catch (error) {
      console.error('Finalize failed:', error);
      toast.error('Failed to finalize milestone');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-4">The campaign you're looking for doesn't exist</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const daysLeft = calculateDaysRemaining(campaign.deadline);
  const progress = campaign.progress || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {campaign.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By {formatAddress(campaign.creator)}</span>
                    <span>•</span>
                    <span>Created {formatDate(campaign.conversionTimestamp)}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              <p className="text-foreground mb-6">{campaign.description}</p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatKES(campaign.totalDonationsKES)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      raised of {formatKES(campaign.goalKES)} goal
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-primary">
                    {progress.toFixed(1)}%
                  </p>
                </div>
                <Progress value={progress} className="h-3 mb-3" />
                <p className="text-xs text-muted-foreground">
                  {formatAVAX(campaign.totalDonationsAVAX)} of {formatAVAX(campaign.goalAVAX)} • Rate: {formatKES(campaign.conversionRate)}/AVAX
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{campaign.donorCount}</p>
                  <p className="text-sm text-muted-foreground">Donors</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{daysLeft}</p>
                  <p className="text-sm text-muted-foreground">Days Left</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{campaign.milestonesCount}</p>
                  <p className="text-sm text-muted-foreground">Milestones</p>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="milestones" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="donations">Donations</TabsTrigger>
              </TabsList>

              <TabsContent value="milestones" className="space-y-4 mt-6">
                {milestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone.index}
                    milestone={milestone}
                    onVote={(approve) => handleVote(milestone.index, approve)}
                    onFinalize={() => handleFinalize(milestone.index)}
                    canVote={!milestone.released && milestone.proposedAt > 0}
                    canFinalize={!milestone.released && milestone.voteProgress?.canFinalize || false}
                  />
                ))}
              </TabsContent>

              <TabsContent value="donations" className="space-y-4 mt-6">
                {donations.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No donations yet</p>
                  </Card>
                ) : (
                  donations.map((donation, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {formatAddress(donation.donor)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(donation.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            {formatKES(donation.amountKES)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatAVAX(donation.amountAVAX)}
                          </p>
                          <a
                            href={`https://testnet.snowtrace.io/tx/${donation.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 justify-end mt-1"
                          >
                            View TX <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Donate Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Support This Campaign
              </h3>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Donation Amount (KES)
                </label>
                <Input
                  type="number"
                  placeholder="10,000"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="mb-2"
                />
                {donationAmount && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatAVAX((parseFloat(donationAmount) / campaign.conversionRate).toString())}
                  </p>
                )}
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleDonate}
                disabled={donating || !donationAmount}
              >
                <Wallet className="h-4 w-4" />
                {donating ? 'Processing...' : 'Donate Now'}
              </Button>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 Demo mode: Donations are simulated. In production, this would connect to your MetaMask wallet.
                </p>
              </div>
            </Card>

            {/* Campaign Status */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Campaign Status
              </h3>
              
              <div className="space-y-3">
                {campaign.goalReached ? (
                  <Badge className="w-full justify-center py-2 bg-success text-success-foreground">
                    Goal Reached!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-full justify-center py-2">
                    In Progress
                  </Badge>
                )}

                <div className="text-sm space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(campaign.deadline)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract:</span>
                    <a
                      href="https://testnet.snowtrace.io/address/0x..."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-medium text-foreground">
                      Avalanche Fuji
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-primary-light border-primary">
              <h4 className="font-semibold text-foreground mb-2">
                How It Works
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Funds held in escrow until milestones met</li>
                <li>• Donors vote to approve fund releases</li>
                <li>• Automatic refunds if goal not reached</li>
                <li>• Full blockchain transparency</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
