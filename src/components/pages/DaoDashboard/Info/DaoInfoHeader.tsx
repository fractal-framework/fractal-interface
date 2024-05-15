import { Box, Flex, Text } from '@chakra-ui/react';
import useDAOMetadata from '../../../../hooks/DAO/useDAOMetadata';
import { DAOInfoCard } from '../../../ui/cards/DAOInfoCard';
import { InfoBox } from '../../../ui/containers/InfoBox';
import ExternalLink from '../../../ui/links/ExternalLink';
import { InfoGovernance } from './InfoGovernance';
import { InfoProposals } from './InfoProposals';
import { InfoTreasury } from './InfoTreasury';
import { ParentLink } from './ParentLink';

export function DaoInfoHeader() {
  const daoMetadata = useDAOMetadata();

  // using this gap method instead of 'gap' to make width percentages more precise, since they
  // can now add up to 100%, as well as prevent variable gap space as you widen the screen
  const PAD = '0.5rem'; // half the intended gap of 1rem
  const NONE = '0rem';

  return (
    <Flex
      flexDirection="column"
      minH="10.5rem"
    >
      <ParentLink />
      <Flex
        flexWrap="wrap"
        justifyContent="space-between"
        mb="2rem"
        gap={{ base: '1rem', lg: 0 }}
      >
        <Box
          width={{ base: '100%', md: '100%', lg: '33%', xl: '40%' }}
          pe={{ base: NONE, lg: PAD }}
          pb={{ sm: PAD, lg: NONE }}
        >
          <InfoBox>
            <DAOInfoCard />
          </InfoBox>
        </Box>
        {daoMetadata ? (
          <>
            <Box
              width={{ base: '100%', md: '100%', lg: '67%', xl: '60%' }}
              ps={{ base: NONE, lg: PAD }}
              pe={{ base: NONE, md: PAD }}
              pb={{ sm: PAD, md: NONE }}
              pt={{ sm: PAD, lg: NONE }}
            >
              <InfoBox
                display="flex"
                justifyContent="space-between"
              >
                <Box width="25%">
                  <InfoGovernance />
                </Box>
                <Box width="25%">
                  <InfoProposals />
                </Box>
                <Box width="25%">
                  <InfoTreasury />
                </Box>
              </InfoBox>
            </Box>
            <Flex
              gap={6}
              mt={8}
              pe={{ base: NONE, md: PAD }}
              pb={{ sm: PAD, md: NONE }}
              pt={{ sm: PAD, lg: NONE }}
            >
              {daoMetadata.sections.map((section, index) => (
                <InfoBox
                  overflow="hidden"
                  position="relative"
                  minWidth="auto"
                  width="50%"
                  key={index}
                >
                  {section.background && (
                    <Box
                      left="0"
                      top="-150%"
                      width="47.2vw"
                      height="47.2vw"
                      position="absolute"
                      zIndex="-1"
                      background={`url(${section.background})`}
                      backgroundSize="cover"
                      backgroundRepeat="no-repeat"
                      backgroundColor="lightgray"
                      backgroundPosition="50%"
                    />
                  )}
                  <Text marginBottom={2}>{section.title}</Text>
                  <Text>
                    {section.link && section.link.position === 'start' && (
                      <ExternalLink href={section.link.url}>{section.link.text}</ExternalLink>
                    )}
                    {section.content}
                    {section.link && section.link.position === 'end' && (
                      <ExternalLink href={section.link.url}>{section.link.text}</ExternalLink>
                    )}
                  </Text>
                </InfoBox>
              ))}
            </Flex>
          </>
        ) : (
          <>
            <Box
              width={{ base: '100%', md: '33.3%', lg: '25%', xl: '20%' }}
              ps={{ base: NONE, lg: PAD }}
              pe={{ base: NONE, md: PAD }}
              pb={{ sm: PAD, md: NONE }}
              pt={{ sm: PAD, lg: NONE }}
            >
              <InfoBox>
                <InfoGovernance />
              </InfoBox>
            </Box>

            <Box
              width={{ base: '100%', md: '33.3%', lg: '19%', xl: '20%' }}
              ps={{ base: NONE, md: PAD }}
              pe={{ base: NONE, md: PAD }}
              pb={{ sm: PAD, md: NONE }}
              pt={{ sm: PAD, lg: NONE }}
            >
              <InfoBox>
                <InfoProposals />
              </InfoBox>
            </Box>

            <Box
              width={{ base: '100%', md: '33.3%', lg: '23%', xl: '20%' }}
              ps={{ base: NONE, md: PAD }}
              pt={{ sm: PAD, lg: NONE }}
            >
              <InfoBox>
                <InfoTreasury />
              </InfoBox>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}