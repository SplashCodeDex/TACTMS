import React, { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { MemberRecordA, MembershipReconciliationReport } from "../types.ts";
import {
  Users,
  UserPlus,
  UserMinus,
  CheckSquare,
  Square,
  Inbox,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface ReconciliationListProps {
  title: string;
  icon: React.ReactElement;
  members: MemberRecordA[];
  emptyText: string;
}

const ReconciliationList: React.FC<ReconciliationListProps> = ({
  title,
  icon,
  members,
  emptyText,
}) => (
  <div className="bg-[var(--bg-card-subtle-accent)] p-4 rounded-lg flex-1">
    <h3 className="font-semibold text-md mb-3 flex items-center text-[var(--text-primary)]">
      <span className="mr-2">{icon}</span>
      {title} ({members.length})
    </h3>
    {members.length > 0 ? (
      <ScrollArea className="h-48">
        <ul className="space-y-2 text-sm pr-2">
          {members.map((member, index) => {
            const name =
              `${member.Title || ""} ${member["First Name"] || ""} ${member.Surname || ""} ${member["Other Names"] || ""}`
                .replace(/\s+/g, " ")
                .trim() || "Unnamed Member";
            const membershipId =
              member["Membership Number"] ||
              member["Old Membership Number"] ||
              "N/A";
            return (
              <li
                key={member["No."] || index}
                className="text-[var(--text-secondary)] p-2 rounded-md bg-[var(--bg-card)]"
              >
                <p
                  className="font-medium text-[var(--text-primary)] truncate"
                  title={name}
                >
                  {name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  ID: {membershipId}
                </p>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    ) : (
      <div className="text-center py-4 flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
        <Inbox size={24} className="mb-2 opacity-50" />
        <p className="text-sm">{emptyText}</p>
      </div>
    )}
  </div>
);

interface MembershipReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MembershipReconciliationReport | null;
  onKeepMembers: (members: MemberRecordA[]) => void;
}

const MembershipReconciliationModal: React.FC<
  MembershipReconciliationModalProps
> = ({ isOpen, onClose, report, onKeepMembers }) => {
  const [selectedMissingIds, setSelectedMissingIds] = useState<
    Set<string | number>
  >(new Set());

  const handleToggleSelection = (id: string | number) => {
    setSelectedMissingIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (!report) return;
    if (selectedMissingIds.size === report.missingMembers.length) {
      setSelectedMissingIds(new Set());
    } else {
      setSelectedMissingIds(
        new Set(report.missingMembers.map((m) => m["No."]).filter((id): id is string | number => id !== undefined && id !== null)),
      );
    }
  };

  const handleKeepSelected = () => {
    if (!report) return;
    const membersToKeep = report.missingMembers.filter((m) => {
      if (m["No."]) {
        return selectedMissingIds.has(m["No."]);
      }
      return false;
    });
    if (membersToKeep.length > 0) {
      onKeepMembers(membersToKeep);
      setSelectedMissingIds(new Set()); // Clear selection after action
    }
  };

  if (!report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Membership Reconciliation"
      size="xl"
      closeOnOutsideClick={false}
      footerContent={
        <Button onClick={onClose} variant="primary" size="md">
          Continue to Dashboard
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <Users
            size={40}
            className="mx-auto text-[var(--primary-accent-start)]"
          />
          <p className="mt-2 text-md text-[var(--text-secondary)]">
            Comparing current file with the{" "}
            <strong className="text-[var(--text-primary)]">
              {report.previousFileDate}
            </strong>
            .
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <ReconciliationList
            title="New Members (Souls Won)"
            icon={<UserPlus size={20} className="text-[var(--success-text)]" />}
            members={report.newMembers}
            emptyText="No new members found."
          />
          <div className="bg-[var(--bg-card-subtle-accent)] p-4 rounded-lg flex-1">
            <h3 className="font-semibold text-md mb-3 flex items-center text-[var(--text-primary)]">
              <UserMinus size={20} className="mr-2 text-[var(--danger-text)]" />
              Missing Members ({report.missingMembers.length})
            </h3>
            {report.missingMembers.length > 0 ? (
              <>
                <ScrollArea className="h-48">
                  <ul className="space-y-1.5 text-sm pr-2">
                    {report.missingMembers.map((member) => (
                      <li
                        key={member["No."]}
                        className="text-[var(--text-secondary)] p-2 rounded-md bg-[var(--bg-card)] flex items-center gap-3 hover:bg-[var(--border-color)]/30 transition-colors"
                      >
                        <button
                          onClick={() => {
                            if (member["No."]) {
                              handleToggleSelection(member["No."]);
                            }
                          }}
                          className="flex-shrink-0 p-1"
                        >
                          {member["No."] && selectedMissingIds.has(member["No."]) ? (
                            <CheckSquare
                              size={20}
                              className="text-[var(--primary-accent-start)]"
                            />
                          ) : (
                            <Square
                              size={20}
                              className="text-[var(--text-muted)]"
                            />
                          )}
                        </button>
                        <div className="flex-grow overflow-hidden">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            {`${member.Title || ""} ${member["First Name"] || ""} ${member.Surname || ""} ${member["Other Names"] || ""}`
                              .replace(/\s+/g, " ")
                              .trim() || "Unnamed Member"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            ID:{" "}
                            {member["Membership Number"] ||
                              member["Old Membership Number"] ||
                              "N/A"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectAll}
                  >
                    {selectedMissingIds.size === report.missingMembers.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleKeepSelected}
                    disabled={selectedMissingIds.size === 0}
                  >
                    Keep Selected in List ({selectedMissingIds.size})
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                <Inbox size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No missing members.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MembershipReconciliationModal;
