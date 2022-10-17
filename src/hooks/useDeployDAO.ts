import { useCallback } from 'react';
import { ethers, BigNumber } from 'ethers';
import { VotesToken__factory, TokenFactory__factory } from '../assets/typechain-types/votes-token';
import { GnosisSafe__factory } from '../assets/typechain-types/gnosis-safe';
import {
  TokenGovernanceDAO,
  GnosisDAO,
  GovernanceTypes,
} from './../components/DaoCreator/provider/types/index';
import { useAddresses } from './useAddresses';
import useCreateDAODataCreator from './useCreateDAODataCreator';
import useCreateGnosisDAODataCreator from './useCreateGnosisDAODataCreator';
import { useTransaction } from '../contexts/web3Data/transactions';
import { useWeb3Provider } from '../contexts/web3Data/hooks/useWeb3Provider';
import { useBlockchainData } from '../contexts/blockchainData';
import useSafeContracts from './useSafeContracts';
import { useTranslation } from 'react-i18next';
import { getRandomBytes } from '../helpers';

type DeployDAOSuccessCallback = (daoAddress: string) => void;

const useDeployDAO = () => {
  const {
    state: { account, signerOrProvider, chainId },
  } = useWeb3Provider();
  const { metaFactory, tokenFactory } = useAddresses(chainId);
  const {
    callbackGnosisSafeFactoryContract,
    gnosisSafeFactoryContract,
    gnosisSafeSingletonContract,
    linearVotingMastercopyContract,
    usulMastercopyContract,
    zodiacModuleProxyFactoryContract,
  } = useSafeContracts();

  const createDAODataCreator = useCreateDAODataCreator();
  const createGnosisDAODataCreator = useCreateGnosisDAODataCreator();

  const [contractCallDeploy, contractCallPending] = useTransaction();

  const { metaFactoryContract } = useBlockchainData();

  const { t } = useTranslation('transaction');

  const deployTokenVotingDAO = useCallback(
    (daoData: TokenGovernanceDAO | GnosisDAO, successCallback: DeployDAOSuccessCallback) => {
      if (metaFactoryContract === undefined || account === null) {
        return;
      }

      const createDAOData = createDAODataCreator({
        creator: account,
        ...(daoData as TokenGovernanceDAO),
      });

      if (createDAOData === undefined) {
        return;
      }

      contractCallDeploy({
        contractFn: () =>
          metaFactoryContract.createDAOAndExecute(
            createDAOData.calldata.daoFactory,
            createDAOData.calldata.createDAOParams,
            createDAOData.calldata.moduleFactories,
            createDAOData.calldata.moduleFactoriesBytes,
            createDAOData.calldata.targets,
            createDAOData.calldata.values,
            createDAOData.calldata.calldatas
          ),
        pendingMessage: t('pendingDeployDAO'),
        failedMessage: t('failedDeployDAO'),
        successMessage: t('successDeployDAO'),
        successCallback: () => successCallback(createDAOData.predictedDAOAddress),
      });
    },
    [contractCallDeploy, createDAODataCreator, metaFactoryContract, account, t]
  );

  const deployGnosisDAO = useCallback(
    (daoData: GnosisDAO | TokenGovernanceDAO, successCallback: DeployDAOSuccessCallback) => {
      if (metaFactoryContract === undefined || account === null) {
        return;
      }

      const createDAOData = createGnosisDAODataCreator({
        creator: account,
        ...(daoData as GnosisDAO),
      });

      if (createDAOData === undefined) {
        return;
      }

      contractCallDeploy({
        contractFn: () =>
          metaFactoryContract.createDAOAndExecute(
            createDAOData.calldata.daoFactory,
            createDAOData.calldata.createDAOParams,
            createDAOData.calldata.moduleFactories,
            createDAOData.calldata.moduleFactoriesBytes,
            createDAOData.calldata.targets,
            createDAOData.calldata.values,
            createDAOData.calldata.calldatas
          ),
        pendingMessage: t('pendingDeployDAO'),
        failedMessage: t('failedDeployDAO'),
        successMessage: t('successDeployDAO'),
        successCallback: () => successCallback(createDAOData.predictedDAOAddress),
      });
    },
    [contractCallDeploy, createGnosisDAODataCreator, metaFactoryContract, account, t]
  );

  const deployGnosisSafe = useCallback(
    (daoData: GnosisDAO | TokenGovernanceDAO, successCallback: DeployDAOSuccessCallback) => {
      const deploy = async () => {
        if (
          !account ||
          !gnosisSafeFactoryContract ||
          !gnosisSafeSingletonContract?.address ||
          !usulMastercopyContract ||
          !zodiacModuleProxyFactoryContract ||
          !linearVotingMastercopyContract ||
          !metaFactory ||
          !tokenFactory ||
          !callbackGnosisSafeFactoryContract ||
          !signerOrProvider
        ) {
          return;
        }
        const { AddressZero, HashZero } = ethers.constants;
        const { solidityKeccak256, defaultAbiCoder, getCreate2Address } = ethers.utils;
        const tokenFactoryInterface = TokenFactory__factory.createInterface();
        const gnosisSafeInterface = GnosisSafe__factory.createInterface();
        const gnosisDaoData = daoData as GnosisDAO;
        const tokenGovernanceDaoData = daoData as TokenGovernanceDAO;
        const votingTokenNonce = getRandomBytes();
        const saltNum = BigNumber.from(
          '0x856d90216588f9ffc124d1480a440e1c012c7a816952bc968d737bae5d4e139c'
        );

        const createGnosisCalldata = gnosisSafeSingletonContract.interface.encodeFunctionData(
          'setup',
          [
            [
              ...gnosisDaoData.trustedAddresses.map(trustedAddess => trustedAddess.address),
              callbackGnosisSafeFactoryContract.address,
            ],
            1,
            AddressZero,
            HashZero,
            AddressZero,
            AddressZero,
            0,
            AddressZero,
          ]
        );

        const createdSafeProxyAddress = await gnosisSafeFactoryContract.callStatic.createProxy(
          gnosisSafeSingletonContract.address,
          '0x'
        );

        const createTokenEncodedData = tokenFactoryInterface.encodeFunctionData('create', [
          account,
          [
            defaultAbiCoder.encode(['string'], [tokenGovernanceDaoData.tokenName]),
            defaultAbiCoder.encode(['string'], [tokenGovernanceDaoData.tokenSymbol]),
            defaultAbiCoder.encode(
              ['address[]'],
              [
                tokenGovernanceDaoData.tokenAllocations.map(
                  tokenAllocation => tokenAllocation.address
                ),
              ]
            ),
            defaultAbiCoder.encode(
              ['uint256[]'],
              [
                tokenGovernanceDaoData.tokenAllocations.map(
                  tokenAllocation => tokenAllocation.amount.bigNumberValue
                ),
              ]
            ),
            defaultAbiCoder.encode(['bytes32'], [votingTokenNonce]),
          ],
        ]);

        const votingTokenSalt = solidityKeccak256(
          ['address', 'address', 'uint256', 'bytes32'],
          [account, account, chainId, votingTokenNonce]
        );
        const votingTokenInitCode = solidityKeccak256(
          ['bytes', 'bytes'],
          [
            // eslint-disable-next-line camelcase
            VotesToken__factory.bytecode,
            defaultAbiCoder.encode(
              ['string', 'string', 'address[]', 'uint256[]'],
              [
                tokenGovernanceDaoData.tokenName,
                tokenGovernanceDaoData.tokenSymbol,
                tokenGovernanceDaoData.tokenAllocations.map(
                  tokenAllocation => tokenAllocation.address
                ),
                tokenGovernanceDaoData.tokenAllocations.map(
                  tokenAllocation => tokenAllocation.amount.bigNumberValue
                ),
              ]
            ),
          ]
        );

        const predictedVotingTokenAddress = getCreate2Address(
          tokenFactory.address,
          votingTokenSalt,
          votingTokenInitCode
        );

        const encodedStrategyInitParams = defaultAbiCoder.encode(
          ['address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'string'],
          [
            createdSafeProxyAddress, // owner
            predictedVotingTokenAddress,
            '0x0000000000000000000000000000000000000001',
            tokenGovernanceDaoData.votingPeriod,
            tokenGovernanceDaoData.proposalThreshold,
            tokenGovernanceDaoData.votingPeriod,
            'linearVoting',
          ]
        );
        const encodedStrategySetUpData =
          linearVotingMastercopyContract.interface.encodeFunctionData('setUp', [
            encodedStrategyInitParams,
          ]);
        const strategyByteCodeLinear =
          '0x602d8060093d393df3363d3d373d3d3d363d73' +
          linearVotingMastercopyContract.address.slice(2) +
          '5af43d82803e903d91602b57fd5bf3';
        const strategySalt = solidityKeccak256(
          ['bytes32', 'uint256'],
          [solidityKeccak256(['bytes'], [encodedStrategySetUpData]), '0x01']
        );
        const expectedStrategyAddress = getCreate2Address(
          zodiacModuleProxyFactoryContract.address,
          strategySalt,
          solidityKeccak256(['bytes'], [strategyByteCodeLinear])
        );
        const encodedStrategyDeployData =
          zodiacModuleProxyFactoryContract.interface.encodeFunctionData('deployModule', [
            linearVotingMastercopyContract.address,
            encodedStrategySetUpData,
            '0x01',
          ]);

        const encodedInitUsulData = defaultAbiCoder.encode(
          ['address', 'address', 'address', 'address[]'],
          [
            createdSafeProxyAddress,
            createdSafeProxyAddress,
            createdSafeProxyAddress,
            [expectedStrategyAddress],
          ]
        );
        const encodedSetupUsulData = usulMastercopyContract.interface.encodeFunctionData('setUp', [
          encodedInitUsulData,
        ]);
        const encodedDeployUsulData = zodiacModuleProxyFactoryContract.interface.encodeFunctionData(
          'deployModule',
          [usulMastercopyContract.address, encodedSetupUsulData, '0x01']
        );
        const usulByteCodeLinear =
          '0x602d8060093d393df3363d3d373d3d3d363d73' +
          usulMastercopyContract.address.slice(2) +
          '5af43d82803e903d91602b57fd5bf3';
        const usulSalt = solidityKeccak256(
          ['bytes32', 'uint256'],
          [solidityKeccak256(['bytes'], [encodedSetupUsulData]), '0x01']
        );
        const expectedUsulAddress = getCreate2Address(
          zodiacModuleProxyFactoryContract.address,
          usulSalt,
          solidityKeccak256(['bytes'], [usulByteCodeLinear])
        );

        const removeCalldata = gnosisSafeInterface.encodeFunctionData('removeOwner', [
          gnosisDaoData.trustedAddresses.map(trustedAddress => trustedAddress.address)[
            gnosisDaoData.trustedAddresses.length - 1
          ],
          callbackGnosisSafeFactoryContract.address,
          gnosisDaoData.signatureThreshold,
        ]);
        const setUsulCalldata = linearVotingMastercopyContract.interface.encodeFunctionData(
          'setUsul',
          [expectedUsulAddress]
        );
        const enableUsulCalldata = gnosisSafeInterface.encodeFunctionData('enableModule', [
          expectedUsulAddress,
        ]);

        const signatures =
          '0x000000000000000000000000' +
          callbackGnosisSafeFactoryContract.address.slice(2) +
          '0000000000000000000000000000000000000000000000000000000000000000' +
          '01';

        const txdata = defaultAbiCoder.encode(
          ['address[][]', 'bytes[][]', 'bool[]'],
          [
            [
              [
                AddressZero, // Setup Gnosis
                tokenFactory.address, // Deploy voting token
                zodiacModuleProxyFactoryContract.address, // Deploy Linear Voting contract
                zodiacModuleProxyFactoryContract.address, // Deploy Usul contract
              ],
              [
                expectedStrategyAddress, // set Usul on Voting Strategy
                AddressZero, // Enable Usul module on safe
                AddressZero, // remove owner + threshold
              ],
            ],
            [
              [
                createGnosisCalldata,
                createTokenEncodedData,
                encodedStrategyDeployData,
                encodedDeployUsulData,
              ],
              [setUsulCalldata, enableUsulCalldata, removeCalldata],
            ],
            [false, true],
          ]
        );
        const bytecode = defaultAbiCoder.encode(['bytes', 'bytes'], [txdata, signatures]);

        contractCallDeploy({
          contractFn: () => {
            return gnosisSafeFactoryContract.createProxyWithCallback(
              gnosisSafeSingletonContract.address,
              bytecode,
              saltNum,
              callbackGnosisSafeFactoryContract.address
            );
          },
          pendingMessage: t('pendingDeployGnosis'),
          failedMessage: t('failedDeployGnosis'),
          successMessage: t('successDeployGnosis'),
          successCallback: () => successCallback(createdSafeProxyAddress),
        });
      };

      deploy();
    },
    [
      contractCallDeploy,
      usulMastercopyContract,
      zodiacModuleProxyFactoryContract,
      gnosisSafeFactoryContract,
      linearVotingMastercopyContract,
      gnosisSafeSingletonContract,
      callbackGnosisSafeFactoryContract,
      metaFactory,
      tokenFactory,
      account,
      signerOrProvider,
      chainId,
      t,
    ]
  );

  const deployDao = useCallback(
    (daoData: TokenGovernanceDAO | GnosisDAO, successCallback: DeployDAOSuccessCallback) => {
      switch (daoData.governance) {
        case GovernanceTypes.TOKEN_VOTING_GOVERNANCE:
          return deployTokenVotingDAO(daoData, successCallback);
        case GovernanceTypes.MVD_GNOSIS:
          return deployGnosisDAO(daoData, successCallback);
        case GovernanceTypes.GNOSIS_SAFE:
          return deployGnosisSafe(daoData, successCallback);
      }
    },
    [deployGnosisDAO, deployGnosisSafe, deployTokenVotingDAO]
  );

  return [deployDao, contractCallPending] as const;
};

export default useDeployDAO;
