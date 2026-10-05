import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Ban,
  CircleCheck,
  Clock,
  Copy,
  Ellipsis,
  Mail,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  roleLabel,
  type AssignableRole,
  type TeamMember,
  type TeamRole,
} from "../../services/teamService";

const ROLE_BADGE: Record<TeamRole, string> = {
  owner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent",
  manager: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-transparent",
  worker: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-transparent",
};

interface TeamMemberTableProps {
  members: TeamMember[];
  isOwner: boolean;
  selfUserId: string | null;
  onCopy: (text: string, label?: string) => void;
  onRoleChange: (member: TeamMember, next: AssignableRole) => void;
  onOffboard: (member: TeamMember) => void;
}

export function TeamMemberTable({
  members,
  isOwner,
  selfUserId,
  onCopy,
  onRoleChange,
  onOffboard,
}: TeamMemberTableProps) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wide text-slate-400">Name</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-400">Email</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-400">Role</TableHead>
            <TableHead className="text-xs uppercase tracking-wide text-slate-400">Status</TableHead>
            {isOwner && (
              <TableHead className="text-xs uppercase tracking-wide text-slate-400 text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = selfUserId === member.auth_user_id || selfUserId === member.id;
            const locked = isSelf || member.role === "owner";
            return (
              <TableRow key={member.id} className="border-slate-50 dark:border-slate-800/60">
                <TableCell className="font-medium text-slate-900 dark:text-white">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      {(member.full_name || member.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                    {member.full_name || "—"}
                    {isSelf && <span className="text-[11px] text-slate-400">(you)</span>}
                  </span>
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">{member.email}</TableCell>
                <TableCell>
                  <Badge className={`rounded-full capitalize ${ROLE_BADGE[member.role]}`}>
                    {member.role === "owner" && <ShieldCheck className="w-3 h-3 mr-1" />}
                    {roleLabel(member.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.must_change_password ? (
                    <Badge className="rounded-full border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Clock className="w-3 h-3 mr-1" /> Pending first login
                    </Badge>
                  ) : (
                    <Badge className="rounded-full border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <CircleCheck className="w-3 h-3 mr-1" /> Active
                    </Badge>
                  )}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-right">
                    {locked ? (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Manage ${member.full_name || member.email}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          >
                            <Ellipsis className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Manage member</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onCopy(member.email)}>
                            <Copy className="w-4 h-4 mr-2" /> Copy email address
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onCopy(
                                `${member.full_name || "Hello"}
Sign in with ${member.email} and set your own password.`,
                                "Invite details copied",
                              )
                            }
                          >
                            <Mail className="w-4 h-4 mr-2" /> Copy invite details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-slate-400 font-normal">
                            Change role
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={member.role === "manager"}
                            onClick={() => onRoleChange(member, "manager")}
                          >
                            <UserCog className="w-4 h-4 mr-2" /> Manager — broad access
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={member.role === "worker"}
                            onClick={() => onRoleChange(member, "worker")}
                          >
                            <UserCog className="w-4 h-4 mr-2" /> Worker — day-to-day logs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600"
                            onClick={() => onOffboard(member)}
                          >
                            <Ban className="w-4 h-4 mr-2" /> Offboard &amp; revoke access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}