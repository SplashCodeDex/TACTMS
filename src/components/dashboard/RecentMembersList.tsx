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
                <ScrollArea className="h-[200px]">
                    <ul className="space-y-3 pr-4">
                        {members.map((member, index) => (
                            <li
                                key={`member-${member["No."]}-${member["First Name"]}-${member.Surname}-${index}`}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-card-subtle-accent)] transition-colors"
                            >
                                <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-blue)] rounded-lg flex items-center justify-center text-white">
                                    <User size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                        {member["First Name"]} {member.Surname}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {member.firstSeenSource}
                                        <span className="text-[var(--text-muted)] mx-1"> • </span>
                                        {member.firstSeenDate
                                            ? formatDateDDMMMYYYY(new Date(member.firstSeenDate))
                                            : "N/A"}
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
