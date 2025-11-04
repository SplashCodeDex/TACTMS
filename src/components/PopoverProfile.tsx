import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Separator } from "./ui/separator"
import { LogOut, Settings, User } from "lucide-react"
import React from "react"
import { GoogleUserProfile } from "../types"
import SyncStatusIndicator from "./SyncStatusIndicator"

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface PopoverProfileProps {
  userProfile: GoogleUserProfile | null;
  signOut: () => void;
  syncStatus: SyncStatus;
  isOnline: boolean;
}

function PopoverProfile({ userProfile, signOut, syncStatus, isOnline }: PopoverProfileProps) {
  if (!userProfile) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.imageUrl} alt={userProfile.name} />
            <AvatarFallback>{userProfile.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 glassmorphism-bg border border-[var(--border-color)] rounded-xl" align="end">
        <div className="flex items-center space-x-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.imageUrl} alt={userProfile.name} />
            <AvatarFallback>{userProfile.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{userProfile.name}</h4>
            <p className="text-xs text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
          <SyncStatusIndicator status={syncStatus} isOnline={isOnline} />
        </div>
        <Separator className="my-2" />
        <div className="grid gap-1">
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Separator className="my-1" />
          <Button variant="ghost" className="w-full justify-start" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default React.memo(PopoverProfile)