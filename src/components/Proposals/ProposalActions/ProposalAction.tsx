import { Button } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Proposal, ProposalState } from '../../../providers/Fractal/types';
import { Execute } from './Execute';
import Queue from './Queue';
import CastVote from './Vote';

export function ProposalAction({
  proposal,
  expandedView,
}: {
  proposal: Proposal;
  expandedView?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = () => {
    // @todo - call proper contract func based on proposal state and user permission
    setPending(true);

    switch (proposal.state) {
      case ProposalState.Active:
        // Call Vote action - probably redirect to proposal details where CastVote component would handle proper vote casting
        break;
      case ProposalState.Pending:
        // Call proposal queueing action
        break;
      case ProposalState.Executing:
        // Call proposal execution action
        break;
      default:
        navigate(proposal.proposalNumber.toString());
        break;
    }

    setPending(false);
  };

  const label = useMemo(() => {
    switch (proposal.state) {
      case ProposalState.Active:
        return t('vote');
      case ProposalState.Pending:
        return t('queue');
      case ProposalState.Executing:
        return t('execute');
    }
  }, [proposal, t]);

  if (!label) {
    if (!expandedView) {
      return (
        <Button
          variant="secondary"
          onClick={handleClick}
        >
          {t('view')}
        </Button>
      );
    }
    // This means that Proposal in state where there's no action to perform
    return null;
  }

  if (expandedView) {
    switch (proposal.state) {
      case ProposalState.Active:
        return <CastVote proposal={proposal} />;
      case ProposalState.Pending:
        return <Queue proposal={proposal} />;
      case ProposalState.Executing:
        return <Execute proposal={proposal} />;
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
    >
      {label}
    </Button>
  );
}
