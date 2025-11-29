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
}

const ChangedMembersList: React.FC<{
  members: import("../types.ts").ChangedMemberDetail[];
}> = ({ members }) => (
  <div className="bg-[var(--bg-card-subtle-accent)] p-4 rounded-lg flex-1">
    <h3 className="font-semibold text-md mb-3 flex items-center text-[var(--text-primary)]">
      <Users size={20} className="mr-2 text-[var(--warning-text)]" />
      Changed Members ({members.length})
    </h3>
    {members.length > 0 ? (
      <ScrollArea className="h-48">
        <ul className="space-y-2 text-sm pr-2">
          {members.map((item, index) => {
            const name =
              `${item.newRecord.Title || ""} ${item.newRecord["First Name"] || ""} ${item.newRecord.Surname || ""} ${item.newRecord["Other Names"] || ""}`
                .replace(/\s+/g, " ")
                .trim() || "Unnamed Member";
            return (
              <li
                key={item.memberId || index}
                className="text-[var(--text-secondary)] p-2 rounded-md bg-[var(--bg-card)]"
              >
                <p className="font-medium text-[var(--text-primary)] truncate" title={name}>
                  {name}
                </p>
                <div className="text-xs text-[var(--text-muted)] mt-1 space-y-1">
                  {item.changes.map((change, i) => (
                    <div key={i} className="flex gap-1">
                      <span className="font-semibold">{change.field}:</span>
                      <span className="line-through opacity-70">{String(change.oldValue)}</span>
                      <span>→</span>
                      <span className="text-[var(--primary-accent-start)]">{String(change.newValue)}</span>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    ) : (
      <div className="text-center py-4 flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
        <Inbox size={24} className="mb-2 opacity-50" />
        <p className="text-sm">No members with changes.</p>
      </div>
    )}
  </div>
);

const MembershipReconciliationModal: React.FC<
  MembershipReconciliationModalProps
> = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Membership Reconciliation"
      size="xxl"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReconciliationList
            title="Members Missing from Master List"
            icon={<UserPlus size={20} className="text-[var(--success-text)]" />}
            members={report.newMembers}
            emptyText="No new members."
          />

          <ChangedMembersList members={report.changedMembers} />
        </div>
      </div>
    </Modal>
  );
};

export default MembershipReconciliationModal;
