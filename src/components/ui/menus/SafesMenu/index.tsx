import {
  Box,
  Button,
  Flex,
  Hide,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  Show,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { CaretDown, Star } from '@phosphor-icons/react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { AllSafesDrawer } from '../../../../pages/home/AllSafesDrawer';
import { SafesList } from './SafesList';

export function SafesMenu() {
  const { t } = useTranslation('dashboard');
  const {
    isOpen: isSafesDrawerOpen,
    onOpen: onSafesDrawerOpen,
    onClose: onSafesDrawerClose,
  } = useDisclosure();

  return (
    <Box>
      <Hide above="md">
        <IconButton
          variant="tertiary"
          as={Star}
          aria-label="Search Safe"
          onClick={onSafesDrawerOpen}
          h="2.75rem"
          w="2.75rem"
          p="0.5rem"
          cursor="pointer"
          weight="fill"
        />
      </Hide>

      <Show above="md">
        <Menu
          placement="bottom-end"
          offset={[0, 16]}
        >
          {({ isOpen }) => (
            <Fragment>
              <MenuButton
                as={Button}
                variant="tertiary"
                data-testid="header-favoritesMenuButton"
                p="0.75rem"
              >
                <Flex
                  alignItems="center"
                  gap={2}
                >
                  <Icon
                    as={Star}
                    boxSize="1.5rem"
                    weight="fill"
                  />
                  <Show above="md">
                    <Text>{t('titleFavorites')}</Text>
                    <Icon
                      as={CaretDown}
                      boxSize="1.5rem"
                    />
                  </Show>
                </Flex>
              </MenuButton>
              {isOpen && <SafesList />}
            </Fragment>
          )}
        </Menu>
      </Show>

      <AllSafesDrawer
        isOpen={isSafesDrawerOpen}
        onClose={onSafesDrawerClose}
        onOpen={onSafesDrawerOpen}
      />
    </Box>
  );
}