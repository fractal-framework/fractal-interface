import Clock from "./svg/Clock";

function ProposalTime({ proposalStartString, proposalEndString, textSize }: { proposalStartString: string, proposalEndString: string, textSize?: string }) {
  return (
    <div className="flex">
      <Clock />
      <div className={`px-2 text-gray-50 ${textSize} flex whitespace-nowrap flex-wrap gap-1 items-start`}>
        <span>{proposalStartString} -</span> <span>{proposalEndString}</span>
      </div>
    </div>
  );
}

export default ProposalTime;