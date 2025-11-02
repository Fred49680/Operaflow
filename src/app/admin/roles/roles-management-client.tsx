"use client";

import { useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";

type Role = Database["public"]["Tables"]["roles"]["Row"];
type Permission = Database["public"]["Tables"]["tbl_permissions"]["Row"] & {
  roles?: { name: string } | null;
};

interface Props {
  roles: Role[];
  permissions: Permission[];
}

const MODULES = [
  { id: "rh", name: "RH Collaborateurs" },
  { id: "affaires", name: "Affaires" },
  { id: "planification", name: "Planification & Suivi" },
  { id: "kpi", name: "KPI & Alertes" },
  { id: "all", name: "Tous les modules" },
];

const ACTIONS = [
  { id: "read", name: "Lecture" },
  { id: "write", name: "Écriture" },
  { id: "validate", name: "Validation" },
  { id: "delete", name: "Suppression" },
  { id: "admin", name: "Administration" },
];

export default function RolesManagementClient({ roles, permissions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Role | null>(null);
  const [showCloneModal, setShowCloneModal] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<
    { module: string; action: string }[]
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    modules_autorises: [] as string[],
  });

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      setError("Le nom du rôle est requis");
      return;
    }

    setLoading("create");
    setError(null);

    try {
      const supabase = createClientSupabase();

      // Créer le rôle
      const { data: newRole, error: roleError } = await supabase
        .from("roles")
        .insert({
          name: formData.name,
          description: formData.description || null,
          modules_autorises: formData.modules_autorises.length > 0 
            ? formData.modules_autorises 
            : null,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Créer les permissions associées
      if (selectedPermissions.length > 0 && newRole) {
        const permissionsToInsert = selectedPermissions.map((perm) => ({
          role_id: newRole.id,
          module: perm.module,
          action: perm.action,
          resource_path: null,
        }));

        await supabase.from("tbl_permissions").insert(permissionsToInsert);
      }

      setSuccess("Rôle créé avec succès");
      setShowCreateModal(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du rôle");
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleEditRole = async () => {
    if (!showEditModal || !formData.name.trim()) {
      setError("Le nom du rôle est requis");
      return;
    }

    setLoading(showEditModal.id);
    setError(null);

    try {
      const supabase = createClientSupabase();

      await supabase
        .from("roles")
        .update({
          name: formData.name,
          description: formData.description || null,
          modules_autorises: formData.modules_autorises.length > 0 
            ? formData.modules_autorises 
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", showEditModal.id);

      // Mettre à jour les permissions (supprimer les anciennes et créer les nouvelles)
      await supabase
        .from("tbl_permissions")
        .delete()
        .eq("role_id", showEditModal.id);

      if (selectedPermissions.length > 0) {
        const permissionsToInsert = selectedPermissions.map((perm) => ({
          role_id: showEditModal.id,
          module: perm.module,
          action: perm.action,
          resource_path: null,
        }));

        await supabase.from("tbl_permissions").insert(permissionsToInsert);
      }

      setSuccess("Rôle modifié avec succès");
      setShowEditModal(null);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification du rôle");
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleCloneRole = async () => {
    if (!showCloneModal || !formData.name.trim()) {
      setError("Le nom du nouveau rôle est requis");
      return;
    }

    setLoading("clone");
    setError(null);

    try {
      const supabase = createClientSupabase();

      // Créer le nouveau rôle
      const { data: newRole, error: roleError } = await supabase
        .from("roles")
        .insert({
          name: formData.name,
          description: formData.description || null,
          modules_autorises: formData.modules_autorises.length > 0 
            ? formData.modules_autorises 
            : null,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Cloner les permissions
      if (selectedPermissions.length > 0 && newRole) {
        const permissionsToInsert = selectedPermissions.map((perm) => ({
          role_id: newRole.id,
          module: perm.module,
          action: perm.action,
          resource_path: null,
        }));

        await supabase.from("tbl_permissions").insert(permissionsToInsert);
      }

      setSuccess("Rôle cloné avec succès");
      setShowCloneModal(null);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du clonage du rôle");
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${roleName}" ?`)) {
      return;
    }

    setLoading(roleId);
    setError(null);

    try {
      const supabase = createClientSupabase();

      // Vérifier si le rôle est utilisé
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role_id", roleId)
        .limit(1);

      if (userRoles && userRoles.length > 0) {
        throw new Error("Ce rôle est attribué à des utilisateurs. Supprimez d'abord les attributions.");
      }

      // Supprimer les permissions associées (cascade)
      await supabase.from("tbl_permissions").delete().eq("role_id", roleId);

      // Supprimer le rôle
      await supabase.from("roles").delete().eq("id", roleId);

      setSuccess("Rôle supprimé avec succès");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression du rôle");
    } finally {
      setLoading(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      modules_autorises: [],
    });
    setSelectedPermissions([]);
  };

  const openEditModal = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description || "",
      modules_autorises: role.modules_autorises || [],
    });

    // Charger les permissions existantes
    const rolePermissions = permissions
      .filter((p) => {
        const roleName = Array.isArray(p.roles) ? p.roles[0]?.name : p.roles?.name;
        return roleName === role.name;
      })
      .map((p) => ({
        module: p.module,
        action: p.action,
      }));

    setSelectedPermissions(rolePermissions);
    setShowEditModal(role);
  };

  const openCloneModal = (role: Role) => {
    setFormData({
      name: `${role.name} (copie)`,
      description: role.description || "",
      modules_autorises: role.modules_autorises || [],
    });

    // Charger les permissions du rôle à cloner
    const rolePermissions = permissions
      .filter((p) => {
        const roleName = Array.isArray(p.roles) ? p.roles[0]?.name : p.roles?.name;
        return roleName === role.name;
      })
      .map((p) => ({
        module: p.module,
        action: p.action,
      }));

    setSelectedPermissions(rolePermissions);
    setShowCloneModal(role);
  };

  const togglePermission = (module: string, action: string) => {
    setSelectedPermissions((prev) => {
      const exists = prev.some((p) => p.module === module && p.action === action);
      if (exists) {
        return prev.filter((p) => !(p.module === module && p.action === action));
      } else {
        return [...prev, { module, action }];
      }
    });
  };

  const toggleModule = (moduleId: string) => {
    setFormData((prev) => {
      if (prev.modules_autorises.includes(moduleId)) {
        return {
          ...prev,
          modules_autorises: prev.modules_autorises.filter((m) => m !== moduleId),
        };
      } else {
        return {
          ...prev,
          modules_autorises: [...prev.modules_autorises, moduleId],
        };
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Gestion des rôles
            </h1>
            <p className="text-lg text-secondary">
              Créez, modifiez et gérez les rôles applicatifs et leurs permissions
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn-primary"
          >
            + Créer un rôle
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Liste des rôles */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary mb-4">
            Liste des rôles ({roles.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Modules autorisés
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => {

                  return (
                    <tr key={role.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{role.description || "—"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {role.modules_autorises && role.modules_autorises.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {role.modules_autorises.map((module) => (
                                <span
                                  key={module}
                                  className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                >
                                  {module === "all" ? "Tous" : module}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(role)}
                            className="text-primary hover:text-primary-dark"
                            disabled={loading === role.id}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => openCloneModal(role)}
                            className="text-accent hover:text-accent-dark"
                            disabled={loading === role.id}
                          >
                            📋 Cloner
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="text-red-600 hover:text-red-900"
                            disabled={loading === role.id || role.name === "Administrateur"}
                            title={
                              role.name === "Administrateur"
                                ? "Le rôle Administrateur ne peut pas être supprimé"
                                : "Supprimer le rôle"
                            }
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal création/édition/clonage */}
        {(showCreateModal || showEditModal || showCloneModal) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border border-gray-200 w-full max-w-2xl shadow-xl rounded-lg bg-white max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-secondary mb-4">
                {showCreateModal && "Créer un nouveau rôle"}
                {showEditModal && `Modifier le rôle : ${showEditModal.name}`}
                {showCloneModal && `Cloner le rôle : ${showCloneModal.name}`}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Nom du rôle *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
                    placeholder="Ex: Chef de Projet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
                    rows={3}
                    placeholder="Description du rôle..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Modules autorisés
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map((module) => (
                      <label
                        key={module.id}
                        className="flex items-center cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.modules_autorises.includes(module.id)}
                          onChange={() => toggleModule(module.id)}
                          className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{module.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Permissions détaillées
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 text-gray-600">Module</th>
                          {ACTIONS.map((action) => (
                            <th key={action.id} className="text-center py-2 px-2 text-gray-600">
                              {action.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.filter((m) => m.id !== "all").map((module) => (
                          <tr key={module.id} className="border-b">
                            <td className="py-2 px-2 font-medium text-gray-900">
                              {module.name}
                            </td>
                            {ACTIONS.map((action) => {
                              const isSelected = selectedPermissions.some(
                                (p) => p.module === module.id && p.action === action.id
                              );
                              return (
                                <td key={action.id} className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => togglePermission(module.id, action.id)}
                                    className={`w-8 h-8 rounded ${
                                      isSelected
                                        ? "bg-primary text-white"
                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                    } transition-colors`}
                                  >
                                    {isSelected ? "✓" : "○"}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => {
                      if (showCreateModal) handleCreateRole();
                      if (showEditModal) handleEditRole();
                      if (showCloneModal) handleCloneRole();
                    }}
                    disabled={!formData.name.trim() || loading !== null}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading && "En cours..."}
                    {!loading && showCreateModal && "Créer"}
                    {!loading && showEditModal && "Modifier"}
                    {!loading && showCloneModal && "Cloner"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(null);
                      setShowCloneModal(null);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

