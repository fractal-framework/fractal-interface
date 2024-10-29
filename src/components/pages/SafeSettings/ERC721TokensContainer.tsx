import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useFractal } from '../../../providers/App/AppProvider';
import { AzoriusGovernance } from '../../../types';
import { StyledBox } from '../../ui/containers/StyledBox';
import { DisplayAddress } from '../../ui/links/DisplayAddress';
import { BarLoader } from '../../ui/loaders/BarLoader';

export function ERC721TokensContainer() {
  const { t } = useTranslation(['settings']);
  const { governance } = useFractal();

  const azoriusGovernance = governance as AzoriusGovernance;
  const { erc721Tokens } = azoriusGovernance;

  return (
    <StyledBox width="100%">
      <Text>{t('governanceERC721TokenTitle')}</Text>
      {erc721Tokens ? (
        <Flex flexWrap="wrap">
          <Grid
            templateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(5, 1fr)' }}
            width="100%"
          >
            {/* HEADER TITLES */}
            <GridItem colSpan={{ base: 1, lg: 2 }}>
              <Text
                textStyle="label-small"
                color="neutral-7"
              >
                {t('governanceTokenNameLabel')}
              </Text>
            </GridItem>
            <GridItem colSpan={1}>
              <Text
                textStyle="label-small"
                color="neutral-7"
              >
                {t('governanceTokenSymbolLabel')}
              </Text>
            </GridItem>
            <GridItem colSpan={1}>
              <Text
                textStyle="label-small"
                color="neutral-7"
              >
                {t('governanceTokenWeightLabel')}
              </Text>
            </GridItem>
            <GridItem colSpan={1}>
              <Text
                textStyle="label-small"
                color="neutral-7"
              >
                {t('governanceTokenTotalWeightLabel')}
              </Text>
            </GridItem>
          </Grid>

          {/* TOKEN DETAILS */}
          {erc721Tokens.map(token => (
            <Grid
              key={token.address}
              width="100%"
              templateColumns="repeat(5, 1fr)"
              mt="0.5rem"
            >
              <GridItem colSpan={2}>
                <Flex>
                  <DisplayAddress address={token.address}>{token.name}</DisplayAddress>
                </Flex>
              </GridItem>

              <GridItem colSpan={1}>
                <Text>{token.symbol}</Text>
              </GridItem>

              <GridItem colSpan={1}>
                <Text>{token.votingWeight.toString()}</Text>
              </GridItem>

              <GridItem colSpan={1}>
                <Text>
                  {token.totalSupply ? (token.totalSupply * token.votingWeight).toString() : 'n/a'}
                </Text>
              </GridItem>
            </Grid>
          ))}
        </Flex>
      ) : (
        <Flex
          width="100%"
          justifyContent="center"
          alignItems="center"
          minHeight="100px"
        >
          <BarLoader />
        </Flex>
      )}
    </StyledBox>
  );
}