import { Flex, Grid, GridItem, Icon, Text } from '@chakra-ui/react';
import { IconProps, BookOpen, Sparkle, ArrowUpRight } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BASE_ROUTES } from '../../constants/routes';
import { URL_DOCS } from '../../constants/url';

interface CardContentProps {
  icon: React.ForwardRefExoticComponent<IconProps>;
  title: string;
  subtitle: string;
}

function CardContent({ icon, title, subtitle }: CardContentProps) {
  return (
    <GridItem
      p={6}
      bg="neutral-2"
      borderRadius="lg"
      cursor="pointer"
    >
      <Flex
        direction="column"
        gap={6}
      >
        <Flex
          align="center"
          justify="space-between"
        >
          <Icon
            as={icon}
            boxSize={6}
            color="lilac-0"
          />
          <Icon
            as={ArrowUpRight}
            boxSize={6}
            color="lilac-0"
          />
        </Flex>
        <Flex
          direction="column"
          gap={2}
        >
          <Text textStyle="heading-small">{title}</Text>
          <Text
            textStyle="body-medium"
            color="neutral-7"
          >
            {subtitle}
          </Text>
        </Flex>
      </Flex>
    </GridItem>
  );
}

interface ActionCardProps extends CardContentProps {
  to: string;
  external?: boolean;
}

export function ActionCard({ to, external, ...contentProps }: ActionCardProps) {
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
      >
        <CardContent {...contentProps} />
      </a>
    );
  }

  return (
    <Link to={to}>
      <CardContent {...contentProps} />
    </Link>
  );
}

export function GettingStarted() {
  const { t } = useTranslation('home');

  return (
    <Flex
      direction="column"
      gap="1.5rem"
    >
      <Text textStyle="heading-small">{t('gettingStarted')}</Text>

      <Grid
        templateColumns={['1fr', '1fr', 'repeat(2, 1fr)']}
        gap={4}
      >
        <ActionCard
          icon={Sparkle}
          title={t('createCTA')}
          subtitle={t('createCTASubtitle')}
          to={BASE_ROUTES.create}
        />

        <ActionCard
          icon={BookOpen}
          title={t('exploreDocsCTA')}
          subtitle={t('exploreDocsCTASubtitle')}
          to={URL_DOCS}
          external
        />
      </Grid>
    </Flex>
  );
}
