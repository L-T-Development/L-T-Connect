'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamMembers, ROLE_CONFIG } from '@/hooks/use-team';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMemberSelectorProps {
    workspaceId: string;
    value?: string[]; // Array of user IDs
    onChange: (value: string[]) => void;
    placeholder?: string;
    multiSelect?: boolean;
    className?: string;
}

export function TeamMemberSelector({
    workspaceId,
    value = [],
    onChange,
    placeholder = 'Select team members...',
    multiSelect = true,
    className,
}: TeamMemberSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const { data: teamMembers = [], isLoading } = useTeamMembers(workspaceId);

    // Filter only active members
    const activeMembers = React.useMemo(() => {
        return teamMembers.filter(member => member.status === 'ACTIVE');
    }, [teamMembers]);

    const selectedMembers = React.useMemo(() => {
        return activeMembers.filter(member => value.includes(member.userId));
    }, [activeMembers, value]);

    const handleSelect = (userId: string) => {
        if (multiSelect) {
            const newValue = value.includes(userId)
                ? value.filter(id => id !== userId)
                : [...value, userId];
            onChange(newValue);
        } else {
            onChange([userId]);
            setOpen(false);
        }
    };

    const handleRemove = (userId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(value.filter(id => id !== userId));
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', className)}
                >
                    <div className="flex flex-wrap gap-1 flex-1">
                        {selectedMembers.length === 0 ? (
                            <span className="text-muted-foreground">{placeholder}</span>
                        ) : (
                            selectedMembers.map(member => (
                                <Badge
                                    key={member.userId}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                >
                                    <Avatar className="h-4 w-4">
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback className="text-xs">
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="max-w-[100px] truncate">{member.name}</span>
                                    {multiSelect && (
                                        <X
                                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                                            onClick={(e) => handleRemove(member.userId, e)}
                                        />
                                    )}
                                </Badge>
                            ))
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search team members..." />
                    <CommandEmpty>
                        {isLoading ? 'Loading...' : 'No team members found.'}
                    </CommandEmpty>
                    <ScrollArea className="max-h-[300px]">
                        <CommandGroup>
                            {activeMembers.map(member => {
                                const isSelected = value.includes(member.userId);
                                return (
                                    <CommandItem
                                        key={member.userId}
                                        value={`${member.name} ${member.email}`}
                                        onSelect={() => handleSelect(member.userId)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div
                                                className={cn(
                                                    'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'opacity-50 [&_svg]:invisible'
                                                )}
                                            >
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{member.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {member.email}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="text-xs shrink-0"
                                            >
                                                {ROLE_CONFIG[member.role].label}
                                            </Badge>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </ScrollArea>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
