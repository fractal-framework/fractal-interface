import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DAOAddress } from '../../components/AddressDisplay';
import ContentBox from '../../components/ui/ContentBox';
import H1 from '../../components/ui/H1';
import { useWeb3Provider } from '../../contexts/web3Data/hooks/useWeb3Provider';
import useFavorites from '../../hooks/useFavorites';

function DAOFavorites() {
  const {
    state: { chainId },
  } = useWeb3Provider();
  const { favorites } = useFavorites();

  const [chainFavorites, setChainFavorites] = useState<string[]>([]);
  useEffect(() => {
    if (!chainId) {
      setChainFavorites([]);
      return;
    }

    if (!favorites[chainId]) {
      setChainFavorites([]);
      return;
    }

    setChainFavorites(favorites[chainId]);
  }, [favorites, chainId]);

  const { t } = useTranslation('dashboard');

  return (
    <div className="text-gray-25">
      <H1>{t('titleFavorites')}</H1>
      <ContentBox>
        {chainFavorites.length === 0 ? (
          <div>{t('emptyFavorites')}</div>
        ) : (
          <div>
            {chainFavorites.map(favorite => (
              <DAOAddress
                key={favorite}
                daoAddress={favorite}
              />
            ))}
          </div>
        )}
      </ContentBox>
    </div>
  );
}

export default DAOFavorites;
