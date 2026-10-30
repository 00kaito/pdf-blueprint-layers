import React, { useState } from 'react';
import { useCurrentUser, useAdminUsers, useCreateUser, useUpdateUserRole, useUpdateUserPassword } from '@/hooks/useAuth';
import { Redirect, Link } from 'wouter';
import { Loader2, ChevronLeft, Shield, User as UserIcon, Key, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

/** Error text from apiRequest ("400: {\"message\":\"...\"}") → just the message. */
const errorMessage = (e: unknown) => {
  const text = e instanceof Error ? e.message : String(e);
  try { return JSON.parse(text.replace(/^\d+:\s*/, '')).message ?? text; } catch { return text; }
};

/** Admin adds an account with its role; the person signs in with this username and password. */
const AddUserForm = () => {
  const createUser = useCreateUser();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TECH");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    try {
      await createUser.mutateAsync({ username: username.trim(), password, role });
      toast({ title: "User added", description: `${username.trim().toLowerCase()} can now sign in as ${role}.` });
      setUsername("");
      setPassword("");
    } catch (err) {
      toast({ variant: "destructive", title: "Could not add user", description: errorMessage(err) });
    }
  };

  return (
    <form onSubmit={submit} className="bg-card rounded-lg border shadow-sm p-4 space-y-3" data-testid="add-user-form">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        Add user
      </h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          className="h-9 sm:flex-1"
          data-testid="add-user-username"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="h-9 sm:flex-1"
          data-testid="add-user-password"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-9 sm:w-[120px]" data-testid="add-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PM">PM</SelectItem>
            <SelectItem value="TECH">TECH</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="h-9 gap-2" disabled={!username.trim() || !password || createUser.isPending}>
          {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add
        </Button>
      </div>
    </form>
  );
};

const AdminPage = () => {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const updateUserRole = useUpdateUserRole();
  const updateUserPassword = useUpdateUserPassword();
  const { toast } = useToast();

  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

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

  const handlePasswordChange = async (userId: string) => {
    if (!newPassword) {
      toast({ variant: "destructive", title: "Validation error", description: "Password cannot be empty" });
      return;
    }
    try {
      await updateUserPassword.mutateAsync({ userId, password: newPassword });
      toast({ title: "Password updated", description: "User password has been changed." });
      setResettingPasswordId(null);
      setNewPassword("");
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
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-border shadow-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-sm font-bold">{user.username}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{user.role}</span>
              </div>
            </div>
          )}
        </header>

        <AddUserForm />

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
                      {resettingPasswordId === u.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input 
                            type="password" 
                            placeholder="New password" 
                            className="h-8 w-32 text-xs" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            className="h-8 px-2"
                            onClick={() => handlePasswordChange(u.id)}
                            disabled={updateUserPassword.isPending}
                          >
                            {updateUserPassword.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2"
                            onClick={() => {
                              setResettingPasswordId(null);
                              setNewPassword("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => {
                            setResettingPasswordId(u.id);
                            setNewPassword("");
                          }}
                        >
                          <Key className="h-4 w-4" />
                          Zmień hasło
                        </Button>
                      )}
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
