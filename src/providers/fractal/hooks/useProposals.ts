import axios from 'axios';
import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { Usul, Usul__factory } from '../../../assets/typechain-types/usul';
import { TypedListener } from '../../../assets/typechain-types/usul/common';
import { ProposalCreatedEvent } from '../../../assets/typechain-types/usul/contracts/Usul';
import { useWeb3Provider } from '../../../contexts/web3Data/hooks/useWeb3Provider';
import { calculateSafeTransactionHash } from '../../../helpers';
import { logError } from '../../../helpers/errorLogging';
import { ProposalExecuteData } from '../../../types/proposal';
import { GnosisModuleType } from '../types';
import { Proposal } from '../types/usul';
import { buildGnosisApiUrl } from '../utils';
import { mapProposalCreatedEventToProposal } from '../utils/usul';
import { useFractal } from './useFractal';

export default function useProposals() {
  const [pendingCreateTx, setPendingCreateTx] = useState(false);
  const [usulContract, setUsulContract] = useState<Usul>();
  const [votingStrategiesAddresses, setVotingStrategiesAddresses] = useState<string[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>();

  const {
    state: { signerOrProvider, chainId, account },
  } = useWeb3Provider();
  const {
    gnosis: { safe, modules },
  } = useFractal();

  const submitProposal = useCallback(
    async ({
      proposalData,
      successCallback,
    }: {
      proposalData: ProposalExecuteData | undefined;
      successCallback: () => void;
    }) => {
      if (!proposalData) {
        return;
      }

      if (!usulContract || !votingStrategiesAddresses) {
        if (!safe.address || !account) {
          return;
        }
        setPendingCreateTx(true);
        try {
          const txHash = calculateSafeTransactionHash(safe.address, chainId, {
            to: proposalData.targets[0],
            value: 0,
            data: proposalData.calldatas[0],
            operation: 0,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: ethers.constants.AddressZero,
            refundReceiver: ethers.constants.AddressZero,
            nonce: 1,
          });

          await axios.post(
            buildGnosisApiUrl(chainId, `/safes/${safe.address}/multisig-transactions/`),
            {
              safe: safe.address,
              to: proposalData.targets[0],
              value: 0,
              data: proposalData.calldatas[0],
              operation: 0,
              gasToken: ethers.constants.AddressZero,
              safeTxGas: 0,
              baseGas: 0,
              gasPrice: 0,
              refundReceiver: ethers.constants.AddressZero,
              nonce: 1,
              contractTransactionHash: txHash,
              sender: account,
              // signature: signatures,
            }
          );
          successCallback();
        } catch (e) {
          logError(e, 'Error during Multi-sig proposal creation');
        } finally {
          setPendingCreateTx(false);
        }
      }

      if (!usulContract || !votingStrategiesAddresses) {
        return;
      }
      try {
        const txHashes = await Promise.all(
          proposalData.targets.map(async (target, index) => {
            return usulContract.getTransactionHash(
              target,
              proposalData.values[index],
              proposalData.calldatas[index],
              0
            );
          })
        );
        // @todo: Implement voting strategy proposal selection when we will support multiple strategies on single Usul instance
        await (
          await usulContract.submitProposal(txHashes, votingStrategiesAddresses[0], '0x')
        ).wait(); // Third parameter is optional on Usul
        successCallback();
      } catch (e) {
        logError(e, 'Error during Usul proposal creation');
      } finally {
        setPendingCreateTx(false);
      }
    },
    [chainId, safe.address, usulContract, votingStrategiesAddresses]
  );

  const proposalCreatedListener: TypedListener<ProposalCreatedEvent> = useCallback(
    async (strategyAddress, proposalNumber, proposer) => {
      if (!usulContract || !signerOrProvider) {
        return;
      }
      const proposal = await mapProposalCreatedEventToProposal(
        strategyAddress,
        proposalNumber,
        proposer,
        usulContract,
        signerOrProvider
      );

      setProposals(prevState => {
        if (prevState) {
          return [...prevState, proposal];
        }
        return [proposal];
      });
    },
    [usulContract, signerOrProvider]
  );

  useEffect(() => {
    const init = async () => {
      if (!signerOrProvider || !modules) {
        return;
      }

      const usulModule = modules.find(module => module.moduleType === GnosisModuleType.USUL);

      if (!usulModule) {
        return;
      }

      try {
        const moduleContract = Usul__factory.connect(usulModule.moduleAddress, signerOrProvider);
        const [strategies] = await moduleContract.getStrategiesPaginated(
          '0x0000000000000000000000000000000000000001',
          10
        );
        const proposalCreatedFilter = moduleContract.filters.ProposalCreated();
        const proposalCreatedEvents = await moduleContract.queryFilter(proposalCreatedFilter);
        const mappedProposals = await Promise.all(
          proposalCreatedEvents.map(({ args }) => {
            return mapProposalCreatedEventToProposal(
              args[0],
              args[1],
              args[2],
              moduleContract,
              signerOrProvider
            );
          })
        );

        setUsulContract(moduleContract);
        setVotingStrategiesAddresses(strategies);
        setProposals(mappedProposals);
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, [modules, signerOrProvider]);

  useEffect(() => {
    if (!usulContract || !signerOrProvider) {
      return;
    }

    const filter = usulContract.filters.ProposalCreated();

    usulContract.on(filter, proposalCreatedListener);

    return () => {
      usulContract.off(filter, proposalCreatedListener);
    };
  }, [usulContract, signerOrProvider, proposalCreatedListener]);

  return {
    proposals,
    pendingCreateTx,
    submitProposal,
    canUserCreateProposal: true,
  };
}
