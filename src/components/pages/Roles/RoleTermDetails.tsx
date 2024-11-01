import {
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  Flex,
  Icon,
  AccordionPanel,
  Text,
} from '@chakra-ui/react';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { getAddress } from 'viem';
import NoDataCard from '../../ui/containers/NoDataCard';
import RoleTerm from './RoleTerm';
import { RoleFormTermStatus } from './types';

function RoleTermRenderer({
  roleTerm,
  termStatus,
  containerVariant,
}: {
  roleTerm?: {
    nominee?: string;
    termEndDate?: Date;
    termNumber: number;
  };
  termStatus: RoleFormTermStatus;
  containerVariant?: 'dark' | 'light';
}) {
  if (!roleTerm?.nominee || !roleTerm?.termEndDate) {
    return null;
  }
  return (
    <RoleTerm
      memberAddress={getAddress(roleTerm.nominee)}
      termEndDate={roleTerm.termEndDate}
      termStatus={termStatus}
      termNumber={roleTerm.termNumber}
      containerVariant={containerVariant}
    />
  );
}

function RoleTermExpiredTerms({
  roleTerms,
}: {
  roleTerms?: {
    nominee?: string;
    termEndDate?: Date;
    termNumber: number;
  }[];
}) {
  const { t } = useTranslation('roles');
  if (!roleTerms?.length) {
    return null;
  }
  return (
    <Box
      borderRadius="0.5rem"
      boxShadow="layeredShadowBorder"
    >
      <Accordion allowToggle>
        <AccordionItem
          borderTop="none"
          borderBottom="none"
          borderTopRadius="0.5rem"
          borderBottomRadius="0.5rem"
        >
          {({ isExpanded }) => (
            <>
              <AccordionButton
                borderTopRadius="0.5rem"
                borderBottomRadius="0.5rem"
                p="1rem"
              >
                <Flex
                  alignItems="center"
                  gap={2}
                >
                  <Icon
                    as={!isExpanded ? CaretDown : CaretRight}
                    boxSize="1.25rem"
                    color="lilac-0"
                  />
                  <Text
                    textStyle="button-base"
                    color="lilac-0"
                  >
                    {t('showPreviousTerms')}
                  </Text>
                </Flex>
              </AccordionButton>
              <Flex
                flexDir="column"
                gap={4}
              >
                {roleTerms.map((term, index) => {
                  return (
                    <AccordionPanel
                      key={index}
                      px="1rem"
                    >
                      <RoleTermRenderer
                        key={index}
                        roleTerm={term}
                        termStatus={RoleFormTermStatus.Expired}
                        containerVariant="light"
                      />
                    </AccordionPanel>
                  );
                })}
              </Flex>
            </>
          )}
        </AccordionItem>
      </Accordion>
    </Box>
  );
}

export default function RoleTermDetails({
  currentTerm,
  nextTerm,
  expiredTerms,
}: {
  nextTerm:
    | {
        termEndDate: Date;
        termNumber: number;
        nominee: string;
      }
    | undefined;
  currentTerm:
    | {
        termEndDate: Date;
        termNumber: number;
        nominee: string;
      }
    | undefined;
  expiredTerms: {
    termEndDate: Date;
    termNumber: number;
    nominee: string;
  }[];
}) {
  return (
    <Flex
      flexDir="column"
      gap={4}
    >
      {!currentTerm && (
        <NoDataCard
          translationNameSpace="roles"
          emptyText="noActiveTerms"
          emptyTextNotProposer="noActiveTermsNotProposer"
        />
      )}
      <RoleTermRenderer
        roleTerm={nextTerm}
        termStatus={nextTerm ? RoleFormTermStatus.Queued : RoleFormTermStatus.Pending}
      />
      <RoleTermRenderer
        roleTerm={currentTerm}
        termStatus={currentTerm ? RoleFormTermStatus.Current : RoleFormTermStatus.Pending}
      />
      <RoleTermExpiredTerms roleTerms={expiredTerms} />
    </Flex>
  );
}
