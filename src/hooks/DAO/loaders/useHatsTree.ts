import { useApolloClient } from '@apollo/client';
import { HatsSubgraphClient, Tree } from '@hatsprotocol/sdk-v1-subgraph';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PublicClient } from 'viem';
import { useFractal } from '../../../providers/App/AppProvider';
import useIPFSClient from '../../../providers/App/hooks/useIPFSClient';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { useDaoInfoStore } from '../../../store/daoInfo/useDaoInfoStore';
import { DecentHatsError } from '../../../store/roles/rolesStoreUtils';
import { useRolesStore } from '../../../store/roles/useRolesStore';
import useNetworkPublicClient from '../../useNetworkPublicClient';
import { CacheExpiry, CacheKeys } from '../../utils/cache/cacheDefaults';
import { getValue, setValue } from '../../utils/cache/useLocalStorage';

const hatsSubgraphClient = new HatsSubgraphClient({});

const useHatsTree = () => {
  const { t } = useTranslation('roles');
  const {
    governanceContracts: {
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721WithHatsWhitelistingAddress,
    },
  } = useFractal();
  const { hatsTreeId, contextChainId, setHatsTree } = useRolesStore();

  const ipfsClient = useIPFSClient();
  const {
    sablierSubgraph,
    contracts: {
      hatsProtocol,
      erc6551Registry,
      hatsAccount1ofNMasterCopy: hatsAccountImplementation,
      hatsElectionsEligibilityMasterCopy: hatsElectionsImplementation,
    },
  } = useNetworkConfigStore();
  const publicClient = useNetworkPublicClient();
  const apolloClient = useApolloClient();

  const getHatsTree = useCallback(
    async (params: { hatsTreeId: number; contextChainId: number; publicClient: PublicClient }) => {
      try {
        const tree = await hatsSubgraphClient.getTree({
          chainId: params.contextChainId,
          treeId: params.hatsTreeId,
          props: {
            hats: {
              props: {
                prettyId: true,
                status: true,
                details: true,
                eligibility: true,
                wearers: {
                  props: {},
                },
              },
            },
          },
        });

        const hatsWithFetchedDetails = await Promise.all(
          (tree.hats || []).map(async hat => {
            const ipfsPrefix = 'ipfs://';

            if (hat.details === undefined || !hat.details.startsWith(ipfsPrefix)) {
              return hat;
            }

            const hash = hat.details.split(ipfsPrefix)[1];
            const cacheKey = {
              cacheName: CacheKeys.IPFS_HASH,
              hash,
              chainId: params.contextChainId,
            } as const;

            const cachedDetails = getValue(cacheKey);

            if (cachedDetails) {
              return { ...hat, details: cachedDetails };
            }

            try {
              const detailsFromIpfs = await ipfsClient.cat(hash);
              const jsonStringDetails = JSON.stringify(detailsFromIpfs);
              setValue(cacheKey, jsonStringDetails, CacheExpiry.NEVER);
              return { ...hat, details: jsonStringDetails };
            } catch {
              return hat;
            }
          }),
        );

        const treeWithFetchedDetails: Tree = { ...tree, hats: hatsWithFetchedDetails };

        try {
          await setHatsTree({
            hatsTree: treeWithFetchedDetails,
            chainId: BigInt(params.contextChainId),
            hatsProtocol,
            erc6551Registry,
            hatsAccountImplementation,
            hatsElectionsImplementation,
            publicClient: params.publicClient,
            whitelistingVotingStrategy:
              linearVotingErc20WithHatsWhitelistingAddress ||
              linearVotingErc721WithHatsWhitelistingAddress,
            apolloClient,
            sablierSubgraph,
          });
        } catch (e) {
          if (e instanceof DecentHatsError) {
            toast.error(e.message);
          }
        }
      } catch (e) {
        setHatsTree({
          hatsTree: null,
          chainId: BigInt(params.contextChainId),
          hatsProtocol,
          erc6551Registry,
          hatsAccountImplementation,
          hatsElectionsImplementation,
          publicClient: params.publicClient,
          apolloClient,
          sablierSubgraph,
        });
        const message = t('invalidHatsTreeIdMessage');
        toast.error(message);
        console.error(e, {
          message,
          args: {
            network: params.contextChainId,
            hatsTreeId: params.hatsTreeId,
          },
        });
      }
    },
    [
      apolloClient,
      erc6551Registry,
      hatsAccountImplementation,
      hatsElectionsImplementation,
      hatsProtocol,
      ipfsClient,
      linearVotingErc20WithHatsWhitelistingAddress,
      linearVotingErc721WithHatsWhitelistingAddress,
      sablierSubgraph,
      setHatsTree,
      t,
    ],
  );
  const node = useDaoInfoStore();
  const safeAddress = node.safe?.address;
  const daoHatTreeloadKey = useRef<string | null>();
  useEffect(() => {
    const key = safeAddress && hatsTreeId ? `${safeAddress}:${hatsTreeId}` : null;

    const previousSafeAddress = daoHatTreeloadKey.current?.split(':')[0];
    const previousHatsTreeId = daoHatTreeloadKey.current?.split(':')[1];

    if (
      !!hatsTreeId &&
      !!contextChainId &&
      key !== null &&
      key !== daoHatTreeloadKey.current &&
      previousHatsTreeId !== `${hatsTreeId}` // don't try to load hats tree if this new DAO is stuck with the same hats tree id as the previous DAO
    ) {
      getHatsTree({
        hatsTreeId,
        contextChainId,
        publicClient,
      });

      daoHatTreeloadKey.current = key;
    } else if (!!safeAddress && safeAddress !== previousSafeAddress) {
      // If the safe address changes, reset the load key
      daoHatTreeloadKey.current = key;
    }
  }, [contextChainId, getHatsTree, hatsTreeId, publicClient, safeAddress]);
};

export { useHatsTree };
