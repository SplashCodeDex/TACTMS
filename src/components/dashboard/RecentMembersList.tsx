import React from "react";
import { User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemberRecordA } from "../../types";
import { formatDateDDMMMYYYY } from "../../lib/dataTransforms";

interface RecentMembersListProps {
    members: MemberRecordA[];
}

const RecentMembersList: React.FC<RecentMembersListProps> = ({ members }) => {
    return (
        <section className="content-card">
            <h2 className="section-heading">
                <User size={22} className="mr-3 icon-primary" />
                Recently Added Members
            </h2>
            {members.length > 0 ? (
                <ScrollArea className="h-[auto] md:h-[200px]">
                    <ul className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 no-scrollbar md:block md:space-y-3 md:pb-0 md:mx-0 md:px-0">
                        {members.map((member, index) => (
                            <li
                                key={`member-${member["No."]}-${member["First Name"]}-${member.Surname}-${index}`}
                                className="flex flex-col md:flex-row items-center gap-2 md:gap-4 p-0 md:p-3 min-w-[80px] md:min-w-0 snap-start text-center md:text-left rounded-lg md:hover:bg-[var(--bg-card-subtle-accent)] transition-colors cursor-pointer"
                            >
                                <div className="w-14 h-14 md:w-10 md:h-10 flex-shrink-0 bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] rounded-full md:rounded-lg flex items-center justify-center text-white shadow-sm ring-2 ring-[var(--bg-card)] md:ring-0">
                                    <User size={24} className="md:w-5 md:h-5" />
                                </div>
                                <div className="overflow-hidden w-full">
                                    <p className="font-semibold text-xs md:text-sm text-[var(--text-primary)] truncate">
                                        {member["First Name"]} <span className="hidden md:inline">{member.Surname}</span>
                                    </p>
                                    <p className="text-[10px] md:text-xs text-[var(--text-secondary)] truncate hidden md:block">
                                        {member.firstSeenSource}
                                        <span className="text-[var(--text-muted)] mx-1"> • </span>
                                        {member.firstSeenDate
                                            ? formatDateDDMMMYYYY(new Date(member.firstSeenDate))
                                            : "N/A"}
                                    </p>
                                    {/* Mobile Only Name (Surname split) */}
                                    <p className="font-medium text-[10px] text-[var(--text-secondary)] md:hidden truncate">
                                        {member.Surname}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            ) : (
                <p className="text-sm text-center py-8 text-[var(--text-muted)]">
                    No new members recorded recently.
                </p>
            )}
        </section>
    );
};

export default RecentMembersList;
