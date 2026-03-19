// frontend/components/admin/users-tab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, User, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminUser,
  createUserByAdmin,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from "@/services/adminApi";

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [isActive, setIsActive] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      actifs: users.filter((u) => u.is_active).length,
      inactifs: users.filter((u) => !u.is_active).length,
    };
  }, [users]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createUserByAdmin({
        email,
        password,
        role,
        is_active: isActive,
      });

      setEmail("");
      setPassword("");
      setRole("agent");
      setIsActive(true);

      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'utilisateur");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (
    userId: number,
    newRole: "admin" | "agent"
  ) => {
    try {
      await updateUserRole(userId, { role: newRole });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de rôle");
    }
  };

  const handleStatusChange = async (userId: number, nextStatus: boolean) => {
    try {
      await updateUserStatus(userId, { is_active: nextStatus });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de statut");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return <Badge className="bg-purple-100 text-purple-800">Administrateur</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">Agent</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seul l'administrateur peut créer un compte et modifier les rôles
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{stats.admins}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Actifs</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.actifs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Inactifs</p>
          <p className="text-2xl font-bold mt-1 text-gray-600">{stats.inactifs}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold mb-4">Créer un utilisateur</h3>

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@kyntus.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rôle</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "agent")}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
            >
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold">Utilisateur</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Rôle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Créé le</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      {user.role === "admin" ? (
                        <Shield className="w-4 h-4 text-purple-600" />
                      ) : (
                        <User className="w-4 h-4 text-blue-600" />
                      )}
                      {user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{user.email}</td>
                  <td className="py-3 px-4 text-sm">{getRoleBadge(user.role)}</td>
                  <td className="py-3 px-4 text-sm">{getStatusBadge(user.is_active)}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRoleChange(
                            user.id,
                            user.role === "admin" ? "agent" : "admin"
                          )
                        }
                      >
                        Mettre {user.role === "admin" ? "Agent" : "Admin"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(user.id, !user.is_active)}
                      >
                        {user.is_active ? "Désactiver" : "Activer"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}