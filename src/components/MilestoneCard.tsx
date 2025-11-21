import { Milestone } from '@/types/campaign';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatKES, formatAVAX } from '@/lib/formatters';
import { CheckCircle2, Clock, Vote, ExternalLink } from 'lucide-react';

interface MilestoneCardProps {
  milestone: Milestone;
  onVote?: (approve: boolean) => void;
  onFinalize?: () => void;
  canVote: boolean;
  canFinalize: boolean;
}

export const MilestoneCard = ({ 
  milestone, 
  onVote, 
  onFinalize, 
  canVote, 
  canFinalize 
}: MilestoneCardProps) => {
  const vp = milestone.voteProgress;
  const isProposed = milestone.proposedAt > 0;
  const isReleased = milestone.released;

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-foreground">
                Milestone {milestone.index + 1}
              </h4>
              {isReleased && (
                <Badge className="bg-success text-success-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Released
                </Badge>
              )}
              {!isReleased && isProposed && (
                <Badge variant="secondary" className="gap-1">
                  <Vote className="h-3 w-3" />
                  Voting
                </Badge>
              )}
              {!isReleased && !isProposed && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {milestone.description}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-3 mb-4">
          <p className="text-2xl font-bold text-foreground">
            {formatKES(milestone.amountKES)}
          </p>
          <p className="text-sm text-muted-foreground">
            ({formatAVAX(milestone.amountAVAX)})
          </p>
        </div>

        {/* Evidence */}
        {isProposed && milestone.evidenceURI && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground mb-1">Evidence Submitted</p>
            <a
              href={milestone.evidenceURI.replace('ipfs://', 'https://ipfs.io/ipfs/')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Evidence <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Voting Progress */}
        {isProposed && vp && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Voting Progress</p>
              <p className="text-sm text-muted-foreground">
                {vp.totalVotes} votes • {vp.approvalPercent}% approval
              </p>
            </div>
            <Progress value={vp.approvalPercent} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>For: {milestone.votesFor}</span>
              <span>Against: {milestone.votesAgainst}</span>
            </div>
            {vp.quorumReached ? (
              <Badge variant="outline" className="mt-2">
                Quorum Reached
              </Badge>
            ) : (
              <Badge variant="outline" className="mt-2 opacity-60">
                Minimum Quorum: 30%
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        {isProposed && !isReleased && (
          <div className="flex gap-2 pt-4 border-t">
            {canVote && onVote && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onVote(true)}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onVote(false)}
                  className="flex-1"
                >
                  Reject
                </Button>
              </>
            )}
            {canFinalize && vp?.canFinalize && onFinalize && (
              <Button
                variant="default"
                size="sm"
                onClick={onFinalize}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalize Release
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
