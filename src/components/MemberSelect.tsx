import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { MemberRecordA } from "../types";
import { getSimilarity } from "../utils/stringUtils";

interface MemberSelectProps {
    currentMember: MemberRecordA | null;
    onSelect: (member: MemberRecordA | null) => void;
    masterData: MemberRecordA[];
}

const MemberSelect: React.FC<MemberSelectProps> = ({
    currentMember,
    onSelect,
    masterData,
}) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const filteredMembers = useMemo(() => {
        if (!search) return [];
        const lowerSearch = search.toLowerCase();

        return masterData
            .map((m) => {
                const fullName =
                    `${m.Surname} ${m["First Name"]} ${m["Other Names"] || ""}`.trim();
                const score = getSimilarity(lowerSearch, fullName.toLowerCase());
                return { member: m, score };
            })
            .filter(
                (item) =>
                    item.score > 0.3 ||
                    // Keep exact substring matches even if score is low (e.g. short queries)
                    `${item.member.Surname} ${item.member["First Name"]}`
                        .toLowerCase()
                        .includes(lowerSearch)
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((item) => item.member);
    }, [search, masterData]);

    return (
        <div className="relative">
            <div
                className="p-2 border rounded cursor-pointer bg-input-bg flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate max-w-[200px]">
                    {currentMember
                        ? `${currentMember.Surname} ${currentMember["First Name"]}`
                        : "Select Member..."}
                </span>
                <Search size={14} />
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-card-bg border rounded shadow-lg max-h-60 overflow-auto">
                    <input
                        type="text"
                        className="w-full p-2 border-b bg-input-bg sticky top-0"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <div
                        className="p-2 hover:bg-hover-bg cursor-pointer text-red-400"
                        onClick={() => {
                            onSelect(null);
                            setIsOpen(false);
                        }}
                    >
                        No Match (Keep Raw Name)
                    </div>
                    {filteredMembers.map((m, i) => (
                        <div
                            key={`member-select-${m["Membership Number"]}-${i}`}
                            className="p-2 hover:bg-hover-bg cursor-pointer"
                            onClick={() => {
                                onSelect(m);
                                setIsOpen(false);
                            }}
                        >
                            {m.Surname} {m["First Name"]} ({m["Membership Number"]})
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MemberSelect;
