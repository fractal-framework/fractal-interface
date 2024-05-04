import { Azorius } from '@fractal-framework/fractal-contracts';
import { useCallback, useEffect, useRef } from 'react';
import { Address, getContract, getAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { LockRelease__factory } from '../../../assets/typechain-types/dcnt';
import { useFractal } from '../../../providers/App/AppProvider';
import { GovernanceContractAction } from '../../../providers/App/governanceContracts/action';
import { getAzoriusModuleFromModules } from '../../../utils';
import useSafeContracts from '../../safe/useSafeContracts';
import { useMasterCopy } from '../../utils/useMasterCopy';

export const useGovernanceContracts = () => {
  // tracks the current valid DAO address; helps prevent unnecessary calls
  const currentValidAddress = useRef<string | null>();
  const { node, action } = useFractal();
  const baseContracts = useSafeContracts();
  const { getZodiacModuleProxyMasterCopyData } = useMasterCopy();
  const publicClient = usePublicClient();

  const { fractalModules, isModulesLoaded, daoAddress } = node;

  const loadGovernanceContracts = useCallback(async () => {
    if (!baseContracts || !publicClient) {
      return;
    }
    const {
      fractalAzoriusMasterCopyContract,
      votesERC20WrapperMasterCopyContract,
      linearVotingMasterCopyContract,
    } = baseContracts;
    const azoriusModule = getAzoriusModuleFromModules(fractalModules);
    const azoriusModuleContract = azoriusModule?.moduleContract as Azorius;

    if (!!azoriusModuleContract && !!publicClient) {
      const azoriusContract = getContract({
        address: azoriusModuleContract.address,
        client: publicClient,
        abi: fractalAzoriusMasterCopyContract.asPublic.abi,
      });

      let govTokenAddress: Address | undefined;

      let ozLinearVotingContractAddress: Address | undefined;
      let erc721LinearVotingContractAddress: Address | undefined;
      let votesTokenContractAddress: Address | undefined;
      let underlyingTokenAddress: Address | undefined;
      let lockReleaseContractAddress: Address | undefined;

      // @dev assumes the first strategy is the voting contract
      const votingStrategyAddresses = (await azoriusContract.read.getStrategies([
        '0x0000000000000000000000000000000000000001',
        0,
      ])) as Address[];
      const votingStrategyAddress = votingStrategyAddresses[1];

      const masterCopyData = await getZodiacModuleProxyMasterCopyData(
        getAddress(votingStrategyAddress),
      );
      const isOzLinearVoting = masterCopyData.isOzLinearVoting;
      const isOzLinearVotingERC721 = masterCopyData.isOzLinearVotingERC721;

      if (isOzLinearVoting) {
        ozLinearVotingContractAddress = votingStrategyAddress;
        const ozLinearVotingContract = getContract({
          address: ozLinearVotingContractAddress,
          client: publicClient,
          abi: linearVotingMasterCopyContract.asPublic.abi,
        });
        const possibleLockRelease = getContract({
          address: getAddress(govTokenAddress),
          abi: LockRelease__factory.abi,
          client: { public: publicClient },
        });

        let lockedTokenAddress = undefined;
        try {
          lockedTokenAddress = (await possibleLockRelease.read.token()) as Address;
        } catch {
          // no-op
          // if the underlying token is not an ERC20Wrapper, this will throw an error,
          // so we catch it and do nothing
        }

        if (lockedTokenAddress) {
          lockReleaseContractAddress = govTokenAddress;
          // @dev if the underlying token is an ERC20Wrapper, we use the underlying token as the token contract
          votesTokenContractAddress = lockedTokenAddress;
        } else {
          // @dev if the no underlying token, we use the governance token as the token contract
          votesTokenContractAddress = govTokenAddress;
        }
      } else if (isOzLinearVotingERC721) {
        // @dev for use with the ERC721 voting contract
        erc721LinearVotingContractAddress = votingStrategyAddress as Address;
      }

      if (votesTokenContractAddress || erc721LinearVotingContractAddress) {
        action.dispatch({
          type: GovernanceContractAction.SET_GOVERNANCE_CONTRACT,
          payload: {
            ozLinearVotingContractAddress,
            erc721LinearVotingContractAddress,
            azoriusContractAddress: azoriusModuleContract.address,
            votesTokenContractAddress,
            underlyingTokenAddress,
            lockReleaseContractAddress,
          },
        });
      }
      // else this has no governance token and can be assumed is a multi-sig
    } else {
      action.dispatch({
        type: GovernanceContractAction.SET_GOVERNANCE_CONTRACT,
        payload: {},
      });
    }
  }, [action, getZodiacModuleProxyMasterCopyData, baseContracts, fractalModules, publicClient]);

  useEffect(() => {
    if (currentValidAddress.current !== daoAddress && isModulesLoaded) {
      loadGovernanceContracts();
      currentValidAddress.current = daoAddress;
    }
    if (!daoAddress) {
      currentValidAddress.current = null;
    }
  }, [isModulesLoaded, loadGovernanceContracts, daoAddress]);
};
