import {
  Box,
  Menu,
  MenuButton,
  MenuList,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { Search } from '@decent-org/fractal-ui';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchDao } from '../../../../hooks/DAO/useSearchDao';
import { SearchDisplay } from './SearchDisplay';

export function DAOSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(['dashboard']);

  const { errorMessage, isLoading, address, isSafe, setSearchString, searchString } =
    useSearchDao();

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const unFocusInput = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const searchUpdate = useCallback(
    (inputAddress: string) => {
      setSearchString(inputAddress);
    },
    [setSearchString]
  );

  const onClickViewDAO = () => {
    setSearchString('');
    unFocusInput();
  };

  return (
    <Box
      width="full"
      maxW="31.125rem"
      height="full"
    >
      <Menu
        matchWidth
        isLazy
        defaultIsOpen={true}
        onOpen={focusInput}
      >
        <MenuButton
          h="full"
          w="full"
          data-testid="header-searchMenuButton"
        >
          <InputGroup>
            <InputLeftElement>
              <Search
                boxSize="1.5rem"
                color="grayscale.300"
              />
            </InputLeftElement>
            <Input
              ref={inputRef}
              size="baseAddonLeft"
              placeholder={t('searchDAOPlaceholder')}
              onChange={e => searchUpdate(e.target.value.trim())}
              value={searchString}
            />
          </InputGroup>
        </MenuButton>
        <MenuList
          onFocus={focusInput}
          border="none"
          rounded="lg"
          shadow="menu-gold"
          bg="grayscale.black"
          hidden={!errorMessage && !address}
        >
          <Box p="0.5rem 1rem">
            <SearchDisplay
              loading={isLoading}
              errorMessage={errorMessage}
              validAddress={isSafe}
              address={address}
              onClickView={onClickViewDAO}
            />
          </Box>
        </MenuList>
      </Menu>
    </Box>
  );
}
