import React from 'react';
import { useCurrentUser, useAdminUsers, useUpdateUserRole } from '@/hooks/useAuth';
import { Redirect, Link } from 'wouter';
import { Loader2, ChevronLeft, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminPage = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const updateUserRole = useUpdateUserRole();
  const { toast } = useToast();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole.mutateAsync({ userId, role });
      toast({ title: "Role updated", description: `User role changed to ${role}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e.message });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to projects
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                User Management
              </h1>
              <p className="text-muted-foreground">Admin panel for managing user roles and permissions.</p>
            </div>
          </div>
        </header>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {usersLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      {u.username}
                      {u.id === user.id && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold">You</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.id === user.id ? (
                        <span className="text-sm font-medium uppercase px-2 py-1 bg-muted rounded border">{u.role}</span>
                      ) : (
                        <Select 
                          value={u.role} 
                          onValueChange={(val) => handleRoleChange(u.id, val)}
                          disabled={updateUserRole.isPending}
                        >
                          <SelectTrigger className="w-[120px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PM">PM</SelectItem>
                            <SelectItem value="TECH">TECH</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled={u.id === user.id}>
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
