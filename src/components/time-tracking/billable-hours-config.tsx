'use client';

import React, { useState } from 'react';
import { DollarSign, Save, User, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface BillableConfig {
  defaultRate: number;
  currency: string;
  autoMarkBillable: boolean;
  userRates: Record<string, number>;
  projectRates: Record<string, number>;
}

interface BillableHoursConfigProps {
  workspaceId: string;
  initialConfig?: Partial<BillableConfig>;
  users?: Array<{ $id: string; name: string; email: string }>;
  projects?: Array<{ $id: string; name: string }>;
}

export function BillableHoursConfig({
  initialConfig,
  users = [],
  projects = [],
}: BillableHoursConfigProps) {
  const [config, setConfig] = useState<BillableConfig>({
    defaultRate: initialConfig?.defaultRate || 50,
    currency: initialConfig?.currency || 'USD',
    autoMarkBillable: initialConfig?.autoMarkBillable || false,
    userRates: initialConfig?.userRates || {},
    projectRates: initialConfig?.projectRates || {},
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would save to Appwrite
      // For now, we'll just simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success('Billable hours configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const setUserRate = (userId: string, rate: string) => {
    const rateNum = parseFloat(rate);
    if (!isNaN(rateNum) && rateNum >= 0) {
      setConfig((prev) => ({
        ...prev,
        userRates: { ...prev.userRates, [userId]: rateNum },
      }));
    }
  };

  const setProjectRate = (projectId: string, rate: string) => {
    const rateNum = parseFloat(rate);
    if (!isNaN(rateNum) && rateNum >= 0) {
      setConfig((prev) => ({
        ...prev,
        projectRates: { ...prev.projectRates, [projectId]: rateNum },
      }));
    }
  };

  const removeUserRate = (userId: string) => {
    setConfig((prev) => {
      const { [userId]: _, ...rest } = prev.userRates;
      return { ...prev, userRates: rest };
    });
  };

  const removeProjectRate = (projectId: string) => {
    setConfig((prev) => {
      const { [projectId]: _, ...rest } = prev.projectRates;
      return { ...prev, projectRates: rest };
    });
  };

  // Calculate statistics
  const stats = {
    usersWithRates: Object.keys(config.userRates).length,
    projectsWithRates: Object.keys(config.projectRates).length,
    averageUserRate:
      Object.values(config.userRates).length > 0
        ? Object.values(config.userRates).reduce((a, b) => a + b, 0) /
          Object.values(config.userRates).length
        : config.defaultRate,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billable Hours Configuration</h2>
        <p className="text-muted-foreground">
          Configure hourly rates and billing settings for time tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${config.defaultRate}/hr
            </div>
            <p className="text-xs text-muted-foreground">Workspace default</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom User Rates</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersWithRates}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${stats.averageUserRate.toFixed(2)}/hr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Rates</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectsWithRates}</div>
            <p className="text-xs text-muted-foreground">
              Projects with custom rates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>
            These settings apply to all time entries unless overridden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultRate">Default Hourly Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="defaultRate"
                  type="number"
                  value={config.defaultRate}
                  onChange={(e) =>
                    setConfig({ ...config, defaultRate: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                />
                <span className="text-muted-foreground text-sm">/hour</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={config.currency}
                onValueChange={(value) => setConfig({ ...config, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoMarkBillable">Auto-mark as Billable</Label>
              <p className="text-sm text-muted-foreground">
                Automatically mark new time entries as billable
              </p>
            </div>
            <Switch
              id="autoMarkBillable"
              checked={config.autoMarkBillable}
              onCheckedChange={(checked) =>
                setConfig({ ...config, autoMarkBillable: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* User-Specific Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User-Specific Rates
          </CardTitle>
          <CardDescription>
            Set custom hourly rates for individual team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {users.map((user) => {
                const currentRate = config.userRates[user.$id];
                const hasCustomRate = currentRate !== undefined;

                return (
                  <div
                    key={user.$id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasCustomRate ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={currentRate}
                              onChange={(e) => setUserRate(user.$id, e.target.value)}
                              className="w-24"
                              min="0"
                              step="0.01"
                            />
                            <span className="text-muted-foreground text-sm">/hr</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserRate(user.$id)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            ${config.defaultRate}/hr (default)
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUserRate(user.$id, config.defaultRate.toString())}
                          >
                            Set Custom
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Project-Specific Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Project-Specific Rates
          </CardTitle>
          <CardDescription>
            Set custom hourly rates for specific projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {projects.map((project) => {
                const currentRate = config.projectRates[project.$id];
                const hasCustomRate = currentRate !== undefined;

                return (
                  <div
                    key={project.$id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{project.name}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasCustomRate ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={currentRate}
                              onChange={(e) => setProjectRate(project.$id, e.target.value)}
                              className="w-24"
                              min="0"
                              step="0.01"
                            />
                            <span className="text-muted-foreground text-sm">/hr</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProjectRate(project.$id)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">
                            ${config.defaultRate}/hr (default)
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setProjectRate(project.$id, config.defaultRate.toString())
                            }
                          >
                            Set Custom
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
