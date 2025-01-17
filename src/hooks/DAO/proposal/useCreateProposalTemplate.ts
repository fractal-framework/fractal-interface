import { abis } from '@fractal-framework/fractal-contracts';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { encodeFunctionData } from 'viem';
import { normalize } from 'viem/ens';
import { useFractal } from '../../../providers/App/AppProvider';
import useIPFSClient from '../../../providers/App/hooks/useIPFSClient';
import { useNetworkConfigStore } from '../../../providers/NetworkConfig/useNetworkConfigStore';
import { ProposalExecuteData } from '../../../types';
import { CreateProposalForm } from '../../../types/proposalBuilder';
import { validateENSName } from '../../../utils/url';
import useNetworkPublicClient from '../../useNetworkPublicClient';

const customSerializer = (_: string, value: any) => {
  if (typeof value === 'bigint') {
    // need to convert bigint to string
    return value.toString();
  }
  return value;
};

export default function useCreateProposalTemplate() {
  const publicClient = useNetworkPublicClient();
  const client = useIPFSClient();
  const {
    governance: { proposalTemplates },
  } = useFractal();

  const {
    contracts: { keyValuePairs },
  } = useNetworkConfigStore();

  const { t } = useTranslation('proposalMetadata');

  const prepareProposalTemplateProposal = useCallback(
    async (values: CreateProposalForm) => {
      if (proposalTemplates) {
        const proposalMetadata = {
          title: t('createProposalTemplateTitle'),
          description: t('createProposalTemplateDescription'),
          documentationUrl: '',
        };

        const proposalTemplateData = {
          title: values.proposalMetadata.title.trim(),
          description: values.proposalMetadata.description.trim(),
          transactions: await Promise.all(
            values.transactions.map(async tx => ({
              ...tx,
              targetAddress: validateENSName(tx.targetAddress)
                ? await publicClient.getEnsAddress({ name: normalize(tx.targetAddress) })
                : tx.targetAddress,
              parameters: tx.parameters
                .map(param => {
                  if (param.signature) {
                    return param;
                  } else {
                    // This allows submitting transaction function with no params
                    return undefined;
                  }
                })
                .filter(param => param),
            })),
          ),
        };

        const updatedTemplatesList = [...proposalTemplates, proposalTemplateData];

        const { Hash } = await client.add(JSON.stringify(updatedTemplatesList, customSerializer));

        const encodedUpdateValues = encodeFunctionData({
          abi: abis.KeyValuePairs,
          functionName: 'updateValues',
          args: [['proposalTemplates'], [Hash]],
        });

        const proposal: ProposalExecuteData = {
          metaData: proposalMetadata,
          targets: [keyValuePairs],
          values: [0n],
          calldatas: [encodedUpdateValues],
        };

        return proposal;
      }
    },
    [client, keyValuePairs, proposalTemplates, publicClient, t],
  );

  return { prepareProposalTemplateProposal };
}
