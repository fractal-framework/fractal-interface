import { Avatar, Flex, Text } from '@chakra-ui/react';
import ContentBox from '../ui/containers/ContentBox';
import Markdown from '../ui/proposal/Markdown';

type ExampleTemplateCardProps = {
  title: string;
  description: string;
  onProposalTemplateClick: () => void;
};

export default function ExampleTemplateCard({
  title,
  description,
  onProposalTemplateClick,
}: ExampleTemplateCardProps) {
  return (
    <ContentBox
      containerBoxProps={{ flex: '0 0 calc(33.333333% - 0.6666666rem)', my: '0' }}
      onClick={onProposalTemplateClick}
    >
      <Flex justifyContent="space-between">
        <Avatar
          size="lg"
          w="50px"
          h="50px"
          name={title}
          borderRadius={0}
          getInitials={(_title: string) => _title.slice(0, 2)}
          textStyle="heading-large"
          color="white-0"
        />
      </Flex>
      <Text
        textStyle="heading-small"
        color="white-0"
        my="0.5rem"
      >
        {title}
      </Text>
      <Markdown content={description} />
    </ContentBox>
  );
}
