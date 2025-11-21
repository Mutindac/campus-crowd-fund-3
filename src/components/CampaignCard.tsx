import { Campaign } from '@/types/campaign';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatKES, formatAddress, calculateDaysRemaining } from '@/lib/formatters';
import { Clock, Users, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CampaignCardProps {
  campaign: Campaign;
}

export const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const daysLeft = calculateDaysRemaining(campaign.deadline);
  const progress = campaign.progress || 0;
  const isGoalReached = campaign.goalReached;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
              {campaign.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {campaign.description}
            </p>
          </div>
          {isGoalReached && (
            <Badge className="ml-2 bg-success text-success-foreground">
              Funded
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatKES(campaign.totalDonationsKES)}
              </p>
              <p className="text-sm text-muted-foreground">
                of {formatKES(campaign.goalKES)} goal
              </p>
            </div>
            <p className="text-lg font-semibold text-primary">
              {progress.toFixed(1)}%
            </p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{campaign.donorCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{daysLeft}d left</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{campaign.milestonesCount} milestones</span>
          </div>
        </div>

        {/* Creator */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">By </span>
            <span className="text-foreground font-medium">
              {formatAddress(campaign.creator)}
            </span>
          </div>
          <Link to={`/campaign/${campaign.campaignId}`}>
            <Button variant="default" size="sm" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
