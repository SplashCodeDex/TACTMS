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
}

        const ConflictsList: React.FC<{
  conflicts: import("../types.ts").ConflictingMemberDetail[];
        onResolve: (
        conflict: import("../types.ts").ConflictingMemberDetail,
        resolution: "new" | "merge"
  ) => void;
}> = ({conflicts, onResolve}) => (
        <div className="bg-[var(--bg-card-subtle-accent)] p-4 rounded-lg flex-1 col-span-1 md:col-span-2 border border-[var(--warning-text)]">
          <h3 className="font-semibold text-md mb-3 flex items-center text-[var(--text-primary)]">
            <Users size={20} className="mr-2 text-[var(--warning-text)]" />
            Potential Conflicts / Twins ({conflicts.length})
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            The following members have the <strong>same name</strong> but{" "}
            <strong>different IDs</strong>. Please verify if they are new members or if
            they should be merged with the existing record.
          </p>
          <ScrollArea className="h-64">
            <ul className="space-y-4 pr-2">
              {conflicts.map((conflict, index) => {
                const newName = `${conflict.newRecord["First Name"]} ${conflict.newRecord.Surname}`;
                const newId = conflict.newRecord["Membership Number"];
                const oldId = conflict.existingMember["Membership Number"];

                return (
                  <li
                    key={index}
                    className="text-[var(--text-secondary)] p-4 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)]">
                          {newName}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          Name Match Detected
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-2 bg-[var(--bg-elevated)] rounded">
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                          Existing Record
                        </p>
                        <p className="text-sm">ID: {oldId}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          (In Database)
                        </p>
                      </div>
                      <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--primary-accent-start)]">
                        <p className="text-xs font-semibold text-[var(--primary-accent-start)] uppercase">
                          New Record
                        </p>
                        <p className="text-sm">ID: {newId}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          (From File)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onResolve(conflict, "new")}
                      >
                        Treat as New Member
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onResolve(conflict, "merge")}
                      >
                        Merge (Update ID)
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
        );

        const ChangedMembersList: React.FC<{
  members: import("../types.ts").ChangedMemberDetail[];
}> = ({members}) => (
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
                        {item.matchType === 'OldID' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Linked via Old ID
                          </span>
                        )}
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
        > = ({isOpen, onClose, report, onResolveConflict}) => {
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
                {report.conflicts && report.conflicts.length > 0 && onResolveConflict && (
                  <ConflictsList
                    conflicts={report.conflicts}
                    onResolve={onResolveConflict}
                  />
                )}
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
