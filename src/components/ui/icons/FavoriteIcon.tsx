import { Box, BoxProps, Button, Icon, IconButton } from '@chakra-ui/react';
import { Star } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Address } from 'viem';
import { useAccountFavorites } from '../../../hooks/DAO/loaders/useFavorites';
import { useNetworkConfig } from '../../../providers/NetworkConfig/NetworkConfigProvider';
import { DecentTooltip } from '../DecentTooltip';

interface Props extends BoxProps {
  safeAddress: Address;
  daoName: string;
}

export function FavoriteIcon({ safeAddress, daoName, ...rest }: Props) {
  const { favoritesList, toggleFavorite } = useAccountFavorites();
  const { addressPrefix } = useNetworkConfig();
  const isFavorite = useMemo(
    () =>
      !!safeAddress
        ? favoritesList.some(
            favorite =>
              favorite.address === safeAddress && favorite.networkPrefix === addressPrefix,
          )
        : false,
    [favoritesList, safeAddress, addressPrefix],
  );
  const { t } = useTranslation();
  return (
    <Box {...rest}>
      <DecentTooltip label={t('favoriteTooltip')}>
        <Button
          variant="tertiary"
          size="icon-md"
          as={IconButton}
          icon={
            <Icon
              as={Star}
              boxSize="1.25rem"
              weight={isFavorite ? 'fill' : 'regular'}
            />
          }
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            toggleFavorite(safeAddress, daoName);
          }}
          aria-label={t('favoriteTooltip')}
        />
      </DecentTooltip>
    </Box>
  );
}
