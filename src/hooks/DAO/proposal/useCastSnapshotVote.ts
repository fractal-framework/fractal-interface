import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logError } from '../../../helpers/errorLogging';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { ExtendedSnapshotProposal } from '../../../types';
import encryptWithShutter from '../../../utils/shutter';
import { submitSnapshotVote } from '../../../utils/snapshotVote';
import { useNetworkWalletClient } from '../../useNetworkWalletClient';

const useCastSnapshotVote = (extendedSnapshotProposal: ExtendedSnapshotProposal | null) => {
  const [selectedChoice, setSelectedChoice] = useState<number>();
  const [snapshotWeightedChoice, setSnapshotWeightedChoice] = useState<number[]>([]);

  const { subgraphInfo } = useDaoInfoStore();

  const { data: walletClient } = useNetworkWalletClient();

  useEffect(() => {
    if (extendedSnapshotProposal) {
      setSnapshotWeightedChoice(extendedSnapshotProposal.choices.map(() => 0));
    }
  }, [extendedSnapshotProposal]);

  const { t } = useTranslation('transaction');

  const handleSelectSnapshotChoice = useCallback((choiceIndex: number) => {
    setSelectedChoice(choiceIndex);
  }, []);

  const handleChangeSnapshotWeightedChoice = useCallback((choiceIndex: number, value: number) => {
    setSnapshotWeightedChoice(prevState =>
      prevState.map((choiceValue, index) => (index === choiceIndex ? value : choiceValue)),
    );
  }, []);

  const castSnapshotVote = useCallback(
    async (onSuccess?: () => Promise<void>) => {
      if (subgraphInfo?.daoSnapshotENS && extendedSnapshotProposal && walletClient) {
        let toastId;
        const mappedSnapshotWeightedChoice: { [choiceKey: number]: number } = {};
        if (extendedSnapshotProposal.type === 'weighted') {
          snapshotWeightedChoice.forEach((value, choiceIndex) => {
            if (value > 0) {
              mappedSnapshotWeightedChoice[choiceIndex + 1] = value;
            }
          });
        }
        const choice =
          extendedSnapshotProposal.type === 'weighted'
            ? mappedSnapshotWeightedChoice
            : (selectedChoice as number) + 1;
        try {
          toastId = toast.loading(t('pendingCastVote'), {
            duration: Infinity,
          });
          if (extendedSnapshotProposal.privacy === 'shutter') {
            const encryptedChoice = await encryptWithShutter(
              JSON.stringify(choice),
              extendedSnapshotProposal.proposalId,
            );
            await submitSnapshotVote(walletClient, {
              space: subgraphInfo.daoSnapshotENS,
              proposal: extendedSnapshotProposal.proposalId,
              type: extendedSnapshotProposal.type,
              privacy: extendedSnapshotProposal.privacy,
              choice: encryptedChoice!,
              app: 'decent',
            });
          } else {
            await submitSnapshotVote(walletClient, {
              space: subgraphInfo.daoSnapshotENS,
              proposal: extendedSnapshotProposal.proposalId,
              type: extendedSnapshotProposal.type,
              choice,
              app: 'decent',
            });
          }
          toast.success(`${t('successCastVote')}. ${t('snapshotRecastVoteHelper')}`, {
            id: toastId,
          });
          setSelectedChoice(undefined);
          if (onSuccess) {
            // Need to refetch votes after timeout so that Snapshot API has enough time to record the vote
            setTimeout(() => onSuccess(), 3000);
          }
        } catch (e) {
          toast.error(t('failedCastVote'), { id: toastId });
          logError('Error while casting Snapshot vote', e);
        }
      }
    },
    [
      walletClient,
      subgraphInfo?.daoSnapshotENS,
      extendedSnapshotProposal,
      selectedChoice,
      snapshotWeightedChoice,
      t,
    ],
  );

  return {
    castSnapshotVote,
    selectedChoice,
    snapshotWeightedChoice,
    handleSelectSnapshotChoice,
    handleChangeSnapshotWeightedChoice,
  };
};

export default useCastSnapshotVote;
